import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';
import imageCompression from 'browser-image-compression';
import { storage, db } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { collection, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, getDoc } from 'firebase/firestore';
import { playSound } from '../lib/sounds';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, CheckCircle2, AlertCircle, Zap } from 'lucide-react';

const CLOUDINARY_CLOUD_NAME = 'doaxziqm7';
const CLOUDINARY_UPLOAD_PRESET = 'nadjib dali';

interface UploadTask {
  id: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  type: 'post' | 'product' | 'profile' | 'message' | 'comment';
  data?: any;
}

interface UploadContextType {
  activeUploads: UploadTask[];
  startUpload: (file: File, type: 'post' | 'product' | 'profile' | 'message' | 'comment', data: any) => Promise<string | undefined>;
  removeUpload: (id: string) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [activeUploads, setActiveUploads] = useState<UploadTask[]>([]);

  const removeUpload = useCallback((id: string) => {
    setActiveUploads(prev => prev.filter(u => u.id !== id));
  }, []);

  const startUpload = useCallback(async (file: File, type: 'post' | 'product' | 'profile' | 'message' | 'comment', data: any): Promise<string | undefined> => {
    const id = Math.random().toString(36).substring(7);
    const fileName = file.name;

    setActiveUploads(prev => [...prev, { id, fileName, progress: 0, status: 'uploading', type, data }]);

    // Use Cloudinary for images as requested
    const isImage = file.type.startsWith('image/');
    
    if (!isImage) {
      try {
        const storagePath = type === 'message' ? `chats/${id}_${fileName}` : 
                           type === 'post' ? `posts/${id}_${fileName}` :
                           type === 'profile' ? `profiles/${data.uid}_${id}` :
                           `products/${data.productId}/${id}_${fileName}`;
        
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setActiveUploads(prev => prev.map(u => u.id === id ? { ...u, progress } : u));
          }, 
          (error) => {
            console.error("Firebase Storage Error:", error);
            setActiveUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'error' } : u));
            setTimeout(() => removeUpload(id), 10000);
          }, 
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              let firestoreSuccess = false;

              if (type === 'message') {
                const { createdAt, seen, ...restData } = data;
                const fieldName = file.type.startsWith('audio/') ? 'audioUrl' : 'videoUrl';
                await addDoc(collection(db, 'messages'), {
                  ...restData,
                  [fieldName]: downloadURL,
                  createdAt: serverTimestamp(),
                  seen: false
                });
                firestoreSuccess = true;
              }

              if (firestoreSuccess) {
                setActiveUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'completed', progress: 100 } : u));
                setTimeout(() => removeUpload(id), 5000);
              }
            } catch (e) {
              setActiveUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'error' } : u));
            }
          }
        );
        return;
      } catch (err) {
        setActiveUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'error' } : u));
        return;
      }
    }

    // Image Upload via Cloudinary
    try {
      let fileToUpload = file;

      // COMPRESSION: Only for images, skipped for small files
      if (isImage && file.size > 1024 * 1024) { // Increased threshold to 1MB for speed
        setActiveUploads(prev => prev.map(u => u.id === id ? { ...u, progress: 1 } : u)); 
        try {
          const options = {
            maxSizeMB: 1.5, // Faster target
            maxWidthOrHeight: 1600, // Reasonable balance
            useWebWorker: true,
            initialQuality: 0.7,
            onProgress: (p: number) => {
              // Update progress during compression (0 to 5%)
              const compressionProgress = Math.min(5, Math.max(1, (p * 5) / 100));
              setActiveUploads(prev => prev.map(u => u.id === id ? { ...u, progress: compressionProgress } : u));
            }
          };
          fileToUpload = await imageCompression(file, options);
          console.log(`Image compressed from ${file.size / 1024 / 1024}MB to ${fileToUpload.size / 1024 / 1024}MB`);
        } catch (compressionError) {
          console.warn("Compression failed, uploading original:", compressionError);
        }
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, 
        formData, 
        {
          onUploadProgress: (progressEvent) => {
            // Cap visual progress at 95% until we get the server response
            const uploadPercentage = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
            const progress = 5 + Math.round((uploadPercentage * 90) / 100); 
            setActiveUploads(prev => prev.map(u => u.id === id ? { ...u, progress } : u));
          }
        }
      );

      if (response.data?.secure_url) {
        const downloadURL = response.data.secure_url;
        let firestoreSuccess = false;

        if (data.skipFirestore) {
          setActiveUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'completed', progress: 100 } : u));
          setTimeout(() => removeUpload(id), 5000);
          return downloadURL;
        }

        if (type === 'message') {
          const { createdAt, seen, ...restData } = data;
          try {
            await addDoc(collection(db, 'messages'), {
              ...restData,
              imageUrl: downloadURL,
              createdAt: serverTimestamp(),
              seen: false
            });
            playSound('message');
            firestoreSuccess = true;
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'messages');
          }
        } else if (type === 'post') {
          try {
            await addDoc(collection(db, 'posts'), {
              ...data,
              imageUrl: downloadURL,
              videoUrl: '',
              createdAt: serverTimestamp(),
            });
            playSound('post');
            firestoreSuccess = true;
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'posts');
          }
        } else if (type === 'comment') {
          try {
            await addDoc(collection(db, 'comments'), {
              ...data,
              imageUrl: downloadURL,
              createdAt: serverTimestamp(),
            });
            
            // If it's a comment, we might also need to increment the post comment count if not already done
            // But here we rely on the component calling startUpload to handle the other side or provide necessary context
            // Actually, incrementing here is better
            if (data.postId) {
              const { increment } = await import('firebase/firestore');
              await updateDoc(doc(db, 'posts', data.postId), {
                commentCount: increment(1)
              });
            }

            playSound('comment');
            firestoreSuccess = true;
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'comments');
          }
        } else if (type === 'profile') {
          try {
            await updateDoc(doc(db, 'users', data.uid), { photoURL: downloadURL });
            firestoreSuccess = true;
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `users/${data.uid}`);
          }
        } else if (type === 'product') {
          try {
            await updateDoc(doc(db, 'products', data.productId), {
              images: arrayUnion(downloadURL)
            });
            firestoreSuccess = true;
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `products/${data.productId}`);
          }
        }

        if (firestoreSuccess) {
          setActiveUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'completed', progress: 100 } : u));
          setTimeout(() => removeUpload(id), 5000);
          return downloadURL;
        }
      }
    } catch (err: any) {
      console.error("Cloudinary Upload Error:", err);
      setActiveUploads(prev => prev.map(u => u.id === id ? { ...u, status: 'error' } : u));
      setTimeout(() => removeUpload(id), 10000);
    }
    return undefined;
  }, [removeUpload]);

  return (
    <UploadContext.Provider value={{ activeUploads, startUpload, removeUpload }}>
      {children}
      
      {/* Global Upload Progress UI */}
      <div className="fixed bottom-24 left-8 z-[200] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {activeUploads.map(upload => (
            <motion.div
              key={upload.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-4 rounded-2xl shadow-2xl w-64 pointer-events-auto"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {upload.status === 'uploading' && (
                    upload.progress < 10 && upload.fileName.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                      <Zap className="w-3 h-3 text-amber-400 animate-pulse" />
                    ) : (
                      <Loader2 className="w-3 h-3 text-purple-500 animate-spin" />
                    )
                  )}
                  {upload.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                  {upload.status === 'error' && <AlertCircle className="w-3 h-3 text-red-500" />}
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase truncate max-w-[120px]">{upload.fileName}</span>
                    {upload.status === 'uploading' && upload.progress < 10 && upload.fileName.match(/\.(jpg|jpeg|png|webp)$/i) && (
                      <span className="text-[8px] font-bold text-amber-400 uppercase">Optimizing...</span>
                    ) || (
                      <span className="text-[8px] font-bold text-slate-500 uppercase">{upload.type}</span>
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-black text-purple-400">{Math.round(upload.progress)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  className={`h-full ${upload.status === 'error' ? 'bg-red-500' : 'bg-purple-500'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${upload.progress}%` }}
                />
              </div>
              {upload.status === 'completed' && (
                <p className="text-[10px] font-bold text-green-500 mt-2">Upload complete! ✨</p>
              )}
              {upload.status === 'error' && (
                <p className="text-[10px] font-bold text-red-500 mt-2">Upload failed. Try again.</p>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}
