import React, { memo } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Home, Bell, MessageSquare, User, Sparkles, Image, Menu, Car, ShoppingBag, Wand2, Zap, Users } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUnreadMessages } from '../hooks/useUnreadMessages';

interface BottomNavProps {
  onToggleSidebar?: () => void;
}

function BottomNav({ onToggleSidebar }: BottomNavProps) {
  const { profile } = useAuth();
  const unreadMessagesCount = useUnreadMessages();

  const navItems = [
    { icon: Home, label: 'Home', path: '/', external: false },
    { icon: Wand2, label: 'Generator', path: 'https://pro-mat-1243.vercel.app/', external: true },
    { icon: ShoppingBag, label: 'Market', path: '/market', external: false },
    { icon: Zap, label: 'Corrector', path: 'https://mosa7i7-ai.vercel.app/', external: true },
    { icon: Menu, label: 'Menu', path: '#', external: false, onClick: (e: any) => { e.preventDefault(); onToggleSidebar?.(); } },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[110] flex justify-center pb-4 px-3 pointer-events-auto select-none">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-around shadow-2xl shadow-black/80 w-full max-w-sm overflow-hidden px-1">
        {navItems.map((item) => (
          item.external ? (
            <a
              key={item.label}
              href={item.path}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex flex-col items-center gap-1 py-3 px-1.5 transition-all relative group"
            >
              <div className={cn(
                "p-1.5 rounded-xl shadow-lg transition-transform group-hover:scale-110 group-active:scale-95 animate-pulse",
                (item.label === 'Generator' || item.label === 'Corrector') ? "bg-amber-500 shadow-amber-500/20" : "bg-blue-500 shadow-blue-500/20"
              )}>
                <item.icon className={cn("w-5 h-5", (item.label === 'Generator' || item.label === 'Corrector') ? "text-slate-900" : "text-white")} />
              </div>
              <span className={cn(
                "absolute top-2 right-1/4 w-1.5 h-1.5 rounded-full animate-bounce",
                (item.label === 'Generator' || item.label === 'Corrector') ? "bg-primary" : "bg-blue-400"
              )}></span>
            </a>
          ) : item.path === '#' ? (
            <button
              key={item.label}
              onClick={item.onClick}
              className="flex-1 flex flex-col items-center gap-1 py-3 px-1.5 relative text-slate-400 active:bg-white/5 transition-all hover:text-primary cursor-pointer"
            >
              <item.icon className="w-5 h-5" />
              {item.label === 'Menu' && (
                <span className="absolute top-3.5 right-1/3 w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
              )}
            </button>
          ) : (
            <NavLink
              key={item.label}
              to={item.path}
              onClick={() => {
                if (item.path === '/') window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-3 px-1.5 transition-all active:bg-white/5 relative ${
                  isActive ? 'text-primary' : 'text-slate-400 hover:text-primary-accent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {item.label === 'Profile' && profile?.photoURL ? (
                    <div className={`w-6 h-6 rounded-lg overflow-hidden border-2 transition-all ${isActive ? 'border-primary scale-110 shadow-lg shadow-primary/20' : 'border-slate-700 opacity-70'}`}>
                      <img src={profile.photoURL} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                    </div>
                  ) : (
                    <item.icon className="w-5 h-5" />
                  )}
                </>
              )}
            </NavLink>
          )
        ))}
      </div>
    </div>
  );
}

export default memo(BottomNav);
