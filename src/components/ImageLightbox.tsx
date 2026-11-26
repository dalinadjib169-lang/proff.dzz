import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ImageLightboxProps {
  src: string;
  isOpen: boolean;
  onClose: () => void;
}

function isAndroidWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /;\s*wv\b|\bwv\b|AppCreator|Android.*Version\/\d+/i.test(ua);
}

function toCloudinaryAttachmentUrl(imageUrl: string): string | null {
  try {
    const parsed = new URL(imageUrl);
    if (parsed.hostname.toLowerCase() === 'res.cloudinary.com' && parsed.pathname.includes('/upload/')) {
      if (!parsed.pathname.includes('/fl_attachment')) {
        parsed.pathname = parsed.pathname.replace('/upload/', '/upload/fl_attachment/');
      }
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function toFirebaseAttachmentUrl(imageUrl: string): string | null {
  try {
    const parsed = new URL(imageUrl);
    if (parsed.hostname.toLowerCase() === 'firebasestorage.googleapis.com') {
      parsed.searchParams.set(
        'response-content-disposition',
        `attachment; filename="teachdz-image-${Date.now()}.jpg"`
      );
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

function triggerDirectHttpsLink(httpsUrl: string, filename: string) {
  const link = document.createElement('a');
  link.href = httpsUrl;
  link.setAttribute('download', filename);
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function ImageLightbox({ src, isOpen, onClose }: ImageLightboxProps) {
  const [zoom, setZoom] = React.useState(1);
  const [downloading, setDownloading] = React.useState(false);

  const handleDownload = async () => {
    if (!src || downloading) return;
    const filename = `teachdz-image-${Date.now()}.jpg`;
    setDownloading(true);

    try {
      // 1. Cloudinary supports native HTTPS Content-Disposition: attachment via fl_attachment.
      // This avoids blob: URIs which crash Android WebView DownloadManager (AppCreator24).
      const cloudinaryUrl = toCloudinaryAttachmentUrl(src);
      if (cloudinaryUrl) {
        triggerDirectHttpsLink(cloudinaryUrl, filename);
        toast.success('جاري تنزيل الصورة...');
        return;
      }

      // 2. Inside Android WebView (e.g., AppCreator24), NEVER pass blob: or data: URIs to <a download>.
      if (isAndroidWebView()) {
        const firebaseUrl = toFirebaseAttachmentUrl(src);
        if (firebaseUrl) {
          triggerDirectHttpsLink(firebaseUrl, filename);
          toast.success('جاري تنزيل الصورة...');
          return;
        }

        if (src.startsWith('https://') || src.startsWith('http://')) {
          try {
            const probeRes = await fetch(`/api/download-image?probe=1&url=${encodeURIComponent(src)}`);
            const ct = probeRes.headers.get('content-type') || '';
            if (probeRes.ok && ct.includes('application/json')) {
              triggerDirectHttpsLink(`/api/download-image?url=${encodeURIComponent(src)}`, filename);
              toast.success('جاري تنزيل الصورة...');
              return;
            }
          } catch {
            // Static host without Express backend; fall back to direct HTTPS URL
          }

          triggerDirectHttpsLink(src, filename);
          toast.success('جاري تنزيل الصورة...');
          return;
        }

        if (navigator.share) {
          const response = await fetch(src);
          const blob = await response.blob();
          const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
          await navigator.share({ files: [file], title: 'TeachDZ' });
          return;
        }

        toast.error('تعذر تنزيل هذه الصورة مباشرة داخل تطبيق الويب');
        return;
      }

      // 3. Standard desktop/mobile browser: fetch blob cleanly without window.open
      const response = await fetch(src);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
      toast.success('تم حفظ الصورة');
    } catch (error) {
      if (src.startsWith('https://') || src.startsWith('http://')) {
        triggerDirectHttpsLink(src, filename);
      } else {
        toast.error('تعذر تحميل الصورة');
      }
    } finally {
      setDownloading(false);
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
                  disabled={downloading}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all disabled:opacity-50"
                  title="حفظ الصورة"
                >
                  {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                </button>
              </div>

              <button
                onClick={onClose}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all"
                title="إغلاق"
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
              TeachDZ Image Viewer • {zoom > 1 ? `Zoom x${zoom}` : 'Original Size'}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
