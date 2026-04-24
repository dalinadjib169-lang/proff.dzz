import React, { useState, useEffect, memo } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Home, User, Bell, Bookmark, Settings, Users, BookOpen, MessageSquare, TrendingUp, UserPlus, Sparkles, Wand2, CheckSquare, FileText, Image, Share2, ExternalLink, Zap, Car, ShoppingBag } from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { UserProfile } from '../types';
import { playSound } from '../lib/sounds';

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
    });

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', profile.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.size > unreadCount) {
        playSound('notification');
      }
      setUnreadCount(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    // Fetch total registered users and colleagues (sorted by recent)
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(40));
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
  }, [profile, unreadCount]);

  const isOnline = (lastSeen: any) => {
    if (!lastSeen || typeof lastSeen.toDate !== 'function') return false;
    const date = lastSeen.toDate();
    const now = new Date();
    return (now.getTime() - date.getTime()) < 300000; // 5 minutes
  };

  const isPremium = (profile?.email === 'dalinadjib1990@gmail.com') || (profile?.premiumUntil ? profile.premiumUntil.toDate() > new Date() : false);

  const navItems = [
    { icon: Home, label: t('home'), path: '/' },
    { icon: MessageSquare, label: t('discussions'), path: '/discussions' },
    { icon: ShoppingBag, label: t('market'), path: '/market' },
    { icon: Bell, label: t('notifications'), path: '/notifications', badge: unreadCount },
    { icon: Bookmark, label: t('saved'), path: '/saved' },
    { icon: CheckSquare, label: 'المصحح الذكي - Mosa7i7', path: 'https://mosa7i7-ai.vercel.app/', external: true },
    { icon: Car, label: 'سوق السيارات بالجزائر', path: 'https://market-dz-two.vercel.app/', external: true },
    { icon: Users, label: t('colleagues'), path: '/colleagues' },
    { icon: BookOpen, label: t('curriculum'), path: '/curriculum' },
    { icon: Sparkles, label: t('premium_tools'), path: '/premium-tools' },
    { icon: Image, label: 'Image Uploader', path: '/image-uploader' },
    { icon: User, label: t('profile'), path: profile?.uid ? `/profile/${profile.uid}` : '/profile/loading' },
    { icon: Settings, label: t('settings'), path: '/settings' },
  ];

  return (
    <div className="sticky top-24 space-y-8">
      <Link 
        to={profile?.uid ? `/profile/${profile.uid}` : '/profile/loading'}
        className="bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-800 overflow-hidden relative block hover:border-primary/50 transition-all group"
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
              <p className="text-lg font-black text-white">12</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-white">{profile?.followers?.length || 0}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Followers</p>
            </div>
          </div>
        </div>
      </Link>

      <nav className="space-y-1">
        {navItems.map((item) => (
          item.external ? (
            <a
              key={item.path}
              href={item.path}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-6 py-4 rounded-2xl font-bold transition-all group text-slate-500 hover:bg-slate-900 hover:text-primary"
            >
              <div className="flex items-center gap-4">
                <item.icon className={cn("w-5 h-5", "transition-transform group-hover:scale-110", item.label.includes('Mosa7i7') && "text-emerald-400")} />
                <span className={cn(item.label.includes('Mosa7i7') && "text-emerald-400 font-black")}>{item.label}</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all" />
            </a>
          ) : (
            <NavLink
              key={item.path}
              to={item.path}
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
        )))}

        {/* Premium Shortcuts - Consolidated to internal tools to enforce limits */}
        {isPremium && (
          <div className="py-2 space-y-1 mt-4 border-t border-slate-800/50">
            <p className="px-6 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Premium Assistant</p>
            <NavLink 
              to="/premium-tools" 
              className={({ isActive }) => cn(
                "flex items-center gap-4 px-6 py-3 rounded-2xl font-bold transition-all group",
                isActive ? "bg-purple-600/20 text-purple-400" : "text-slate-400 hover:bg-purple-600/10 hover:text-purple-400"
              )}
            >
              <Wand2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm">مولد المذكرات</span>
            </NavLink>
            <NavLink 
              to="/premium-tools" 
              className={({ isActive }) => cn(
                "flex items-center gap-4 px-6 py-3 rounded-2xl font-bold transition-all group",
                isActive ? "bg-purple-600/20 text-purple-400" : "text-slate-400 hover:bg-purple-600/10 hover:text-purple-400"
              )}
            >
              <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm">مولد فروض واختبارات</span>
            </NavLink>
            <NavLink 
              to="/premium-tools" 
              className={({ isActive }) => cn(
                "flex items-center gap-4 px-6 py-3 rounded-2xl font-bold transition-all group",
                isActive ? "bg-purple-600/20 text-purple-400" : "text-slate-400 hover:bg-purple-600/10 hover:text-purple-400"
              )}
            >
              <CheckSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm">المصحح الذكي</span>
            </NavLink>
          </div>
        )}
        
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
          onClick={() => window.dispatchEvent(new CustomEvent('show-chat'))}
          className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-900 hover:text-purple-400 transition-all group"
        >
          <MessageSquare className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span>Show Chat Bubble</span>
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

      </nav>

      <div className="bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-800">
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

        <button className="w-full mt-6 py-3 bg-slate-950 border border-slate-800 hover:border-primary/50 text-slate-300 hover:text-primary font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 group">
          <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
          Invite Colleague
        </button>
      </div>

      <div className="bg-primary rounded-3xl p-6 text-white overflow-hidden relative group border border-primary-dark/50">
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary-dark rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>
        <h4 className="font-black text-lg mb-2 relative z-10">Premium Teac</h4>
        <p className="text-primary-accent text-xs font-medium mb-4 relative z-10">Get access to exclusive teaching materials and AI tools.</p>
        <Link 
          to="/premium-tools"
          className="w-full py-2.5 bg-white text-primary font-black rounded-xl text-sm hover:bg-slate-50 transition-colors relative z-10 block text-center"
        >
          {profile?.premiumUntil && profile.premiumUntil.toDate() > new Date() ? 'Go to Tools' : 'Upgrade Now'}
        </Link>
      </div>
    </div>
  );
}

export default memo(Sidebar);
