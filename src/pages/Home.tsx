import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, storage } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, Timestamp, serverTimestamp, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadString, uploadBytesResumable } from 'firebase/storage';
import { useAuth } from '../hooks/useAuth';
import { Post } from '../types';
import PostCard from '../components/PostCard';
import { Send, Smile, Paperclip, GraduationCap, PenTool, X, WifiOff, Loader2, Globe, Users, Lock, ChevronDown, Image as ImageIcon, Zap, ExternalLink, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { playSound } from '../lib/sounds';

import { useUpload } from '../hooks/useUpload';
import { PrayerWaterBar } from '../components/PrayerWaterBar';

export default function Home() {
  const { profile, user } = useAuth();
  const isAdmin = profile?.email === 'dalinadjib1990@gmail.com';
  const isPremium = isAdmin || (profile?.premiumUntil ? profile.premiumUntil.toDate() > new Date() : false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'friends' | 'private'>('public');
  const [selectedBg, setSelectedBg] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, 'posts'),
      where('privacy', '==', 'public'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const postsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt || Timestamp.now(),
          clientCreatedAt: data.clientCreatedAt || Date.now()
        };
      }) as any as Post[];
      
      // Filter out posts from blocked users
      const filteredPosts = postsData.filter(post => {
        const isBlockedByMe = profile?.blockedUsers?.includes(post.authorId);
        return !isBlockedByMe;
      });

      // Secondary sort to ensure local posts (with estimated timestamps) are at the top
      filteredPosts.sort((a, b) => {
        const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : a.createdAt;
        const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : b.createdAt;
        return timeB - timeA; // Descending order
      });
      
      setPosts(filteredPosts);
    }, (error: any) => {
      if (error.code === 'unavailable' || error.message?.includes('offline')) {
        console.warn("Firestore is offline, feed will update when connection is restored.");
      } else {
        handleFirestoreError(error, OperationType.LIST, 'posts');
      }
    });
    return unsubscribe;
  }, [profile]);

  const { startUpload } = useUpload();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreatePost = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() && !selectedImage) return;
    if (!profile) {
      alert("Please wait for your profile to load.");
      return;
    }

    if (!isOnline) {
      alert("You are currently offline. Please check your internet connection.");
      return;
    }

    setLoading(true);
    try {
      if (selectedImage) {
        // Use the startUpload hook but we need to wait for it or use a callback
        // The startUpload hook in useUpload.tsx handles the addDoc internally
        await startUpload(selectedImage, 'post', {
          authorId: profile.uid,
          authorName: profile.displayName || 'Teacher',
          authorPhoto: profile.photoURL || '',
          content: content.trim() || 'Shared an image ✨',
          privacy: privacy,
          likes: [],
          commentCount: 0,
        });
      } else {
        await addDoc(collection(db, 'posts'), {
          authorId: profile.uid,
          authorName: profile.displayName || 'Teacher',
          authorPhoto: profile.photoURL || '',
          content: content.trim(),
          privacy: privacy,
          background: content.length < 150 ? selectedBg : null,
          likes: [],
          commentCount: 0,
          imageUrl: '',
          videoUrl: '',
          createdAt: serverTimestamp(),
          clientCreatedAt: Date.now(),
        });
        playSound('post');
      }
      
      setSelectedBg(null);
      setSelectedImage(null);
      setImagePreview(null);
      setContent('');
    } catch (error: any) {
      console.error("Post Creation Error:", error);
      alert(error.message || "Failed to create post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to compress images using Canvas
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error("Canvas toBlob failed"));
            }
          }, 'image/jpeg', 0.7); // 0.7 quality is a good balance
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  return (
    <div className="space-y-8">
      {/* Prayer & Water Bar */}
      <PrayerWaterBar />

      {/* Offline Alert */}
      {!isOnline && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3"
        >
          <WifiOff className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-400 font-bold">You are currently offline. Some features may be unavailable.</p>
        </motion.div>
      )}

      {/* Quick Access Apps - Removed to enforce limits via AI Tools page */}

      {/* Premium Tool CTA for Mobile */}
      <div className="lg:hidden mb-6">
        <Link 
          to="/premium-tools"
          className="flex items-center justify-between p-5 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 rounded-3xl shadow-xl shadow-purple-500/20 group overflow-hidden relative active:scale-[0.98] transition-transform duration-200"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full translate-x-16 -translate-y-16 blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
              <Sparkles className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <p className="text-white font-black text-lg">أدوات الذكاء الاصطناعي</p>
              <p className="text-white/70 text-xs font-bold">مولد مذكرات، فروض، واختبارات</p>
            </div>
          </div>
          <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md relative z-10">
            <ChevronDown className="w-5 h-5 text-white -rotate-90" />
          </div>
        </Link>
      </div>

      {/* Create Post Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl border border-slate-800"
      >
        <form onSubmit={handleCreatePost}>
          <div className="flex gap-3 sm:gap-4 mb-4">
            <img
              src={profile?.photoURL}
              alt={profile?.displayName}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl object-cover ring-2 ring-purple-500/20"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 space-y-4">
              <div className={`relative rounded-xl sm:rounded-2xl transition-all duration-500 ${content.length < 150 && selectedBg ? selectedBg : 'bg-slate-950'}`}>
                <textarea
                  placeholder={`Share your experience, ${profile?.displayName?.split(' ')[0]}...`}
                  className={`w-full bg-transparent border-none p-4 sm:p-6 text-slate-100 placeholder:text-slate-500 focus:ring-0 outline-none resize-none transition-all font-black ${content.length < 150 && selectedBg ? 'text-center text-xl sm:text-3xl min-h-[150px] sm:min-h-[200px] flex items-center justify-center' : 'text-base sm:text-lg min-h-[100px] sm:min-h-[120px]'}`}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      handleCreatePost();
                    }
                  }}
                />
              </div>

              {imagePreview && (
                <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                  <img src={imagePreview} className="w-full max-h-[300px] object-cover" />
                  <button 
                    type="button" 
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {content.length < 150 && !selectedImage && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSelectedBg(null)}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-2 shrink-0 transition-all ${!selectedBg ? 'border-purple-500 bg-slate-800' : 'border-slate-800 bg-slate-950'}`}
                  >
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 mx-auto text-slate-500" />
                  </button>
                  {[
                    'bg-gradient-to-br from-purple-600 to-indigo-900',
                    'bg-gradient-to-br from-blue-600 to-cyan-600',
                    'bg-gradient-to-br from-rose-500 to-pink-600',
                    'bg-gradient-to-br from-orange-500 to-amber-500',
                    'bg-gradient-to-br from-emerald-500 to-teal-600',
                    'bg-gradient-to-br from-slate-800 to-slate-950',
                  ].map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setSelectedBg(bg)}
                      className={`w-8 h-8 rounded-lg shrink-0 transition-all border-2 ${selectedBg === bg ? 'border-white scale-110' : 'border-transparent'} ${bg}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="relative group/privacy">
                <select 
                  value={privacy}
                  onChange={(e) => setPrivacy(e.target.value as any)}
                  className="appearance-none bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] sm:text-xs font-bold pl-7 sm:pl-8 pr-7 sm:pr-8 py-1.5 sm:py-2 rounded-lg sm:rounded-xl outline-none transition-all cursor-pointer border border-slate-700 hover:border-purple-500/50"
                >
                  <option value="public">Public</option>
                  <option value="friends">Friends</option>
                  <option value="private">Private</option>
                </select>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  {privacy === 'public' && <Globe className="w-3 sm:w-3.5 h-3 sm:h-3.5" />}
                  {privacy === 'friends' && <Users className="w-3 sm:w-3.5 h-3 sm:h-3.5" />}
                  {privacy === 'private' && <Lock className="w-3 sm:w-3.5 h-3 sm:h-3.5" />}
                </div>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <ChevronDown className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                </div>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageSelect} 
                accept="image/*" 
                className="hidden" 
              />
              
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 hover:bg-slate-800 text-slate-400 rounded-lg sm:rounded-xl transition-all font-bold text-xs sm:text-sm group"
              >
                <ImageIcon className="w-4 sm:w-5 h-4 sm:h-5 group-hover:scale-110 transition-transform text-purple-400" />
                <span className="hidden xs:inline">الصورة</span>
              </button>
            </div>
            <button
              type="submit"
              disabled={loading || (!content.trim() && !selectedImage)}
              className="flex items-center gap-2 px-6 sm:px-8 py-2 sm:py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black text-sm sm:text-base rounded-xl sm:rounded-2xl shadow-lg shadow-purple-500/20 transition-all active:scale-95"
            >
              {loading ? (
                <div className="w-4 sm:w-5 h-4 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                  <span>Publish</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Feed */}
      <div className="space-y-6">
        <AnimatePresence initial={false}>
          {posts.map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              layout
            >
              <PostCard post={post} />
            </motion.div>
          ))}
        </AnimatePresence>
        
        {posts.length === 0 && (
          <div className="text-center py-20 bg-slate-900 rounded-3xl border border-dashed border-slate-800">
            <div className="bg-slate-950 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <PenTool className="w-10 h-10 text-slate-700" />
            </div>
            <h3 className="text-slate-100 font-black text-xl mb-2">No posts yet</h3>
            <p className="text-slate-500 font-medium">Be the first teacher to share something today!</p>
          </div>
        )}
      </div>
    </div>
  );
}
