import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Smartphone, Share, PlusSquare, Sparkles, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';

export default function InstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    // 1. Check if the user has already dismissed this tutorial
    const isTutorialShown = localStorage.getItem('pwa_tutorial_shown') === 'true';
    const showImmediately = localStorage.getItem('pwa_show_immediately') === 'true';

    // If already shown and we don't need to force show it, then exit
    if (isTutorialShown && !showImmediately) {
      return;
    }

    // 2. Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');

    if (isStandalone) {
      return;
    }

    // 3. Detect device type
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDeviceType('ios');
    } else if (/android/.test(userAgent)) {
      setDeviceType('android');
    } else {
      setDeviceType('desktop');
    }

    // 4. Check if prompt is already captured globally
    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
    }

    // 5. Register listeners for official PWA installer prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
      // If we got the prompt and we are showing immediately, make sure we show the modal automatically
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

    // If showImmediately (right after login/registration), show it instantly!
    if (showImmediately) {
      setIsVisible(true);
      localStorage.removeItem('pwa_show_immediately');
    } else {
      // Show this helpful guidance after 4 seconds to let the entry page load first
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 4000);
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('pwa-prompt-available', handlePwaAvailable);
        clearTimeout(timer);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-available', handlePwaAvailable);
    };
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('pwa_tutorial_shown', 'true');
    setIsVisible(false);
  };

  const handleInstallClick = async () => {
    const promptToUse = deferredPrompt || (window as any).deferredPrompt;
    if (!promptToUse) {
      handleDismiss();
      return;
    }
    
    promptToUse.prompt();
    const { outcome } = await promptToUse.userChoice;
    
    if (outcome === 'accepted') {
      localStorage.setItem('pwa_tutorial_shown', 'true');
      (window as any).deferredPrompt = null;
      setDeferredPrompt(null);
    }
    setIsVisible(false);
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
              <div className="w-20 h-20 rounded-[2rem] overflow-hidden ring-4 ring-purple-500/30 bg-slate-950 flex items-center justify-center relative z-10 p-2">
                <img 
                  src="https://res.cloudinary.com/doaxziqm7/image/upload/v1714243644/logo_teach_dz.png" 
                  alt="TeachDZ Logo" 
                  className="w-16 h-16 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-purple-600 rounded-2xl border-4 border-slate-900 flex items-center justify-center text-white z-20">
                <Sparkles className="w-3.5 h-3.5 fill-white" />
              </div>
            </div>

            <h2 className="text-xl md:text-2xl font-black text-white px-2 tracking-tight">
              أضف اختصار تطبيق TeachDZ على هاتفك
            </h2>
            <p className="text-xs text-slate-400 mt-2 max-w-sm px-4">
              تصفح منصة التعليم والتشغيل بشكل أسرع وأسهل بنقرة واحدة مباشرة من شاشتك الرئيسية! دون الحاجة للمتصفح أو كتابة الرابط مجدداً.
            </p>
          </div>

          {/* Core Walkthrough */}
          <div className="space-y-4 mb-6">
            <div className="bg-slate-950/60 rounded-3xl p-5 border border-slate-800/80 space-y-4">
              <h4 className="font-bold text-sm text-purple-400 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                خطوات التثبيت السهلة:
              </h4>

              {deferredPrompt ? (
                // Official installer path is active
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center shrink-0 font-mono text-xs font-black">١</div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-100 font-bold">تثبيت فوري ومباشر</p>
                    <p className="text-[11px] text-slate-400">متصفحك يدعم التثبيت المباشر كـ تطبيق كامل. اضغط على الزر البنفسجي أدناه لإنشاء الاختصار فوراً!</p>
                  </div>
                </div>
              ) : deviceType === 'ios' ? (
                // iOS Safary instructions
                <div className="space-y-3 font-medium">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center shrink-0 font-mono text-xs font-black">١</div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-slate-200">اضغط على زر المشاركة <strong className="text-white">"Partager"</strong> أو أيقونة <Share className="w-4 h-4 inline mx-1 text-blue-400" /> في متصفح Safari أسفل شاشة الهاتف.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center shrink-0 font-mono text-xs font-black">٢</div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-slate-200">قم بالتمرير لأسفل القائمة قليلاً ثم اختر <strong className="text-white">"Sur l'écran d'accueil"</strong> أو <strong className="text-white">"إضافة إلى الشاشة الرئيسية"</strong> <PlusSquare className="w-4 h-4 inline mx-1 text-emerald-500" />.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center shrink-0 font-mono text-xs font-black">٣</div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-slate-200">اضغط على <strong className="text-white">"إضافة/Ajouter"</strong> في الأعلى لتجد الاختصار بأيقونة المنصة على شاشتك الرئيسية.</p>
                    </div>
                  </div>
                </div>
              ) : (
                // Android Chrome / Others instructions
                <div className="space-y-3 font-medium">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center shrink-0 font-mono text-xs font-black">١</div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-slate-200">اضغط على زر النقاط الثلاث <strong className="text-white">┋</strong> في أعلى يسار أو يمين المتصفح (Chrome).</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center shrink-0 font-mono text-xs font-black">٢</div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-slate-200">بحث عن خيار <strong className="text-white">"تثبيت التطبيق" (Installer l'application)</strong> أو <strong className="text-white">"إضافة إلى الشاشة الرئيسية"</strong>.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 bg-purple-500/10 text-purple-400 rounded-xl flex items-center justify-center shrink-0 font-mono text-xs font-black">٣</div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-slate-200">اضغط تأكيد وسيتم تثبيت التطبيق وتظهر أيقونة المنصة فوراً على شاشتك للوصول السريع!</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold px-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>ستظهر هذه الرسالة التوضيحية لمرة واحدة فقط لتسهيل دخولك لاحقاً.</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            {deferredPrompt && (
              <button 
                onClick={handleInstallClick}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-505 text-white py-3.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-xl shadow-purple-600/35 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                تثبيت التطبيق الآن على الهاتف
              </button>
            )}

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
