import React, { memo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  GraduationCap, 
  Bell, 
  BellRing,
  Search, 
  User as UserIcon, 
  MessageSquare, 
  Mail, 
  ArrowLeft, 
  ArrowRight,
  LogOut,
  Shield
} from 'lucide-react';
import { useUnreadMessages } from '../hooks/useUnreadMessages';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot, query, where, updateDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { isUserAdmin } from '../lib/admin';
import { subscribeToPushNotifications, displayNotification, sendTestServerPush, isRunningInIframe } from '../lib/notifications';
import { playSound, unlockAudio } from '../lib/sounds';

function Navbar() {
  const { user, profile } = useAuth();
  const unreadMessagesCount = useUnreadMessages();
  const isAdmin = isUserAdmin(profile, user);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'default'
  );
  const [enablingPush, setEnablingPush] = useState(false);

  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', profile.uid),
      where('read', '==', false)
    );
    return onSnapshot(q, (snap) => {
      setUnreadNotifsCount(snap.size);
    }, () => {});
  }, [profile?.uid]);

  const handleEnablePush = async () => {
    if (!profile?.uid) return;
    setEnablingPush(true);
    try {
      unlockAudio();
      const ok = await subscribeToPushNotifications(profile.uid);
      const perm = typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'default';
      setNotifPermission(perm);
      if (ok || perm === 'granted') {
        await updateDoc(doc(db, 'users', profile.uid), {
          'settings.isPushNotificationsEnabled': true,
          'settings.isNotificationSoundEnabled': true,
        }).catch(() => {});
        playSound('notification');
        if (ok) {
          await sendTestServerPush(profile.uid, 0);
        } else {
          displayNotification('تم تفعيل إشعارات الخلفية ✅', {
            body: 'ستصلك التنبيهات الصوتية والكتابية حتى عند إغلاق التطبيق.',
            soundType: 'notification',
            url: '/notifications',
          });
        }
        toast.success('تم تفعيل إشعارات الخلفية والصوت بنجاح');
      } else {
        toast.error(
          isRunningInIframe()
            ? 'افتح التطبيق مباشرة في المتصفح لتفعيل إشعارات الخلفية'
            : 'يرجى السماح بالإشعارات من إعدادات المتصفح'
        );
      }
    } finally {
      setEnablingPush(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("تم تسجيل الخروج بنجاح");
    } catch (err) {
      console.error("Logout error:", err);
      toast.error("حدث خطأ أثناء تسجيل الخروج");
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-slate-950/10 backdrop-blur-3xl border-b border-white/5 shadow-2xl overflow-hidden">
        {/* Moving shadow / light sweep */}
        <div className="absolute top-0 bottom-0 w-48 bg-gradient-to-r from-transparent via-purple-400/20 to-transparent blur-lg animate-nav-sweep z-0 pointer-events-none -skew-x-12"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4 sm:gap-6 relative z-20">
              <Link to="/" className="flex items-center gap-2.5 group shrink-0 animate-logo-shine">
                <div className="w-9 h-9 rounded-xl overflow-hidden ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all shadow-lg bg-slate-900 border border-slate-850/50 shrink-0 flex items-center justify-center">
                  <img src="/prof_dali_logo.png" className="w-full h-full object-cover" alt="TeachDZ" />
                </div>
                <span className="text-lg sm:text-xl font-black bg-gradient-to-r from-white via-purple-300 to-indigo-300 bg-clip-text text-transparent tracking-tight">TeachDZ</span>
              </Link>

              <div className="hidden lg:flex items-center bg-slate-900 rounded-2xl px-4 py-2 w-64 group focus-within:ring-2 focus-within:ring-primary/50 transition-all border border-slate-800">
                <Search className="w-4 h-4 text-slate-500 mr-2" />
                <input
                  type="text"
                  placeholder="Search teachers, subjects..."
                  className="bg-transparent border-none outline-none text-sm w-full text-slate-300 placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {notifPermission !== 'granted' && (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={enablingPush}
                  className="p-2 sm:px-2.5 sm:py-2 bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-white rounded-xl transition-all border border-amber-500/30 flex items-center gap-1.5 animate-pulse disabled:opacity-60"
                  title="تفعيل إشعارات الخلفية والصوت"
                >
                  <BellRing className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  <span className="hidden lg:inline text-[10px] font-black">تفعيل الإشعارات</span>
                </button>
              )}

              <button
                onClick={() => window.dispatchEvent(new CustomEvent('show-chat'))}
                className="p-2 sm:p-2.5 text-slate-400 hover:text-primary hover:bg-primary/10 bg-slate-900 rounded-xl transition-all relative border border-slate-800 md:hidden"
                title="Show Chat"
              >
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
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

              <Link to="/notifications" className="p-2 sm:p-2.5 text-slate-400 hover:text-primary hover:bg-primary/10 bg-slate-900 rounded-xl transition-all relative border border-slate-800">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-purple-600 rounded-full border-2 border-slate-950 flex items-center justify-center text-[8px] font-black text-white animate-pulse">
                    {unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}
                  </span>
                )}
              </Link>
              
              {isAdmin && (
                <Link to="/admin" className="p-2 sm:p-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 bg-slate-900 rounded-xl transition-all relative border border-red-500/20 animate-pulse" title="Admin SOC Dashboard">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                </Link>
              )}
              
              <div className="h-6 sm:h-8 w-px bg-slate-800 mx-0.5 sm:mx-1"></div>

              <Link 
                to={profile?.uid ? `/profile/${profile.uid}` : '/profile/loading'} 
                className="flex items-center gap-2 sm:gap-3 p-1 hover:bg-slate-900 rounded-2xl transition-all group border border-transparent hover:border-slate-800"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 overflow-hidden ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all animate-fade-in shrink-0">
                  {profile?.photoURL ? (
                    <img
                      src={profile.photoURL}
                      alt={profile.displayName || ''}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700">
                      <UserIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                  )}
                </div>
                <div className="hidden sm:block text-left animate-fade-in">
                  <p className="text-sm font-bold text-white leading-none">{profile?.displayName || 'Loading...'}</p>
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-1">Teacher</p>
                </div>
              </Link>

              {/* Log Out button in the header */}
              <button
                onClick={handleLogout}
                className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-white hover:text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all border border-red-500 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-red-600/20 shrink-0"
                title="تسجيل الخروج"
                id="navbar-logout-btn"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline text-[10px] sm:text-[11px] font-black">خروج</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

export default memo(Navbar);
