import { NavLink } from 'react-router-dom';
import { Home, Bell, MessageSquare, User, Sparkles, Image, Menu, Car, ShoppingBag } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUnreadMessages } from '../hooks/useUnreadMessages';

export default function BottomNav() {
  const { profile } = useAuth();
  const unreadMessagesCount = useUnreadMessages();

  const navItems = [
    { icon: Home, label: 'Home', path: '/', external: false },
    { icon: Bell, label: 'Alerts', path: '/notifications', external: false },
    { icon: Image, label: 'Upload', path: '/image-uploader', external: false },
    { icon: ShoppingBag, label: 'Market', path: '/market', external: false },
    { icon: User, label: 'Profile', path: `/profile/${profile?.uid}`, external: false },
    { icon: Menu, label: 'Menu', path: '#', external: false, onClick: (e: any) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('toggle-sidebar')); } },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] px-2 pb-5 select-none">
      <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-1.5 flex items-center justify-around shadow-2xl shadow-black/90 ring-1 ring-white/10 max-w-sm mx-auto">
        {navItems.map((item) => (
          item.external ? (
            <a
              key={item.label}
              href={item.path}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 p-3 rounded-2xl transition-all active:scale-90 text-slate-400 hover:text-slate-200"
            >
              <item.icon className="w-6 h-6" />
            </a>
          ) : item.path === '#' ? (
            <button
              key={item.label}
              onClick={item.onClick}
              className="flex flex-col items-center gap-1 p-2.5 relative text-slate-400 hover:text-purple-400 transition-all active:scale-75"
            >
              <item.icon className="w-5.5 h-5.5" />
              {item.label === 'Menu' && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
              )}
            </button>
          ) : (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 p-3 rounded-2xl transition-all active:scale-90 ${
                  isActive ? 'text-purple-500 bg-purple-500/10' : 'text-slate-400 hover:text-slate-200'
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
