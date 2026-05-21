import React, { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { motion } from 'motion/react';
import { BookOpen, GraduationCap, Mail, Lock, User, LogIn, RefreshCw, AlertCircle, Sparkles, UserCircle, KeyRound, CheckCircle2, Eye, EyeOff, ChevronRight, Download, Smartphone, X, Share, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [networkStatus, setNetworkStatus] = useState<{ google: boolean | null; firebase: boolean | null }>({ google: null, firebase: null });

  const navigate = useNavigate();

  const handleForgotPassword = async () => {
    if (!email) {
      setError('يرجى إدخال البريد الإلكتروني أولاً لإرسال رابط استعادة كلمة السر');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('تم إرسال رابط إعادة تعيين كلمة السر إلى بريدك الإلكتروني بنجاح!');
    } catch (err: any) {
      setError(err.message || 'فشل إرسال رابط الاستعادة');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const checkConnectivity = async () => {
      try {
        // Test Google Connectivity
        const googleRes = await fetch('https://apis.google.com/js/api.js', { mode: 'no-cors' }).catch(() => null);
        // Test Firebase Auth Domain
        const firebaseRes = await fetch(`https://${auth.app.options.authDomain}/__/__/auth/handler`, { mode: 'no-cors' }).catch(() => null);
        
        setNetworkStatus({
          google: !!googleRes,
          firebase: !!firebaseRes
        });
      } catch (e) {
        console.error("Connectivity check failed:", e);
      }
    };
    checkConnectivity();
  }, []);

  // PWA & Installation state logic on Login Page
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPwaGuide, setShowPwaGuide] = useState(false);
  const [guideReason, setGuideReason] = useState<'ios' | 'inapp' | 'none_yet'>('none_yet');

  useEffect(() => {
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

    // Periodically inspect window.deferredPrompt for immediate reactivity
    const checkPromptInterval = setInterval(() => {
      if ((window as any).deferredPrompt) {
        setDeferredPrompt((window as any).deferredPrompt);
      }
    }, 500);

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

  const handlePwaAction = async () => {
    if (isStandalone) {
      toast.success("التطبيق مثبت بالفعل على جهازك وتتصفحه الآن!");
      return;
    }

    // Check if running inside iframe or In-App Browsers
    const isIframe = window.self !== window.top;
    const isFB = /fban|fbav/i.test(navigator.userAgent);
    const isWhatsApp = /whatsapp/i.test(navigator.userAgent);
    const isMessenger = /messenger/i.test(navigator.userAgent);
    const isInstagram = /instagram/i.test(navigator.userAgent);
    const isInAppBrowser = isFB || isWhatsApp || isMessenger || isInstagram || isIframe;

    if (isInAppBrowser) {
      setGuideReason('inapp');
      setShowPwaGuide(true);
      return;
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);

    if (isIosDevice) {
      setGuideReason('ios');
      setShowPwaGuide(true);
      return;
    }

    const promptToUse = deferredPrompt || (window as any).deferredPrompt;
    if (!promptToUse) {
      setGuideReason('none_yet');
      setShowPwaGuide(true);
      return;
    }

    try {
      promptToUse.prompt();
      const { outcome } = await promptToUse.userChoice;
      if (outcome === 'accepted') {
        (window as any).deferredPrompt = null;
        setDeferredPrompt(null);
        setIsStandalone(true);
        toast.success("تم تثبيت التطبيق بنجاح! شكراً لك.");
        setShowPwaGuide(false);
      }
    } catch (err) {
      console.error("PWA prompt error", err);
      setGuideReason('none_yet');
      setShowPwaGuide(true);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    
    // Check connectivity first
    if (!navigator.onLine) {
      setError('لا يوجد اتصال بالإنترنت. يرجى التأكد من اتصالك بالشبكة.');
      return;
    }

    // Check if user is already logged in
    if (auth.currentUser) {
      console.log("User already logged in, no need to authenticate again.");
      return;
    }

    const provider = new GoogleAuthProvider();
    // Force account selection screen
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    setError('');
    setLoading(true);
    
    try {
      // Ensure window has focus to help with popup blockers
      window.focus();
      
      console.log("Starting Google Login popup...");
      // Using a timeout to detect if the popup is hanging or blocked in a way that doesn't throw immediately
      const result = await signInWithPopup(auth, provider);
      
      console.log("Google Login successful for user:", result.user.email);
      localStorage.setItem('pwa_show_immediately', 'true');
    } catch (err: any) {
      console.error("Google Login Error:", err);
      const currentDomain = window.location.hostname;
      
      // Handle specific Firebase Auth errors
      if (err.code === 'auth/popup-blocked') {
        setError('Popup blocked! Please allow popups for this site in your browser settings to sign in with Google.');
      } else if (err.code === 'auth/network-request-failed') {
        setError(`خطأ في الاتصال (Network Error): فشل الاتصال بخوادم جوجل.
          الأسباب المحتملة: 
          1. مانع إعلانات (Ad-blocker) مفعل. 
          2. متصفح Brave أو وضع التخفي (Incognito) يمنع الكوكيز. 
          3. استخدام VPN أو جدار حماية.
          يرجى محاكاة تسجيل الدخول بالبريد الإلكتروني بدلاً من جوجل إذا استمر المشكلة.`);
        console.warn("Auth Network Failure diagnostic:", {
          domain: currentDomain,
          online: navigator.onLine,
          userAgent: navigator.userAgent
        });
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(`هذا النطاق (${currentDomain}) غير مصرح به. يرجى التأكد من إضافة هذا العنوان إلى Authorized Domains في إعدادات Firebase Console.`);
      } else if (err.code === 'auth/cancelled-popup-request' || err.message?.includes('INTERNAL ASSERTION FAILED')) {
        setError('Authentication state error. Please refresh the page and try again.');
        // Force a reload after a short delay if this happens repeatedly
        setTimeout(() => window.location.reload(), 2000);
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('The login window was closed before completion. Please try again.');
      } else if (err.code === 'auth/internal-error') {
        setError('An internal authentication error occurred. Please refresh the page and try again.');
      } else {
        setError(err.message || 'Failed to login with Google. Please try again.');
      }
    } finally {
      // Small delay before allowing another attempt to avoid race conditions
      setTimeout(() => setLoading(false), 1500);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      // Set persistence based on "Remember Me"
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      
      let finalEmail = email;
      if (authMethod === 'phone') {
        const cleanedPhone = phone.replace(/\s+/g, '');
        if (!cleanedPhone.match(/^[0-9+]+$/)) {
          throw new Error('يرجى إدخال رقم هاتف صحيح');
        }
        finalEmail = `${cleanedPhone}@teac.dz`;
      }

      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, password);
        // Save pending data for profile creation
        localStorage.setItem('pendingRegistrationData', JSON.stringify({ 
          firstName: firstName || 'زميل', 
          lastName: lastName || 'جديد',
          phone: authMethod === 'phone' ? phone : null
        }));
        localStorage.setItem('pwa_show_immediately', 'true');
      } else {
        await signInWithEmailAndPassword(auth, finalEmail, password);
        localStorage.setItem('pwa_show_immediately', 'true');
      }
    } catch (err: any) {
      console.error("Email Auth Error:", err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTryForFree = () => {
    navigate('/premium-tools?mode=guest');
  };

  const handleSwitchAccount = async () => {
    try {
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userPassword');
      await signOut(auth);
      setEmail('');
      setPassword('');
      setRememberMe(true);
      setError('Signed out. You can now log in with a different account.');
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center relative overflow-hidden rounded-3xl p-4">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: 'url("/user_uploads/input_file_0.png")' }}
      >
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[3px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-slate-900/40 backdrop-blur-3xl p-6 md:p-8 rounded-[3rem] shadow-2xl border border-slate-800/30 flex flex-col gap-y-6"
        >
          {/* Simple Inline PWA Install/Uninstall button right on top-right of the login card */}
          <div className="flex justify-end w-full -mb-2">
            {isStandalone ? (
              <button
                type="button"
                onClick={handlePwaAction}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl border border-amber-500/25 active:scale-95 transition-all cursor-pointer shadow-lg shadow-amber-500/5 hover:-translate-y-0.5"
                title="إلغاء التثبيت"
                id="login-pwa-btn"
              >
                <Smartphone className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>إلغاء التثبيت (Désinstaller)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePwaAction}
                className="relative flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl active:scale-95 transition-all cursor-pointer shadow-xl shadow-purple-600/30 hover:-translate-y-0.5"
                title="تثبيت التطبيق"
                id="login-pwa-btn"
              >
                <span className="absolute -top-1 -left-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
                </span>
                <Download className="w-4 h-4 animate-bounce shrink-0" />
                <span>تثبيت التطبيق (Installer)</span>
              </button>
            )}
          </div>

          {/* Religious Header Section */}
          <div className="text-center border-b border-slate-800/50 pb-6">
            <motion.h2 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-5xl font-black text-amber-400 drop-shadow-[0_2px_15px_rgba(251,191,36,0.5)] mb-3"
              style={{ fontFamily: "var(--font-amiri)", color: '#FFD700' }}
            >
              بسم الله الرحمن الرحيم
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-lg md:text-xl font-bold text-white/90 italic"
              style={{ fontFamily: "var(--font-amiri)" }}
            >
              اللهم صلي و سلم على سيدنا محمد
            </motion.p>
          </div>

          {/* App Branding Section */}
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 p-1 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-[2rem] mb-4 shadow-xl shadow-purple-500/30 relative group overflow-hidden border border-purple-500/50">
              <img 
                src="/prof_dali_logo.png" 
                className="w-full h-full object-cover rounded-[1.85rem]" 
                alt="TeachDZ Logo" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-0 right-0 w-8 h-8 rounded-bl-2xl overflow-hidden border-b border-l border-slate-905 bg-slate-950/20 flex items-center justify-center">
                <img src="https://flagcdn.com/w40/dz.png" className="w-5 h-3.5 object-cover rounded-sm shadow-sm" alt="Algeria" />
              </div>
            </div>
            
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-white via-purple-300 to-indigo-300 bg-clip-text text-transparent tracking-tighter drop-shadow-[0_0_15px_rgba(168,85,247,0.75)] filter">TeachDZ</h1>
            </div>
            
            <div className="flex flex-col items-center gap-1">
              <p className="text-amber-400 font-black text-base md:text-lg" style={{ fontFamily: "var(--font-amiri)" }}>جرب توليد مذكرات واختبارات في ثواني</p>
              <p className="text-slate-500 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">The Algerian Teachers Network</p>
            </div>
          </div>

        {error && (
          <div className="bg-red-500/10 text-red-500 p-4 rounded-2xl text-sm font-medium border border-red-500/20 shadow-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">خطأ</p>
                <p className="text-xs opacity-90 whitespace-pre-wrap">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 text-green-500 p-4 rounded-2xl text-sm font-medium border border-green-500/20 shadow-lg">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">نجاح</p>
                <p className="text-xs opacity-90">{success}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 p-1 bg-slate-950/30 backdrop-blur-md rounded-2xl border border-slate-800/50">
          <button
            type="button"
            onClick={() => setAuthMethod('email')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${authMethod === 'email' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Email / بريد إلكتروني
          </button>
          <button
            type="button"
            onClick={() => setAuthMethod('phone')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${authMethod === 'phone' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Phone / رقم هاتف
          </button>
        </div>

        {isRegister && (
          <button 
            onClick={() => setIsRegister(false)}
            className="self-start py-2.5 px-5 flex items-center gap-2 text-white transition-all bg-slate-800 hover:bg-slate-700 rounded-2xl border border-slate-700 shadow-xl text-xs font-black group active:scale-95"
          >
            <ChevronRight className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            رجوع لصفحة الدخول / BACK
          </button>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isRegister && (
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  placeholder="الاسم"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-950/30 border border-slate-800/50 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-white placeholder:text-slate-600 text-sm font-bold"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="relative">
                <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  placeholder="اللقب"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-950/30 border border-slate-800/50 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-white placeholder:text-slate-600 text-sm font-bold"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
          )}

          {authMethod === 'email' ? (
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="email"
                placeholder="البريد الإلكتروني"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-950/30 border border-slate-800/50 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-white placeholder:text-slate-600 text-sm font-bold"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="relative">
              <RefreshCw className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="tel"
                placeholder="رقم الهاتف (مثل 0600000000)"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-950/30 border border-slate-800/50 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-white placeholder:text-slate-600 text-sm font-bold"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          )}
          
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="كلمة السر"
              className="w-full pl-12 pr-12 py-3.5 bg-slate-950/30 border border-slate-800/50 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-white placeholder:text-slate-600 text-sm font-bold"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl text-slate-400 hover:text-purple-400 hover:bg-purple-400/10 transition-all z-20 active:scale-95"
              title={showPassword ? "إخفاء كلمة السر" : "إظهار كلمة السر"}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center justify-between px-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center ${rememberMe ? 'bg-purple-600 border-purple-600' : 'border-slate-700 bg-slate-950/50 group-hover:border-slate-600'}`}>
                {rememberMe && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
              <input 
                type="checkbox" 
                className="hidden" 
                checked={rememberMe} 
                onChange={() => setRememberMe(!rememberMe)} 
              />
              <span className="text-xs font-bold text-slate-400 group-hover:text-slate-300 transition-colors">تذكرني</span>
            </label>
            <div className="flex flex-col items-end gap-2">
              <button 
                type="button"
                onClick={handleForgotPassword}
                className="text-[10px] font-black text-amber-500 hover:text-amber-400 transition-all uppercase tracking-tighter"
              >
                نسيت كلمة السر؟
              </button>
              <button 
                type="button"
                onClick={handleSwitchAccount}
                className="text-xs font-bold text-slate-500 hover:text-purple-400 transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                تبديل الحساب
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl shadow-lg shadow-purple-500/10 transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
            {loading ? 'جاري المعالجة...' : (isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول')}
          </button>

          {!isRegister && (
            <button
              type="button"
              onClick={handleTryForFree}
              className="w-full py-3 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/30 text-amber-500 font-bold rounded-xl transition-all flex items-center justify-center gap-2 group active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
              صلي على محمد و سجل  زميلي لتجربة رقمية احترافية في اول منصة للاساتذة الجزائريين 🇩🇿
            </button>
          )}
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-800/50"></div>
          <span className="text-slate-600 text-sm font-medium uppercase tracking-wider">or</span>
          <div className="h-px flex-1 bg-slate-800/50"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className={`w-full py-3 bg-slate-950/50 border border-slate-800/50 hover:bg-slate-900/50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 ${loading ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.98]'}`}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
          )}
          {loading ? 'Authenticating...' : 'Continue with Google'}
        </button>

        <p className="mt-8 text-center text-slate-500 font-medium">
          {isRegister ? 'لديك حساب بالفعل؟' : "ليس لديك حساب؟"}{' '}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-amber-500 hover:text-amber-400 font-extrabold underline decoration-2 underline-offset-8 px-2 py-1 bg-amber-500/10 rounded-lg transition-all"
          >
            {isRegister ? 'تسجيل الدخول' : 'فتح حساب جديد مجاناً'}
          </button>
        </p>

        {/* Login Help */}
        <div className="mt-8 pt-6 border-t border-slate-800/50">
          <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800/50 mb-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              Troubleshooting / حل المشاكل
            </h4>
            <ul className="text-[10px] text-slate-500 space-y-1 list-disc pl-4 text-left">
              <li>Allow popups in your browser / اسمح بالنوافذ المنبثقة</li>
              <li>Disable Ad-blockers or VPN / عطل مانع الإعلانات أو VPN</li>
              <li>Ensure your internet is stable / تأكد من استقرار الإنترنت</li>
              <li>Try a different browser / جرب متصفحاً آخر</li>
            </ul>
          </div>
          <p className="text-[10px] font-black text-slate-700 text-center uppercase tracking-[0.2em]">
            Developer Dali Nadjib
          </p>
        </div>
      </motion.div>

      {/* Embedded PWA install helper modal & instructions */}
      {showPwaGuide && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[1000] flex items-center justify-center p-4" dir="rtl">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="w-full max-w-sm bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-6 rounded-[2.5rem] shadow-[0_0_50px_rgba(139,92,246,0.15)] relative text-right flex flex-col gap-4 text-slate-200"
          >
            <button 
              onClick={() => setShowPwaGuide(false)}
              className="absolute top-4 left-4 p-2 bg-slate-800/40 hover:bg-slate-700 rounded-xl transition-all text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center mt-2">
              <div className="w-16 h-16 rounded-2xl overflow-hidden ring-4 ring-purple-500/30 bg-slate-950 flex items-center justify-center mb-3">
                <img src="/prof_dali_logo.png" className="w-full h-full object-cover" alt="TeachDZ" />
              </div>
              <h3 className="text-lg font-black text-white">تثبيت تطبيق المعلم TeachDZ 🇩🇿</h3>
              <p className="text-xs text-slate-400 mt-1">تصفح منصتك فوراً بنقرة واحدة سريعة ومباشرة على شاشتك:</p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 text-xs space-y-3 leading-relaxed">
              {guideReason === 'inapp' ? (
                <>
                  <p className="text-amber-400 font-bold text-center">⚠️ تنبيه: متصفح التواصل يمنع التثبيت</p>
                  <p>أنت تتصفح حالياً من داخل تطبيق تواصل ماليء بالقيود. لإنشاء الاختصار بنجاح:</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-350">
                    <li>اضغط على زر <span className="text-amber-400 font-extrabold">النقاط الثلاث ┋ بالأعلى</span>.</li>
                    <li>اختر <span className="text-purple-400 font-extrabold">"الفتح في متصفح كروم / النظام"</span> (Ouvrir dans Chrome).</li>
                  </ol>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText("https://proff-dzz.vercel.app/");
                      toast.success("تم نسخ رابط المنصة! افتحه في كروم الآن.");
                    }}
                    className="w-full py-2 bg-slate-850 hover:bg-slate-800 text-white font-black rounded-xl transition-all mt-2 flex items-center justify-center gap-1.5 text-[11px]"
                  >
                    نسخ رابط المنصة لتفتحه في كروم 🔗
                  </button>
                </>
              ) : (
                <>
                  <p className="text-purple-450 font-bold text-center">✨ منصة الأساتذة والطلاب الجزائرية</p>
                  <p className="text-slate-300 text-center">
                    متصفحك يدعم التثبيت المباشر بنقرة واحدة فقط. يرجى الضغط على زر التثبيت بالاختصار بالأعلى أو بخيارات المتصفح (┋) لإنشاء الأيقونة الأنيقة للبروفيسور على هاتفك فوراً!
                  </p>
                </>
              )}
            </div>

            <button 
              onClick={() => setShowPwaGuide(false)}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-505 text-white font-black rounded-xl text-xs transition-colors shadow-lg active:scale-95"
            >
              مفهوم، شكراً لك 👍
            </button>
          </motion.div>
        </div>
      )}
    </div>
  </div>
  );
}
