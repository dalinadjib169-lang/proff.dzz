import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface ImageLightboxProps {
  src: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageLightbox({ src, isOpen, onClose }: ImageLightboxProps) {
  const [zoom, setZoom] = React.useState(1);
  
  const handleDownload = async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `teac-dz-image-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      window.open(src, '_blank');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative max-w-full max-h-full flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Controls */}
            <div className="absolute -top-12 left-0 right-0 flex items-center justify-between px-2">
              <div className="flex gap-2">
                <button 
                  onClick={() => setZoom(prev => Math.min(prev + 0.5, 3))}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
                  title="تكبير"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setZoom(prev => Math.max(prev - 0.5, 1))}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
                  title="تصغير"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleDownload}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
                  title="حفظ الصورة"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
              
              <button 
                onClick={onClose}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <motion.div 
              className="overflow-hidden rounded-2xl shadow-2xl border border-white/10 bg-slate-900"
              style={{ scale: zoom }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <img 
                src={src} 
                alt="Full size" 
                className="max-w-[95vw] max-h-[80vh] object-contain cursor-zoom-in"
                referrerPolicy="no-referrer"
                onClick={() => setZoom(zoom === 1 ? 2 : 1)}
              />
            </motion.div>

            <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mt-4">
              Teac DZ Image Viewer • {zoom > 1 ? `Zoom x${zoom}` : 'Original Size'}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
