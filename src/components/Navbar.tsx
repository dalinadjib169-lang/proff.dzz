import React, { memo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  GraduationCap, 
  Bell, 
  Search, 
  User as UserIcon, 
  MessageSquare, 
  Mail, 
  ArrowLeft, 
  ArrowRight,
  Download,
  Smartphone
} from 'lucide-react';
import { useUnreadMessages } from '../hooks/useUnreadMessages';
import { cn } from '../lib/utils';
import { memo as reactMemo } from 'react';
import { toast } from 'react-hot-toast';

function Navbar() {
  const { profile } = useAuth();
  const unreadMessagesCount = useUnreadMessages();

  // PWA & Installation states
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if running in standalone mode (installed app)
    const checkStandalone = () => {
      const standalone = window.matchMedia('(display-mode: standalone)').matches 
        || (window.navigator as any).standalone 
        || document.referrer.includes('android-app://');
      setIsStandalone(standalone);
    };

    checkStandalone();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    try {
      mediaQuery.addEventListener('change', checkStandalone);
    } catch (e) {
      console.warn(e);
    }

    // Periodically check and update deferred prompt from window object for immediate reactivity
    const checkPromptInterval = setInterval(() => {
      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
      }
    }, 500);

    // Capture prompt event
    const handlePrompt = () => {
      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
      }
    };

    window.addEventListener('pwa-prompt-available', handlePrompt);
    window.addEventListener('beforeinstallprompt', handlePrompt);

    return () => {
      clearInterval(checkPromptInterval);
      try {
        mediaQuery.removeEventListener('change', checkStandalone);
      } catch (e) {
        console.warn(e);
      }
      window.removeEventListener('pwa-prompt-available', handlePrompt);
      window.removeEventListener('beforeinstallprompt', handlePrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptToUse = deferredPrompt || (window as any).deferredPrompt;
    if (!promptToUse) {
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(userAgent)) {
        toast.success("للتثبيت السريع: اضغط على زر المشاركة أسفل الشاشة ثم اختر 'إضافة للشاشة الرئيسية'");
      } else {
        toast.success("متصفحك لا يدعم التثبيت التلقائي الفوري، يرجى الضغط على زر الخيارات (┋) أعلى المتصفح ثم اختر 'تثبيت التطبيق' (Installer).");
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
      }
    } catch (err) {
      console.error("Installation prompt error:", err);
      toast.error("حدث خطأ أثناء محاولة التثبيت الفوري.");
    }
  };

  const handleUninstallClick = () => {
    toast.success(
      "لإلغاء تثبيت التطبيق: اضغط على زر النقاط الثلاث (┋) بالأعلى في نافذة التطبيق ثم اختر 'إلغاء التثبيت' (Désinstaller)، أو اضغط مطولاً على أيقونة التطبيق على شاشة هاتفك واختر إلغاء التثبيت.",
      { duration: 8050 }
    );
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-slate-950/10 backdrop-blur-3xl border-b border-white/5 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4 sm:gap-6">
              <Link to="/" className="flex items-center gap-2 group shrink-0">
                <div className="bg-primary p-1.5 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-primary/20">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-black text-white tracking-tight hidden xs:inline">Teac DZ</span>
              </Link>

              {/* Dynamic Install / Uninstall Button next to logo */}
              <div className="flex items-center">
                {isStandalone ? (
                  <button
                    onClick={handleUninstallClick}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl border border-amber-500/20 active:scale-95 transition-all cursor-pointer shadow-lg shadow-amber-500/5 hover:-translate-y-0.5"
                    title="إلغاء تثبيت التطبيق"
                    id="pwa-uninstall-header-btn"
                  >
                    <Smartphone className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span>إلغاء التثبيت</span>
                  </button>
                ) : (
                  <button
                    onClick={handleInstallClick}
                    className="relative flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl active:scale-95 transition-all cursor-pointer shadow-xl shadow-purple-600/35 hover:-translate-y-0.5"
                    title="تثبيت التطبيق على الشاشة الرئيسية"
                    id="pwa-install-header-btn"
                  >
                    <span className="absolute -top-1 -left-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                    </span>
                    <Download className="w-4 h-4 animate-bounce shrink-0" />
                    <span>تثبيت</span>
                  </button>
                )}
              </div>

              <div className="hidden lg:flex items-center bg-slate-900 rounded-2xl px-4 py-2 w-64 group focus-within:ring-2 focus-within:ring-primary/50 transition-all border border-slate-800">
                <Search className="w-4 h-4 text-slate-500 mr-2" />
                <input
                  type="text"
                  placeholder="Search teachers, subjects..."
                  className="bg-transparent border-none outline-none text-sm w-full text-slate-300 placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('show-chat'))}
                className="p-2.5 text-slate-400 hover:text-primary hover:bg-primary/10 bg-slate-900 rounded-xl transition-all relative border border-slate-800 md:hidden"
                title="Show Chat"
              >
                <MessageSquare className="w-5 h-5" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-950 flex items-center justify-center text-[8px] font-black text-white animate-bounce">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => window.dispatchEvent(new CustomEvent('show-chat'))}
                className="hidden md:flex p-2.5 text-slate-400 hover:text-primary hover:bg-primary/10 bg-slate-900 rounded-xl transition-all relative border border-slate-800"
                title="Messages"
              >
                <Mail className="w-5 h-5" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-slate-950 flex items-center justify-center text-[10px] font-black text-white animate-bounce">
                    {unreadMessagesCount}
                  </span>
                )}
              </button>

              <Link to="/notifications" className="p-2.5 text-slate-400 hover:text-primary hover:bg-primary/10 bg-slate-900 rounded-xl transition-all relative border border-slate-800">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-slate-950"></span>
              </Link>
              
              <div className="h-8 w-px bg-slate-800 mx-1"></div>

              <Link 
                to={profile?.uid ? `/profile/${profile.uid}` : '/profile/loading'} 
                className="flex items-center gap-3 p-1.5 pr-4 hover:bg-slate-900 rounded-2xl transition-all group border border-transparent hover:border-slate-800"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-800 overflow-hidden ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all animate-fade-in">
                  {profile?.photoURL ? (
                    <img
                      src={profile.photoURL}
                      alt={profile.displayName || ''}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700">
                      <UserIcon className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="hidden sm:block text-left animate-fade-in">
                  <p className="text-sm font-bold text-white leading-none">{profile?.displayName || 'Loading...'}</p>
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-1">Teacher</p>
                </div>
              </Link>

              <button
                onClick={() => {
                  if (window.history.length > 1) {
                    window.history.back();
                  } else {
                    window.location.href = '/';
                  }
                }}
                className={cn(
                  "p-2.5 text-slate-400 hover:text-primary hover:bg-primary/10 bg-slate-900 rounded-xl transition-all border border-slate-800",
                  window.location.pathname === '/' && "hidden"
                )}
                title="Back / رجوع"
              >
                <ArrowRight className="w-5 h-5 hidden rtl:block" />
                <ArrowLeft className="w-5 h-5 hidden ltr:block" />
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

export default memo(Navbar);
