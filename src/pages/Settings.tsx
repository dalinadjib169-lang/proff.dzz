import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  Globe, 
  Moon, 
  Sun, 
  Type, 
  Lock, 
  UserMinus, 
  Check,
  ChevronRight,
  Languages,
  Eye,
  ShieldAlert,
  Shield,
  ShieldCheck,
  Zap,
  Save,
  Trash2,
  Plus,
  Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { doc, updateDoc, getDocs, collection, query, where, arrayRemove, arrayUnion, deleteDoc } from 'firebase/firestore';
import { UserProfile, UserSettings } from '../types';
import { sendPasswordResetEmail, deleteUser, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useTranslation } from '../hooks/useTranslation';
import CloudinaryUploader from '../components/CloudinaryUploader';

export default function Settings() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [settings, setSettings] = useState<UserSettings>(profile?.settings || {
    language: 'ar',
    theme: 'dark',
    themeColor: 'purple',
    fontSize: 'medium',
    fontType: 'sans',
    defaultPostPrivacy: 'public'
  });
  const [blockedUsers, setBlockedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (profile) {
      setSettings(profile.settings || {
        language: 'ar',
        theme: 'dark',
        themeColor: 'purple',
        fontSize: 'medium',
        fontType: 'sans',
        defaultPostPrivacy: 'public'
      });
      fetchBlockedUsers();
      fetchFriends();
    }
  }, [profile]);

  // Live preview logic
  useEffect(() => {
    const { theme, fontSize, fontType, language, themeColor } = settings;
    
    // Theme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Theme Color
    const themeColors = ['emerald', 'amber', 'rose', 'cyan', 'indigo', 'purple', 'glass', 'transparent'];
    themeColors.forEach(c => document.documentElement.classList.remove(`theme-${c}`));
    if (themeColor && themeColors.includes(themeColor)) {
      document.documentElement.classList.add(`theme-${themeColor}`);
    }

    // Font Size
    const sizeMap = { small: '14px', medium: '16px', large: '18px' };
    document.documentElement.style.setProperty('--font-size-current', sizeMap[fontSize as keyof typeof sizeMap] || '16px');

    // Font Type
    const fontMap = { 
      sans: '"Inter", ui-sans-serif, system-ui, sans-serif', 
      serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif', 
      mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' 
    };
    document.documentElement.style.setProperty('--font-family-current', fontMap[fontType as keyof typeof fontMap] || fontMap.sans);

    // Language
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language || 'ar';
  }, [settings]);

  const fetchBlockedUsers = async () => {
    const blockedList = profile?.blockedUsers?.filter(uid => !!uid) || [];
    if (!blockedList.length) {
      setBlockedUsers([]);
      return;
    }
    const q = query(collection(db, 'users'), where('uid', 'in', blockedList.slice(0, 10)));
    const snap = await getDocs(q);
    setBlockedUsers(snap.docs.map(doc => doc.data() as UserProfile));
  };

  const fetchFriends = async () => {
    const friendList = profile?.friends?.filter(uid => !!uid) || [];
    if (!friendList.length) {
      setFriends([]);
      return;
    }
    const q = query(collection(db, 'users'), where('uid', 'in', friendList.slice(0, 10)));
    const snap = await getDocs(q);
    setFriends(snap.docs.map(doc => doc.data() as UserProfile));
  };

  const handleSaveSettings = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      const privateRef = doc(db, 'users_private', profile.uid);
      
      await updateDoc(userRef, { settings });
      await updateDoc(privateRef, { settings });
      
      alert("تم حفظ الإعدادات بنجاح");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("فشل حفظ الإعدادات");
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async (userId: string) => {
    if (!profile) return;
    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        blockedUsers: arrayUnion(userId)
      });
      fetchBlockedUsers();
      fetchFriends();
    } catch (error) {
      console.error("Error blocking user:", error);
    }
  };

  const handleUnblock = async (userId: string) => {
    if (!profile) return;
    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        blockedUsers: arrayRemove(userId)
      });
      fetchBlockedUsers();
    } catch (error) {
      console.error("Error unblocking user:", error);
    }
  };

  const handlePasswordReset = async () => {
    if (!profile?.email) return;
    if (!window.confirm('هل تريد إرسال رابط إعادة تعيين كلمة السر إلى بريدك الإلكتروني؟')) return;
    try {
      await sendPasswordResetEmail(auth, profile.email);
      alert('تم إرسال الرابط بنجاح. يرجى التحقق من بريدك الإلكتروني.');
    } catch (error: any) {
      alert('فشل إرسال الرابط: ' + error.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!profile || !auth.currentUser) return;
    const confirm = window.confirm('تحذير: سيتم حذف حسابك وجميع بياناتك نهائياً. هل أنت متأكد؟');
    if (!confirm) return;

    setLoading(true);
    try {
      // 1. Delete Firestore Data
      await deleteDoc(doc(db, 'users', profile.uid));
      await deleteDoc(doc(db, 'users_private', profile.uid));
      
      // 2. Delete Auth User
      await deleteUser(auth.currentUser);
      
      alert('تم حذف الحساب بنجاح');
      window.location.href = '/login';
    } catch (error: any) {
      console.error("Error deleting account:", error);
      if (error.code === 'auth/requires-recent-login') {
        alert('لحذف الحساب، يجب تسجيل الدخول مجدداً قريباً. يرجى تسجيل الخروج ثم الدخول والمحاولة مرة أخرى.');
      } else {
        alert('فشل حذف الحساب: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/30">
          <SettingsIcon className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">{t('settings')}</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold">{t('settings')} - تخصيص تجربتك</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Language & Theme */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-slate-100 dark:border-slate-800 space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-primary">
              <Languages className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase tracking-tight">{t('language')} & {t('theme')}</h2>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-black text-slate-400 uppercase">{t('language')}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'ar', label: 'العربية' },
                  { id: 'en', label: 'English' },
                  { id: 'fr', label: 'Français' }
                ].map(lang => (
                  <button
                    key={lang.id}
                    onClick={() => setSettings({ ...settings, language: lang.id as any })}
                    className={`py-3 rounded-2xl font-black transition-all border-2 ${settings.language === lang.id ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:border-slate-200 dark:hover:border-slate-700'}`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-black text-slate-400 uppercase">لون المنصة</label>
              <div className="grid grid-cols-7 gap-2">
                {[
                  { id: 'purple', color: 'bg-[#7c3aed]' },
                  { id: 'indigo', color: 'bg-[#4f46e5]' },
                  { id: 'cyan', color: 'bg-[#0891b2]' },
                  { id: 'emerald', color: 'bg-[#059669]' },
                  { id: 'amber', color: 'bg-[#d97706]' },
                  { id: 'rose', color: 'bg-[#e11d48]' },
                  { id: 'glass', color: 'bg-white/10 backdrop-blur-sm border border-white/20' },
                  { id: 'transparent', color: 'bg-transparent border-2 border-white/40 border-dashed' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSettings({ ...settings, themeColor: item.id as any })}
                    className={`w-full aspect-square rounded-full transition-all border-4 flex items-center justify-center relative ${settings.themeColor === item.id || (!settings.themeColor && item.id === 'purple') ? 'border-primary scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <div className={`w-full h-full rounded-full ${item.color}`} />
                    {(settings.themeColor === item.id || (!settings.themeColor && item.id === 'purple')) && (
                      <Check className="absolute w-5 h-5 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-black text-slate-400 uppercase">الوضع الليلي</label>
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  {settings.theme === 'dark' ? <Moon className="w-5 h-5 text-purple-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                  <span className="font-bold text-slate-700 dark:text-slate-200">{settings.theme === 'dark' ? 'مفعل' : 'معطل'}</span>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, theme: settings.theme === 'dark' ? 'light' : 'dark' })}
                  className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${settings.theme === 'dark' ? 'bg-primary' : 'bg-slate-300'}`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-all duration-300 ${settings.theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-slate-100 dark:border-slate-800 space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
              <Type className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase tracking-tight">{t('font')} & {t('font_size')}</h2>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-black text-slate-400 uppercase">{t('font')}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'sans', label: 'Sans' },
                  { id: 'serif', label: 'Serif' },
                  { id: 'mono', label: 'Mono' }
                ].map(font => (
                  <button
                    key={font.id}
                    onClick={() => setSettings({ ...settings, fontType: font.id as any })}
                    className={`py-3 rounded-2xl font-black transition-all border-2 ${settings.fontType === font.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:border-slate-200 dark:hover:border-slate-700'}`}
                    style={{ fontFamily: font.id === 'serif' ? 'serif' : font.id === 'mono' ? 'monospace' : 'sans-serif' }}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-black text-slate-400 uppercase">{t('font_size')}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'small', label: 'صغير' },
                  { id: 'medium', label: 'متوسط' },
                  { id: 'large', label: 'كبير' }
                ].map(size => (
                  <button
                    key={size.id}
                    onClick={() => setSettings({ ...settings, fontSize: size.id as any })}
                    className={`py-3 rounded-2xl font-black transition-all border-2 ${settings.fontSize === size.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:border-slate-200 dark:hover:border-slate-700'}`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* App Background */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-slate-100 dark:border-slate-800 space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-amber-500">
              <ImageIcon className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase tracking-tight">خلفية التطبيق</h2>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-black text-slate-400 uppercase">اختر صورة خلفية للمنصة</label>
              
              {profile?.appBackground && (
                <div className="relative group w-full aspect-video rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                  <img src={profile.appBackground} className="w-full h-full object-cover" alt="Background" />
                  <button 
                    onClick={async () => {
                      if (!profile) return;
                      await updateDoc(doc(db, 'users', profile.uid), { appBackground: null });
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              <CloudinaryUploader 
                onUploadSuccess={async (url) => {
                  if (!profile) return;
                  await updateDoc(doc(db, 'users', profile.uid), { appBackground: url });
                  alert("تم تحديث خلفية التطبيق");
                }}
              >
                <div className="w-full py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer">
                  <Plus className="w-8 h-8 text-slate-400" />
                  <span className="text-sm font-black text-slate-500">اضغط لرفع صورة خلفية</span>
                </div>
              </CloudinaryUploader>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-slate-100 dark:border-slate-800 space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <Lock className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase tracking-tight">الخصوصية</h2>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-black text-slate-400 uppercase">من يمكنه رؤية منشوراتي</label>
              <div className="space-y-2">
                {[
                  { id: 'public', label: 'الجميع (عام)', icon: Globe },
                  { id: 'friends', label: 'الزملاء فقط', icon: Eye },
                  { id: 'private', label: 'أنا فقط (خاص)', icon: ShieldAlert }
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => setSettings({ ...settings, defaultPostPrivacy: option.id as any })}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl font-bold transition-all border-2 ${settings.defaultPostPrivacy === option.id ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-600 text-emerald-700 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500'}`}
                  >
                    <div className="flex items-center gap-3">
                      <option.icon className="w-5 h-5" />
                      <span>{option.label}</span>
                    </div>
                    {settings.defaultPostPrivacy === option.id && <Check className="w-5 h-5" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Security & Protection */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-slate-100 dark:border-slate-800 space-y-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Shield className="w-32 h-32 text-indigo-500" />
          </div>
          
          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase tracking-tight">الأمان والحماية</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-700 dark:text-slate-200">نظام التشفير النشط</h3>
                    <p className="text-[10px] text-slate-500 font-bold tracking-tight">End-to-End Encryption Protected</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-500 text-white text-[10px] font-black rounded-full shadow-lg shadow-green-500/20 uppercase">Active</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-700 dark:text-slate-200">حماية من الاختراق</h3>
                    <p className="text-[10px] text-slate-500 font-bold tracking-tight">Advanced Firewall & Anti-Hack</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-blue-500 text-white text-[10px] font-black rounded-full shadow-lg shadow-blue-500/20 uppercase">Enabled</span>
              </div>

              <div className="p-4 bg-indigo-600/5 rounded-2xl border border-indigo-500/20 dark:border-indigo-400/10">
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium leading-relaxed text-right rtl">
                  تم تدعيم المنصة بنظام حماية متطور يعتمد على قواعد بيانات Firebase المؤمنة وتشفير البيانات الحساسة. جميع مكالماتك ومحادثاتك محمية ومشفرة لضمان أقصى درجات الخصوصية.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Blocking */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-slate-100 dark:border-slate-800 space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <UserMinus className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase tracking-tight">قائمة الحظر</h2>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-black text-slate-400 uppercase">حظر زميل جديد</label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto no-scrollbar">
                {friends.length > 0 ? friends.filter(f => !profile?.blockedUsers?.includes(f.uid)).map(friend => (
                  <div key={friend.uid} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <img src={friend.photoURL} className="w-8 h-8 rounded-full object-cover" />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{friend.displayName}</span>
                    </div>
                    <button 
                      onClick={() => handleBlock(friend.uid)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                  </div>
                )) : (
                  <p className="text-xs text-slate-500 text-center py-4">لا يوجد زملاء متاحون للحظر</p>
                )}
              </div>
            </div>

            {blockedUsers.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-sm font-black text-slate-400 uppercase">المستخدمون المحظورون</label>
                <div className="space-y-2">
                  {blockedUsers.map(user => (
                    <div key={user.uid} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20">
                      <div className="flex items-center gap-3">
                        <img src={user.photoURL} className="w-8 h-8 rounded-full object-cover" />
                        <span className="text-sm font-bold text-red-700 dark:text-red-400">{user.displayName}</span>
                      </div>
                      <button 
                        onClick={() => handleUnblock(user.uid)}
                        className="text-xs font-black text-red-600 dark:text-red-400 hover:underline"
                      >
                        إلغاء الحظر
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-red-500/5 dark:bg-red-900/5 rounded-[2.5rem] p-8 shadow-xl border border-red-100 dark:border-red-900/20 space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <ShieldAlert className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase tracking-tight">منطقة الخطر - Danger Zone</h2>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-red-100 dark:border-red-900/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white">إعادة تعيين كلمة السر</h3>
                  <p className="text-xs text-slate-500 font-bold">إرسال رابط تأكيد للبريد الإلكتروني لتغيير كلمة المرور</p>
                </div>
                <button 
                  onClick={handlePasswordReset}
                  className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  تغيير كلمة السر
                </button>
              </div>

              <div className="p-4 bg-red-600/5 rounded-2xl border border-red-600/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-red-600">حذف الحساب نهائياً</h3>
                  <p className="text-xs text-slate-500 font-bold">سيتم مسح جميع بياناتك ومنشوراتك من المنصة</p>
                </div>
                <button 
                  onClick={handleDeleteAccount}
                  className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-black text-xs shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف حسابي
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="flex justify-center pt-8">
        <button
          onClick={handleSaveSettings}
          disabled={loading}
          className="flex items-center gap-3 px-12 py-4 bg-primary text-white font-black rounded-3xl shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? (
            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-6 h-6" />
              <span className="text-lg">{t('save_settings')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
