import React, { useState, useEffect, memo } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Home, User, Bell, Bookmark, Settings, Users, BookOpen, MessageSquare, TrendingUp, UserPlus, Sparkles, Wand2, CheckSquare, FileText, Image, Share2, ExternalLink, Zap, Car, ShoppingBag, Heart, Dumbbell, LogOut, Shield, Gamepad2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { UserProfile } from '../types';
import { playSound } from '../lib/sounds';
import { isUserAdmin } from '../lib/admin';

import { useTranslation } from '../hooks/useTranslation';

function Sidebar() {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [colleagues, setColleagues] = useState<UserProfile[]>([]);
  const [developer, setDeveloper] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!profile?.uid) return;

    // Fetch developer profile
    const devQuery = query(collection(db, 'users'), where('email', '==', 'dalinadjib1990@gmail.com'), limit(1));
    const unsubscribeDev = onSnapshot(devQuery, (snapshot) => {
      if (!snapshot.empty) {
        setDeveloper({ uid: snapshot.docs[0].id, ...snapshot.docs[0].data() } as UserProfile);
      }
    }, (error) => {
      // Non-critical: just log if dev profile fetch fails
      console.warn("Dev profile fetch denied or failed:", error);
    });

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', profile.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    // Fetch total registered users and colleagues (sorted by recent)
    const usersQuery = query(collection(db, 'users'), limit(500));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[];
      setTotalUsers(allUsers.length);
      // Filter to show some colleagues (e.g., same subject or just recent ones)
      setColleagues(allUsers.filter(u => u.uid !== profile.uid).slice(0, 5));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => {
      unsubscribe();
      unsubscribeUsers();
    };
  }, [profile]);

  const isOnline = (lastSeen: any) => {
    if (lastSeen === true) return true;
    if (!lastSeen) return false;
    try {
      const date = lastSeen.toDate ? lastSeen.toDate() : new Date(lastSeen);
      const now = new Date();
      // Increased tolerance to 10 minutes for better sync reliability
      return (now.getTime() - date.getTime()) < 600000;
    } catch (e) {
      return false;
    }
  };

  const isPremium = (profile?.email === 'dalinadjib1990@gmail.com') || (profile?.premiumUntil ? profile.premiumUntil.toDate() > new Date() : false);

  const handleSidebarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('button')) {
      window.dispatchEvent(new CustomEvent('close-sidebar'));
    }
  };

  const { user } = useAuth();
  const isAdmin = isUserAdmin(profile, user);

  const baseNavItems = [
    { icon: Home, label: t('home'), path: '/' },
    { icon: MessageSquare, label: t('discussions'), path: '/discussions' },
    { icon: Dumbbell, label: 'النمط الرياضي - Sport Mode', path: '/fitness' },
    { icon: ShoppingBag, label: t('market'), path: '/market' },
    { icon: Gamepad2, label: 'استراحة أستاذ', path: '/game' },
    { icon: Bell, label: t('notifications'), path: '/notifications', badge: unreadCount },
    { icon: Bookmark, label: t('saved'), path: '/saved' },
    { icon: Users, label: t('colleagues'), path: '/colleagues' },
    { icon: Users, label: 'المجموعات التربوية', path: '/groups' },
    { icon: User, label: t('profile'), path: profile?.uid ? `/profile/${profile.uid}` : '/profile/loading' },
    { icon: Settings, label: t('settings'), path: '/settings' },
  ];

  const navItems = isAdmin
    ? [...baseNavItems, { icon: Shield, label: 'لوحة التحكم الإدارية (Admin)', path: '/admin' }]
    : baseNavItems;

  return (
    <div className="sticky top-24 space-y-8" onClick={handleSidebarClick}>
      <Link 
        to={profile?.uid ? `/profile/${profile.uid}` : '/profile/loading'}
        className="bg-slate-900/10 backdrop-blur-3xl rounded-3xl p-6 shadow-2xl border border-white/5 overflow-hidden relative block hover:border-primary/50 transition-all group"
      >
        <div className="absolute top-0 left-0 w-full h-20 bg-primary/10"></div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 rounded-2xl bg-slate-800 animate-pulse mb-4 overflow-hidden ring-4 ring-slate-950 shadow-2xl group-hover:scale-105 transition-transform">
            {profile?.photoURL ? (
              <img
                src={profile.photoURL}
                alt={profile.displayName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-700">
                <User className="w-10 h-10" />
              </div>
            )}
          </div>
          <h2 className="text-lg font-black text-white">{profile?.displayName || 'Loading...'}</h2>
          <p className="text-sm font-medium text-slate-500 mb-4">{profile?.subject || 'Education Professional'}</p>
          
          <div className="grid grid-cols-2 w-full gap-4 pt-4 border-t border-slate-800">
            <div className="text-center">
              <p className="text-lg font-black text-white">{profile?.friends?.length || 0}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Friends</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-white">{profile?.followers?.length || 0}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Followers</p>
            </div>
          </div>
        </div>
      </Link>
      
      {/* Soul Medicine Prominent Button */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('show-soul-medicine'))}
        className="w-full relative group overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 p-4 rounded-3xl shadow-xl shadow-emerald-500/20 border border-emerald-400/30 transition-all hover:scale-[1.02] active:scale-95"
      >
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_white_0%,transparent_70%)] opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 group-hover:rotate-12 transition-transform">
            <Heart className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div className="text-right flex-1">
            <h3 className="text-lg font-black text-white font-amiri leading-tight">دواء الروح</h3>
            <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest opacity-80">نور وطمأنينة</p>
          </div>
        </div>
      </button>

      <nav className="space-y-1">
        {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              onClick={() => {
                if (item.path === '/') {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  window.dispatchEvent(new CustomEvent('refresh-home'));
                }
              }}
            className={({ isActive }) => cn(
              "flex items-center justify-between px-6 py-4 rounded-2xl font-bold transition-all group",
              isActive 
                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                : "text-slate-500 hover:bg-slate-900 hover:text-primary"
            )}
          >
            <div className="flex items-center gap-4">
              <item.icon className={cn("w-5 h-5", "transition-transform group-hover:scale-110")} />
              <span>{item.label}</span>
            </div>
            {item.badge && item.badge > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-red-500/20">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}

        {/* Premium Shortcuts removed */}
        
        <button
          onClick={() => {
            if (developer) {
              window.dispatchEvent(new CustomEvent('show-chat', { detail: developer }));
            } else {
              window.dispatchEvent(new CustomEvent('show-chat'));
            }
          }}
          className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-900 hover:text-purple-400 transition-all group"
        >
          <MessageSquare className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span>تواصل مع المطور (Support)</span>
        </button>

        <button
          onClick={async () => {
            if (navigator.share) {
              try {
                await navigator.share({
                  title: 'Teac DZ - Algerian Teachers Network',
                  text: 'Join the professional network for Algerian teachers and use AI tools for lesson planning.',
                  url: window.location.origin,
                });
              } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                  console.log('Share canceled by user');
                } else {
                  console.error('Error sharing:', error);
                  // Fallback to clipboard if share fails for other reasons
                  navigator.clipboard.writeText(window.location.origin);
                }
              }
            } else {
              navigator.clipboard.writeText(window.location.origin);
              // Instead of alert, we could use a toast or just a console log
              console.log('App link copied to clipboard!');
            }
          }}
          className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-900 hover:text-purple-400 transition-all group"
        >
          <Share2 className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span>Share App - مشاركة التطبيق</span>
        </button>

        <button
          onClick={async () => {
            try {
              await signOut(auth);
              toast.success("تم تسجيل الخروج بنجاح");
            } catch (err) {
              console.error("Logout error:", err);
              toast.error("حدث خطأ أثناء تسجيل الخروج");
            }
          }}
          className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-all group border border-transparent hover:border-red-500/10 cursor-pointer mt-1"
        >
          <LogOut className="w-5 h-5 transition-transform group-hover:scale-110 text-red-400" />
          <span>تسجيل الخروج</span>
        </button>

      </nav>

      <div className="bg-slate-900/20 backdrop-blur-3xl rounded-3xl p-6 shadow-2xl border border-slate-800/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary/10 p-2 rounded-xl">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-black text-slate-100 text-sm">Colleagues Status</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Real-time</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {colleagues.map((colleague) => (
            <div 
              key={colleague.uid} 
              onClick={() => window.dispatchEvent(new CustomEvent('show-chat', { detail: colleague }))}
              className="flex items-center justify-between group cursor-pointer hover:bg-slate-800/50 p-2 rounded-xl transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img 
                    src={colleague.photoURL} 
                    alt={colleague.displayName} 
                    className="w-8 h-8 rounded-lg object-cover border border-slate-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className={cn(
                    "absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-slate-900",
                    isOnline(colleague.lastSeen) ? "bg-green-500 animate-pulse" : "bg-red-500"
                  )}></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-primary transition-colors truncate max-w-[100px]">
                    {colleague.displayName}
                  </span>
                  <span className="text-[9px] font-medium text-slate-500">
                    {colleague.subject || 'Teacher'}
                  </span>
                </div>
              </div>
              <div className="p-1.5 text-slate-500 group-hover:text-primary transition-all">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}

          {colleagues.length === 0 && (
            <p className="text-center text-[10px] font-bold text-slate-600 py-4">No colleagues found</p>
          )}

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Teachers</span>
            <span className="text-xs font-black text-white bg-slate-800 px-2 py-0.5 rounded-lg">{totalUsers}</span>
          </div>
        </div>

        <Link to="/colleagues" className="w-full mt-6 py-3 bg-slate-950 border border-slate-800 hover:border-primary/50 text-slate-300 hover:text-primary font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 group">
          <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
          عرض كل الزملاء (All Colleagues)
        </Link>
      </div>

    </div>
  );
}

export default memo(Sidebar);
