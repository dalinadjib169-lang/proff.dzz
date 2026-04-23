import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import imageCompression from 'browser-image-compression';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, Upload, Trash2, CheckCircle2, Loader2, Zap, ExternalLink, Plus } from 'lucide-react';

const CLOUDINARY_CLOUD_NAME = 'doaxziqm7';
const CLOUDINARY_UPLOAD_PRESET = 'nadjib dali';

export default function CloudinaryUploader() {
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // تحميل الصور المحفوظة من الذاكرة المحلية عند بدء التشغيل
  useEffect(() => {
    const savedImages = localStorage.getItem('my_cloudinary_images');
    if (savedImages) {
      setImages(JSON.parse(savedImages));
    }
  }, []);

  // حفظ الصور في الذاكرة المحلية عند كل تغيير
  useEffect(() => {
    localStorage.setItem('my_cloudinary_images', JSON.stringify(images));
  }, [images]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setIsOptimizing(false);

    try {
      let fileToUpload = file;

      // ضغط الصورة إذا كانت كبيرة (> 500KB)
      if (file.size > 500 * 1024) {
        setIsOptimizing(true);
        const options = {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          initialQuality: 0.8
        };
        fileToUpload = await imageCompression(file, options);
        setIsOptimizing(false);
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
            setUploadProgress(progress);
          }
        }
      );

      if (response.data?.secure_url) {
        const newUrl = response.data.secure_url;
        setImages(prev => [newUrl, ...prev]);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("عذراً، حدث خطأ أثناء الرفع. تأكد من إعدادات Cloudinary");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteImage = (url: string) => {
    if (window.confirm("هل تريد حذف هذه الصورة من القائمة؟")) {
      setImages(prev => prev.filter(img => img !== url));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 pb-24">
      {/* Header */}
      <header className="max-w-xl mx-auto mb-10 text-center">
        <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
          <ImageIcon className="w-8 h-8 text-purple-400" />
        </div>
        <h1 className="text-2xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-purple-400">
          رافع الصور السريع
        </h1>
        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Cloudinary Direct Upload</p>
      </header>

      {/* Main Action Area */}
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className={`w-full group relative overflow-hidden h-48 rounded-[2.5rem] border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center gap-4 ${
            isUploading 
              ? 'border-purple-500/50 bg-purple-500/5' 
              : 'border-slate-800 hover:border-purple-500/50 bg-slate-900/50 hover:bg-purple-500/5'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                {isOptimizing && (
                  <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-amber-400 animate-pulse" />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-black text-white mb-1">
                  {isOptimizing ? 'جاري معالجة الصورة...' : 'جاري الرفع الآن...'}
                </p>
                <p className="text-xs font-bold text-purple-400">{uploadProgress}%</p>
              </div>
              <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                <Upload className="w-8 h-8 text-slate-400 group-hover:text-purple-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-slate-300 group-hover:text-white transition-colors">إضغط لرفع صورة</p>
                <p className="text-xs font-bold text-slate-500 tracking-wider">سيتم الرفع تلقائياً إلى Cloudinary</p>
              </div>
            </>
          )}
        </button>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileSelect}
        />

        {/* List of Uploaded Images */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              صورك المرفوعة ({images.length})
            </h2>
            {images.length > 0 && (
              <button 
                onClick={() => {
                  if (window.confirm("هل تريد مسح القائمة بالكامل؟")) setImages([]);
                }}
                className="text-[10px] font-black text-red-500 hover:text-red-400 uppercase tracking-wider"
              >
                مسح الكل
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6">
            <AnimatePresence initial={false}>
              {images.map((url, index) => (
                <motion.div
                  key={url}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group relative bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden p-4 flex gap-4 items-center shadow-xl shadow-purple-500/5 hover:border-purple-500/30 transition-all"
                >
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-slate-800 shrink-0">
                    <img 
                      src={url} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      alt="Uploaded content" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-purple-400 mb-1 uppercase tracking-widest">Image #{images.length - index}</p>
                    <p className="text-xs text-slate-400 truncate mb-3 font-mono leading-relaxed bg-slate-950 p-2 rounded-xl border border-slate-800/50">
                      {url}
                    </p>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => window.open(url, '_blank')}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-300 flex items-center justify-center gap-2 transition-all"
                      >
                        <ExternalLink className="w-3 h-3" />
                        فتح الرابط
                      </button>
                      <button 
                        onClick={() => deleteImage(url)}
                        className="w-10 h-10 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl flex items-center justify-center transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {images.length === 0 && (
              <div className="text-center py-12 bg-slate-900/30 rounded-[2.5rem] border border-slate-800/50">
                <p className="text-slate-600 font-bold text-sm">لا توجد صور مرفوعة بعد.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
