import React, { memo } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';
import {
  Home,
  Bell,
  MessageSquare,
  Menu,
  FileText,
  ClipboardCheck,
  Presentation,
  Sparkles,
} from 'lucide-react';
import { useUnreadMessages } from '../hooks/useUnreadMessages';

const ADDON_ITEMS = [
  {
    path: '/memo-generator-1',
    shortLabel: 'مذكرات 1',
    fullLabel: 'مولد مذكرات 1',
    icon: FileText,
    gradient: 'from-indigo-500 to-purple-600',
    glow: 'shadow-indigo-500/40',
    activeRing: 'ring-indigo-400',
    badgeText: '1',
  },
  {
    path: '/memo-generator-2',
    shortLabel: 'مذكرات 2',
    fullLabel: 'مولد مذكرات 2',
    icon: ClipboardCheck,
    gradient: 'from-amber-500 to-orange-600',
    glow: 'shadow-amber-500/40',
    activeRing: 'ring-amber-400',
    badgeText: '2',
  },
  {
    path: '/whiteboard',
    shortLabel: 'السبورة',
    fullLabel: 'السبورة الاحترافية',
    icon: Presentation,
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'shadow-emerald-500/40',
    activeRing: 'ring-emerald-400',
    badgeText: null,
  },
];

function BottomNav() {
  const unreadMessagesCount = useUnreadMessages();

  return (
    <>
      {/* Mobile Bottom Bar with Integrated Eye-Catching Add-ons */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[110] pointer-events-none select-none" dir="rtl">
        <div className="bg-slate-950/90 backdrop-blur-2xl border-t border-white/10 flex items-center justify-around shadow-[0_-10px_40px_rgba(0,0,0,0.65)] w-full pointer-events-auto px-1 py-1.5">
          {/* Home */}
          <NavLink
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className={({ isActive }) =>
              cn(
                'flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition-all',
                isActive ? 'text-primary' : 'text-slate-400 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Home className={cn('w-5 h-5 transition-transform', isActive && 'scale-110')} />
                <span className="text-[9px] font-black whitespace-nowrap">الرئيسية</span>
              </>
            )}
          </NavLink>

          {/* Discussions */}
          <NavLink
            to="/discussions"
            className={({ isActive }) =>
              cn(
                'flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition-all',
                isActive ? 'text-primary' : 'text-slate-400 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <MessageSquare className={cn('w-5 h-5 transition-transform', isActive && 'scale-110')} />
                <span className="text-[9px] font-black whitespace-nowrap">النقاشات</span>
              </>
            )}
          </NavLink>

          {/* Featured Add-ons: Memo 1, Memo 2, Whiteboard */}
          {ADDON_ITEMS.map((addon) => (
            <NavLink
              key={addon.path}
              to={addon.path}
              className="flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 py-0.5 relative group"
            >
              {({ isActive }) => (
                <>
                  <div
                    className={cn(
                      'relative w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg transition-all duration-300',
                      addon.gradient,
                      addon.glow,
                      isActive ? `ring-2 ${addon.activeRing} scale-110 -translate-y-0.5` : 'group-hover:scale-105'
                    )}
                  >
                    <addon.icon className="w-4 h-4 text-white" />
                    {addon.badgeText && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-slate-950 border border-white/30 text-[8px] font-black text-white flex items-center justify-center">
                        {addon.badgeText}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[9px] font-black whitespace-nowrap transition-colors',
                      isActive ? 'text-white' : 'text-slate-300'
                    )}
                  >
                    {addon.shortLabel}
                  </span>
                </>
              )}
            </NavLink>
          ))}

          {/* Notifications */}
          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              cn(
                'flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl relative transition-all',
                isActive ? 'text-primary' : 'text-slate-400 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Bell className={cn('w-5 h-5 transition-transform', isActive && 'scale-110')} />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full animate-pulse border border-slate-950">
                      {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-black whitespace-nowrap">الإشعارات</span>
              </>
            )}
          </NavLink>

          {/* Menu */}
          <button
            onClick={(e) => {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('toggle-sidebar'));
            }}
            className="flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 py-1 relative text-slate-400 hover:text-primary transition-all"
          >
            <div className="relative">
              <Menu className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />
            </div>
            <span className="text-[9px] font-black whitespace-nowrap">القائمة</span>
          </button>
        </div>
      </div>

      {/* Desktop Floating Bottom Add-ons Dock */}
      <div className="hidden lg:flex fixed bottom-4 left-1/2 -translate-x-1/2 z-[110] pointer-events-none select-none" dir="rtl">
        <div className="pointer-events-auto flex items-center gap-2.5 bg-slate-950/90 backdrop-blur-2xl border border-white/15 rounded-2xl px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-1.5 px-2 text-[11px] font-black text-slate-400 border-l border-white/10 ml-1">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="whitespace-nowrap">إضافات الأستاذ</span>
          </div>

          {ADDON_ITEMS.map((addon) => (
            <NavLink
              key={`dock-${addon.path}`}
              to={addon.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 px-3.5 py-2 rounded-xl transition-all duration-300 border whitespace-nowrap shrink-0 group',
                  isActive
                    ? 'bg-white/10 border-white/25 text-white shadow-lg scale-[1.03]'
                    : 'bg-slate-900/70 border-white/5 text-slate-300 hover:bg-white/10 hover:border-white/20 hover:text-white'
                )
              }
            >
              <div
                className={cn(
                  'relative w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-md transition-transform group-hover:scale-110',
                  addon.gradient,
                  addon.glow
                )}
              >
                <addon.icon className="w-4 h-4 text-white" />
                {addon.badgeText && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-slate-950 border border-white/30 text-[8px] font-black text-white flex items-center justify-center">
                    {addon.badgeText}
                  </span>
                )}
              </div>
              <span className="text-xs font-black">{addon.fullLabel}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </>
  );
}

export default memo(BottomNav);
