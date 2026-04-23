import React, { memo } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Bell, MessageSquare, User, Sparkles, Image, Menu, Car, ShoppingBag } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUnreadMessages } from '../hooks/useUnreadMessages';

function BottomNav() {
  const { profile } = useAuth();
  const unreadMessagesCount = useUnreadMessages();

  const navItems = [
    { icon: Home, label: 'Home', path: '/', external: false },
    { icon: Bell, label: 'Alerts', path: '/notifications', external: false },
    { icon: ShoppingBag, label: 'Market', path: '/market', external: false },
    { icon: User, label: 'Profile', path: `/profile/${profile?.uid}`, external: false },
    { icon: Menu, label: 'Menu', path: '#', external: false, onClick: (e: any) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('toggle-sidebar')); } },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] px-3 pb-4 pointer-events-none">
      <div className="bg-slate-900 border border-white/5 rounded-2xl flex items-center justify-around shadow-2xl shadow-black/80 max-w-sm mx-auto pointer-events-auto">
        {navItems.map((item) => (
          item.external ? (
            <a
              key={item.label}
              href={item.path}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex flex-col items-center gap-1 p-3 transition-colors text-slate-400 active:bg-white/5"
            >
              <item.icon className="w-6 h-6" />
            </a>
          ) : item.path === '#' ? (
            <button
              key={item.label}
              onClick={item.onClick}
              className="flex-1 flex flex-col items-center gap-1 p-3 relative text-slate-400 active:bg-white/5 transition-colors"
            >
              <item.icon className="w-6 h-6" />
              {item.label === 'Menu' && (
                <span className="absolute top-3 right-1/3 w-2 h-2 bg-purple-500 rounded-full"></span>
              )}
            </button>
          ) : (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 p-3 transition-colors active:bg-white/5 relative ${
                  isActive ? 'text-purple-400' : 'text-slate-400'
                }`
              }
            >
              <item.icon className="w-6 h-6" />
            </NavLink>
          )
        ))}
      </div>
    </div>
  );
}

export default memo(BottomNav);
