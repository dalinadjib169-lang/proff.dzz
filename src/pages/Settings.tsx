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
  Save,
  Trash2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { doc, updateDoc, getDocs, collection, query, where, arrayRemove, arrayUnion } from 'firebase/firestore';
import { UserProfile, UserSettings } from '../types';

export default function Settings() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(profile?.settings || {
    language: 'ar',
    theme: 'dark',
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
        fontSize: 'medium',
        fontType: 'sans',
        defaultPostPrivacy: 'public'
      });
      fetchBlockedUsers();
      fetchFriends();
    }
  }, [profile]);

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

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-purple-600 p-3 rounded-2xl shadow-lg shadow-purple-500/30">
          <SettingsIcon className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">الإعدادات</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold">تخصيص تجربتك في المنصة</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Language & Theme */}
        <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-slate-100 dark:border-slate-800 space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400">
              <Languages className="w-6 h-6" />
              <h2 className="text-xl font-black uppercase tracking-tight">اللغة والمظهر</h2>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-black text-slate-400 uppercase">اللغة</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'ar', label: 'العربية' },
                  { id: 'en', label: 'English' },
                  { id: 'fr', label: 'Français' }
                ].map(lang => (
                  <button
                    key={lang.id}
                    onClick={() => setSettings({ ...settings, language: lang.id as any })}
                    className={`py-3 rounded-2xl font-black transition-all border-2 ${settings.language === lang.id ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:border-slate-200 dark:hover:border-slate-700'}`}
                  >
                    {lang.label}
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
                  className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${settings.theme === 'dark' ? 'bg-purple-600' : 'bg-slate-300'}`}
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
              <h2 className="text-xl font-black uppercase tracking-tight">الخط والحجم</h2>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-black text-slate-400 uppercase">نوع الخط</label>
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
              <label className="block text-sm font-black text-slate-400 uppercase">حجم الخط</label>
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
      </div>

      <div className="flex justify-center pt-8">
        <button
          onClick={handleSaveSettings}
          disabled={loading}
          className="flex items-center gap-3 px-12 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black rounded-3xl shadow-2xl shadow-purple-500/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? (
            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-6 h-6" />
              <span className="text-lg">حفظ جميع الإعدادات</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
