import React, { memo } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Home, Bell, MessageSquare, Menu, ShoppingBag } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUnreadMessages } from '../hooks/useUnreadMessages';

function BottomNav() {
  const { profile } = useAuth();
  const unreadMessagesCount = useUnreadMessages();

  const navItems = [
    { icon: Home, label: 'Home', path: '/', external: false },
    { icon: MessageSquare, label: 'Discussions', path: '/discussions', external: false },
    { icon: Bell, label: 'Notifications', path: '/notifications', external: false, badge: unreadMessagesCount },
    { icon: ShoppingBag, label: 'Market', path: '/market', external: false },
    { icon: Menu, label: 'Menu', path: '#', external: false, onClick: (e: any) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('toggle-sidebar')); } },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[110] pointer-events-none select-none">
      <div className="bg-slate-950/80 backdrop-blur-2xl border-t border-white/10 flex items-center justify-around shadow-[0_-10px_40px_rgba(0,0,0,0.5)] w-full pointer-events-auto overflow-hidden px-2">
        {navItems.map((item) => (
          item.external ? (
            <a
              key={item.label}
              href={item.path}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex flex-col items-center gap-1 p-3 transition-all relative group"
            >
              <div className={cn(
                "p-2 rounded-xl shadow-lg transition-transform group-hover:scale-110 group-active:scale-95 animate-pulse",
                "bg-blue-500 shadow-blue-500/20"
              )}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
            </a>
          ) : item.path === '#' ? (
            <button
              key={item.label}
              onClick={item.onClick}
              className="flex-1 flex flex-col items-center justify-center p-3 relative text-slate-400 active:bg-white/5 transition-all hover:text-primary group"
            >
              <item.icon className="w-6 h-6 group-hover:scale-110 transition-transform" />
              {item.label === 'Menu' && (
                <span className="absolute top-3 right-[30%] w-2 h-2 bg-primary rounded-full"></span>
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
                `flex-1 flex flex-col items-center justify-center p-3 transition-all active:bg-white/5 relative group ${
                  isActive ? 'text-primary' : 'text-slate-400 hover:text-primary-accent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <item.icon className={cn("w-6 h-6 transition-all duration-300", isActive ? "scale-110 text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" : "group-hover:scale-110")} />
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse border border-slate-900">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <span className="absolute bottom-1 w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]"></span>
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
