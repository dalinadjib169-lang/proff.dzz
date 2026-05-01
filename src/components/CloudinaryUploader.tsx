import React, { useState, useRef } from 'react';
import axios from 'axios';
import { Loader2, Zap } from 'lucide-react';

const CLOUDINARY_CLOUD_NAME = 'doaxziqm7';
const CLOUDINARY_UPLOAD_PRESET = 'nadjib dali';

interface CloudinaryUploaderProps {
  onUploadSuccess?: (url: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export default function CloudinaryUploader({ onUploadSuccess, className, children }: CloudinaryUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
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
        if (onUploadSuccess) onUploadSuccess(newUrl);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("عذراً، حدث خطأ أثناء الرفع.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <div 
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className="cursor-pointer h-full"
      >
        {isUploading ? (
          <div className="flex flex-col items-center justify-center gap-2 h-full">
            <div className="relative">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-[10px] font-black text-primary">{uploadProgress}%</p>
            </div>
          </div>
        ) : (
          children || (
            <div className="flex items-center gap-2 p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all">
              <Zap className="w-4 h-4" />
              <span className="text-[10px] font-bold">رفع صورة</span>
            </div>
          )
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileSelect}
      />
    </div>
  );
}
