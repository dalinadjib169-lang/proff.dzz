import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone, Share, PlusSquare } from 'lucide-react';

export default function InstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');

  useEffect(() => {
    const showImmediately = localStorage.getItem('pwa_show_immediately') === 'true';
    if (showImmediately) {
      localStorage.removeItem('pwa_show_immediately');
      localStorage.removeItem('pwa_prompt_dismissed');
      setIsVisible(true);
    }

    // Check if dismissed before
    const isDismissed = localStorage.getItem('pwa_prompt_dismissed');
    if (isDismissed && !showImmediately) return;

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

    // Check if prompt is already captured globally
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
      setIsVisible(true);
    }

    // Handle the browser's install prompt event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Automatically show if we have the official prompt
      setIsVisible(true);
    };

    const handlePwaAvailable = () => {
      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-available', handlePwaAvailable);

    // Show fallback instructions after 8 seconds (or instantly if showImmediately) if mobile and not dismissed
    const timer = setTimeout(() => {
      if (!deferredPrompt && !((window as any).deferredPrompt) && /iphone|ipad|ipod|android/.test(userAgent)) {
        setIsVisible(true);
      }
    }, showImmediately ? 0 : 8000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-available', handlePwaAvailable);
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
              <div className="w-12 h-12 rounded-xl overflow-hidden ring-2 ring-primary/20 bg-slate-950 flex items-center justify-center">
                <img 
                  src="https://res.cloudinary.com/doaxziqm7/image/upload/v1714243644/logo_teach_dz.png" 
                  alt="TeachDZ Mascot" 
                  className="w-10 h-10 object-contain"
                  referrerPolicy="no-referrer"
                />
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
