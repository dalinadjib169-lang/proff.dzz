import React, { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { motion } from 'motion/react';
import { BookOpen, GraduationCap, Mail, Lock, User, LogIn, RefreshCw, AlertCircle, Sparkles, UserCircle, KeyRound, CheckCircle2, Eye, EyeOff, ChevronRight, Download, Smartphone, X, Share, HelpCircle, Star } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
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

  // Forgot Password Flow State
  const [forgotPasswordStep, setForgotPasswordStep] = useState<0 | 1 | 2 | 3>(0);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const navigate = useNavigate();

  // Load saved credentials on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('app_saved_email');
    const savedPhone = localStorage.getItem('app_saved_phone');
    const savedPassword = localStorage.getItem('app_saved_password');
    const savedMethod = localStorage.getItem('app_saved_method') as 'email' | 'phone';
    
    if (savedEmail) setEmail(savedEmail);
    if (savedPhone) setPhone(savedPhone);
    if (savedPassword) setPassword(atob(savedPassword)); // Decode base64
    if (savedMethod) setAuthMethod(savedMethod);
  }, []);

  const handleSendResetCode = async () => {
    if (authMethod === 'email' && !email) {
      setError('يرجى إدخال البريد الإلكتروني أولاً لإرسال الكود');
      return;
    }
    if (authMethod === 'phone' && !phone) {
      setError('يرجى إدخال رقم الهاتف أولاً لإرسال الكود');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (authMethod === 'email') {
        await sendPasswordResetEmail(auth, email);
        alert('تم إرسال رابط إعادة تعيين كلمة السر إلى بريدك الإلكتروني بنجاح! يرجى النقر على الرابط في رسالتك لإعادة تعيين كلمة السر.');
        setForgotPasswordStep(0); 
      } else {
        // Simulate phone SMS sending for prototype
        setTimeout(() => {
          setSuccess('تم إرسال كود التحقق إلى رقم هاتفك (محاكاة)');
          setForgotPasswordStep(2);
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'فشل إرسال الكود');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetCode = () => {
    if (resetCode.length < 6) {
      setError('يرجى إدخال الكود المكون من 6 أرقام بشكل صحيح');
      return;
    }
    setError('');
    setSuccess('تم التحقق من الكود بنجاح!');
    setForgotPasswordStep(3); // Go to new password
  };

  const handleSetNewPassword = async () => {
    if (!newPassword || newPassword !== confirmNewPassword) {
      setError('كلمات السر غير متطابقة أو فارغة');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Note: In a real app without backend, we can't easily change the password using a dummy code.
      // We will simulate success and advise the user.
      if (authMethod === 'email') {
        // The user must click the link sent to their email to actually change it in Firebase.
        setError('لأسباب أمنية (نسخة تجريبية)، يرجى الضغط على الرابط المرسل إلى بريدك الإلكتروني لتعيين كلمة السر الجديدة في Firebase مباشرة.');
        setForgotPasswordStep(0);
      } else {
        setSuccess('تم تعيين كلمة السر بنجاح! (محاكاة)');
        setForgotPasswordStep(0);
        setAuthMethod('phone');
        setPassword(newPassword);
      }
    } catch (err: any) {
      setError(err.message || 'فشل تحديث كلمة السر');
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

  // No PWA state anymore (app natively compiled for Android via AppCreator24)

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

      if (rememberMe) {
        localStorage.setItem('app_saved_email', email);
        localStorage.setItem('app_saved_phone', phone);
        localStorage.setItem('app_saved_password', btoa(password));
        localStorage.setItem('app_saved_method', authMethod);
      } else {
        localStorage.removeItem('app_saved_email');
        localStorage.removeItem('app_saved_phone');
        localStorage.removeItem('app_saved_password');
        localStorage.removeItem('app_saved_method');
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
      localStorage.removeItem('app_saved_email');
      localStorage.removeItem('app_saved_phone');
      localStorage.removeItem('app_saved_password');
      localStorage.removeItem('app_saved_method');
      await signOut(auth);
      setEmail('');
      setPassword('');
      setPhone('');
      setRememberMe(true);
      setError('تم تسجيل الخروج بنجاح. يمكنك الآن الدخول بحساب آخر.');
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

        {forgotPasswordStep > 0 ? (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-2">
                {forgotPasswordStep === 1 && 'استعادة كلمة السر'}
                {forgotPasswordStep === 2 && 'أدخل كود التحقق'}
                {forgotPasswordStep === 3 && 'تعيين كلمة سر جديدة'}
              </h2>
            </div>

            {forgotPasswordStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-400 text-center font-medium leading-relaxed">
                  أدخل {authMethod === 'email' ? 'البريد الإلكتروني' : 'رقم الهاتف'} الذي سجلت به لإرسال رمز الاستعادة.
                </p>
                {authMethod === 'email' ? (
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="email"
                      placeholder="البريد الإلكتروني"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-950/30 border border-slate-800/50 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-white placeholder:text-slate-600 text-sm font-bold"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="relative">
                    <RefreshCw className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="tel"
                      placeholder="رقم الهاتف"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-950/30 border border-slate-800/50 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-white placeholder:text-slate-600 text-sm font-bold"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                )}
                <button
                  onClick={handleSendResetCode}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3.5 px-4 rounded-2xl hover:opacity-90 transition-opacity active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-purple-500/25"
                >
                  {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'إرسال الكود'}
                </button>
              </div>
            )}

            {forgotPasswordStep === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-400 text-center font-medium">
                  تم إرسال كود التحقق. يرجى إدخاله هنا.
                </p>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="كود التحقق (6 أرقام)"
                    maxLength={6}
                    className="w-full pl-12 pr-4 py-3.5 text-center tracking-[0.5em] bg-slate-950/30 border border-slate-800/50 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-white placeholder:text-slate-600 text-lg font-bold"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <button
                  onClick={handleVerifyResetCode}
                  disabled={resetCode.length < 6}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3.5 px-4 rounded-2xl hover:opacity-90 transition-opacity active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-purple-500/25 disabled:opacity-50"
                >
                  التحقق
                </button>
              </div>
            )}

            {forgotPasswordStep === 3 && (
              <div className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="كلمة السر الجديدة"
                    className="w-full pl-12 pr-12 py-3.5 bg-slate-950/30 border border-slate-800/50 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-white placeholder:text-slate-600 text-sm font-bold"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl text-slate-400 hover:text-purple-400 hover:bg-purple-400/10 transition-all z-20"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="تأكيد كلمة السر الجديدة"
                    className="w-full pl-12 pr-12 py-3.5 bg-slate-950/30 border border-slate-800/50 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-white placeholder:text-slate-600 text-sm font-bold"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleSetNewPassword}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-3.5 px-4 rounded-2xl hover:opacity-90 transition-opacity active:scale-[0.98] flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25"
                >
                  {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'تأكيد كلمة السر'}
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setForgotPasswordStep(0);
                setError('');
                setSuccess('');
              }}
              className="mt-2 text-sm font-bold text-slate-400 hover:text-white transition-colors text-center"
            >
              العودة لتسجيل الدخول
            </button>
          </div>
        ) : (
          <>
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

            {isRegister && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl mb-2 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-amber-500/90 leading-tight">
                  ملاحظة هامة: لا يمكن فتح إلا حساب واحد برقم هاتف أو بريد إلكتروني واحد فقط. يرجى الاحتفاظ بمعلومات الدخول الخاصة بك.
                </p>
              </div>
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
                onClick={() => { setForgotPasswordStep(1); setError(''); setSuccess(''); }}
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
          <div className="flex flex-col items-center gap-2 mb-4 border-t border-slate-800/40 pt-4">
            <Link 
              to="/privacy" 
              className="text-xs font-bold text-purple-400 hover:text-purple-300 underline transition-all flex items-center gap-1"
            >
              سياسة الخصوصية / Privacy Policy
            </Link>
          </div>
          <p className="text-[10px] font-black text-slate-700 text-center uppercase tracking-[0.2em]">
            Developer Dali Nadjib
          </p>
        </div>
        </>
        )}
      </motion.div>
    </div>
  </div>
  );
}
