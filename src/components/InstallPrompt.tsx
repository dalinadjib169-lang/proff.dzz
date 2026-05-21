import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone, Share, PlusSquare, Sparkles, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function InstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop' | 'inapp'>('desktop');

  useEffect(() => {
    // 1. Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://')
      || window.location.search.includes('utm_source=pwa')
      || window.location.search.includes('pwa=true');

    if (isStandalone) {
      localStorage.setItem('pwa_teachdz_ver_v16_shown', 'true');
      localStorage.removeItem('pwa_show_immediately');
      return;
    }

    // 2. Check if the user has already dismissed or processed this tutorial/prompt
    const isTutorialShown = localStorage.getItem('pwa_teachdz_ver_v16_shown') === 'true';
    if (isTutorialShown) {
      localStorage.removeItem('pwa_show_immediately');
      return;
    }

    const showImmediately = localStorage.getItem('pwa_show_immediately') === 'true';

    // 3. Detect device type & In-App Browser
    const isIframe = window.self !== window.top;
    const isFB = /fban|fbav/i.test(navigator.userAgent);
    const isWhatsApp = /whatsapp/i.test(navigator.userAgent);
    const isMessenger = /messenger/i.test(navigator.userAgent);
    const isInstagram = /instagram/i.test(navigator.userAgent);
    const isInAppBrowser = isFB || isWhatsApp || isMessenger || isInstagram || isIframe;

    const userAgent = window.navigator.userAgent.toLowerCase();
    let currentDevice: 'ios' | 'android' | 'desktop' | 'inapp' = 'desktop';
    if (isInAppBrowser) {
      currentDevice = 'inapp';
      setDeviceType('inapp');
    } else if (/iphone|ipad|ipod/.test(userAgent)) {
      currentDevice = 'ios';
      setDeviceType('ios');
    } else if (/android/.test(userAgent)) {
      currentDevice = 'android';
      setDeviceType('android');
    } else {
      currentDevice = 'desktop';
      setDeviceType('desktop');
    }

    // Extra check: Check if PWA is already installed on the device via experimental but widely supported API
    if ((navigator as any).getInstalledRelatedApps) {
      (navigator as any).getInstalledRelatedApps().then((relatedApps: any[]) => {
        if (relatedApps && relatedApps.length > 0) {
          console.log("PWA already installed check passed: hiding prompt");
          localStorage.setItem('pwa_teachdz_ver_v16_shown', 'true');
          localStorage.removeItem('pwa_show_immediately');
          setIsVisible(false);
          return;
        }
      }).catch((err: any) => console.log('getInstalledRelatedApps failed', err));
    }

    // 4. Check if prompt is already captured globally
    const initialPrompt = (window as any).deferredPrompt;
    if (initialPrompt) {
      setDeferredPrompt(initialPrompt);
    }

    // 5. Register listeners for official PWA installer prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
      
      // If Android/Desktop, show the prompt as soon as it's ready and installable!
      if (currentDevice === 'android' || currentDevice === 'desktop') {
        setIsVisible(true);
      }
    };

    const handlePwaAvailable = () => {
      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
        if (currentDevice === 'android' || currentDevice === 'desktop') {
          setIsVisible(true);
        }
      }
    };

    const handleAppInstalled = () => {
      console.log('App was installed successfully');
      localStorage.setItem('pwa_teachdz_ver_v16_shown', 'true');
      localStorage.removeItem('pwa_show_immediately');
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
      setIsVisible(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-available', handlePwaAvailable);
    window.addEventListener('appinstalled', handleAppInstalled);

    // If iOS or In-App browser (which don't have beforeinstallprompt), we can show guidance after a delay:
    if (currentDevice === 'ios' || currentDevice === 'inapp') {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, showImmediately ? 200 : 1500);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('pwa-prompt-available', handlePwaAvailable);
        window.removeEventListener('appinstalled', handleAppInstalled);
        clearTimeout(timer);
      };
    } else {
      // For Android/Desktop: If we ALREADY have the deferredPrompt loaded on mount, we can show it!
      if (initialPrompt) {
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, showImmediately ? 200 : 1000);
        return () => {
          window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
          window.removeEventListener('pwa-prompt-available', handlePwaAvailable);
          window.removeEventListener('appinstalled', handleAppInstalled);
          clearTimeout(timer);
        };
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-available', handlePwaAvailable);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('pwa_teachdz_ver_v16_shown', 'true');
    setIsVisible(false);
  };

  const handleInstallClick = async () => {
    const promptToUse = deferredPrompt || (window as any).deferredPrompt;
    if (!promptToUse) {
      // Prompt is null (common on iOS or before Chrome registers SW or during initial load)
      if (deviceType === 'ios') {
        toast.success("يرجى الضغط على زر المشاركة أسفل الشاشة ثم اختيار 'إضافة للشاشة الرئيسية'");
      } else {
        toast.success("اضغط على زر الخيارات (┋) أعلى المتصفح ثم اختر 'تثبيت التطبيق'");
      }
      return;
    }
    
    try {
      promptToUse.prompt();
      const { outcome } = await promptToUse.userChoice;
      
      if (outcome === 'accepted') {
        localStorage.setItem('pwa_teachdz_ver_v16_shown', 'true');
        (window as any).deferredPrompt = null;
        setDeferredPrompt(null);
        setIsVisible(false);
      }
    } catch (err) {
      console.error("Installation prompt error:", err);
      // Fallback
      if (deviceType === 'ios') {
        toast.success("يرجى الضغط على زر المشاركة أسفل الشاشة ثم اختيار 'إضافة للشاشة الرئيسية'");
      } else {
        toast.success("اضغط على زر الخيارات (┋) أعلى المتصفح ثم اختر 'تثبيت التطبيق'");
      }
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[1000] flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 30 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="bg-slate-905 border border-slate-800 rounded-[2.5rem] w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-6 md:p-8 shadow-[0_0_50px_rgba(139,92,246,0.15)] relative overflow-hidden text-right leading-relaxed"
          dir="rtl"
        >
          {/* Decorative glowing background elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button 
            onClick={handleDismiss}
            className="absolute top-4 left-4 p-2 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white rounded-2xl transition-all"
            title="إغلاق ومتابعة"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Top Header Logo */}
          <div className="flex flex-col items-center text-center mt-4 mb-6">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-purple-500/20 rounded-[2rem] blur-xl animate-pulse"></div>
              <div className="w-20 h-20 rounded-[2rem] overflow-hidden ring-4 ring-purple-500/30 bg-slate-950 flex items-center justify-center relative z-10 p-0.5">
                <img 
                  src="/prof_dali_logo.png" 
                  alt="TeachDZ Logo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-purple-600 rounded-2xl border-4 border-slate-900 flex items-center justify-center text-white z-20 animate-bounce">
                <Sparkles className="w-3.5 h-3.5 fill-white" />
              </div>
            </div>

            <h2 className="text-xl md:text-2xl font-black text-white px-2 tracking-tight">
              ثبّت تطبيق المعلم TeachDZ على هاتفك
            </h2>
            <p className="text-xs text-slate-300 mt-2 max-w-sm px-4">
              احصل على أيقونة البروفيسور المميزة على شاشتك الرئيسية، وتصفح منصتك فوراً بنقرة واحدة فائقة السرعة!
            </p>
          </div>

          {/* Core Visual Presentation (Simplified without step-by-step text) */}
          <div className="space-y-4 mb-6 text-center">
            <div className="bg-slate-950/40 rounded-3xl p-5 border border-slate-800/60 shadow-inner">
              {deviceType === 'inapp' ? (
                <div className="space-y-3">
                  <p className="text-amber-400 font-bold text-sm">⚠️ تنبيه: متصفح التواصل يمنع التثبيت المباشر</p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    أنت تتصفح حالياً من داخل تطبيق تواصل (مثل ماسنجر أو فيسبوك) المانع للتثبيت. يرجى فتح الرابط في متصفح النظام (أو نسخ الرابط وفتحه في كروم) لإنشاء الاختصار فوراً!
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("https://proff-dzz.vercel.app/");
                      toast.success("تم نسخ رابط المنصة! افتحه في كروم الآن.");
                    }}
                    className="w-full py-2 bg-slate-800/80 hover:bg-slate-750 text-white font-bold rounded-xl transition-all mt-1 flex items-center justify-center gap-1.5 text-xs border border-slate-700/50"
                  >
                    نسخ رابط المنصة لتفتحه في متصفح كروم 🔗
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-300 leading-relaxed py-1">
                  منصتك التعليمية المتكاملة جاهزة الآن لتكون على هاتفكم بلمسة واحدة. اضغط على الزر أدناه لتثبيت التطبيق مباشرة والاستمتاع بالأيقونة الرسمية المميزة للبروفيسور وسرعة التصفح الفائقة!
                </p>
              )}
            </div>
            
            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-bold px-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>ستظهر هذه النافذة لمرة واحدة فقط لتسهيل وصولك واختصار خطواتك.</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            {/* Always visible installer button so the user can interact on first-time load immediately! */}
            <button 
              onClick={handleInstallClick}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-505 text-white py-3.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-xl shadow-purple-600/35 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              تثبيت التطبيق الآن على الهاتف
            </button>

            <button 
              onClick={handleDismiss}
              className="w-full bg-slate-800/80 hover:bg-slate-800 text-slate-200 py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-1 transition-all"
            >
              فهمت الطريقة، متابعة للمنصة
              <ChevronRight className="w-3.5 h-3.5 opacity-55" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
