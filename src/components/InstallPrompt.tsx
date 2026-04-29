import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone, Share, PlusSquare } from 'lucide-react';

export default function InstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    // Check if dismissed before
    const isDismissed = localStorage.getItem('pwa_prompt_dismissed');
    if (isDismissed) return;

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');

    if (isStandalone) return;

    // Detect platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/android/.test(userAgent)) {
      setPlatform('android');
    }

    // Handle the browser's install prompt event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Automatically show if we have the official prompt
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show fallback instructions after 8 seconds if mobile and not dismissed
    const timer = setTimeout(() => {
      if (!deferredPrompt && /iphone|ipad|ipod|android/.test(userAgent)) {
        setIsVisible(true);
      }
    }, 8000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, [deferredPrompt]);

  const dismissPrompt = () => {
    localStorage.setItem('pwa_prompt_dismissed', 'true');
    setIsVisible(false);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      dismissPrompt();
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      localStorage.setItem('pwa_prompt_dismissed', 'true');
    }
    
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 z-[100] md:max-w-sm md:left-auto md:right-8"
      >
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl shadow-primary/20">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">تثبيت تطبيق TeachDZ</h3>
                <p className="text-slate-400 text-xs">للحصول على تجربة أسرع ودخول آمن</p>
              </div>
            </div>
            <button 
              onClick={() => setIsVisible(false)}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-slate-950/50 rounded-xl p-3 mb-4 space-y-2">
            {deferredPrompt ? (
              <p className="text-xs text-slate-300 text-center">اضغط على الزر أدناه لتثبيت التطبيق فوراً على هاتفك</p>
            ) : platform === 'ios' ? (
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Share className="w-4 h-4 text-blue-400" />
                <span>اضغط على <span className="text-white font-bold">Partager</span> ثم <span className="text-white font-bold">"Sur l'écran d'accueil"</span></span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <PlusSquare className="w-4 h-4 text-primary" />
                <span>اضغط على النقاط الثلاث واختر <span className="text-white font-bold">"Ajouter à l'écran d'accueil"</span></span>
              </div>
            )}
          </div>

          <button 
            onClick={deferredPrompt ? handleInstallClick : dismissPrompt}
            className="w-full bg-primary hover:bg-primary-hover text-white py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary/30"
          >
            <Download className="w-4 h-4" />
            {deferredPrompt ? 'تثبيت التطبيق الآن' : 'فهمت، لا تظهر مجدداً'}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
