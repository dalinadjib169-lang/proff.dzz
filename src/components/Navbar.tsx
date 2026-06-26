import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  GraduationCap, 
  Bell, 
  Search, 
  User as UserIcon, 
  MessageSquare, 
  Mail, 
  ArrowLeft, 
  ArrowRight,
  LogOut
} from 'lucide-react';
import { useUnreadMessages } from '../hooks/useUnreadMessages';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

function Navbar() {
  const { profile } = useAuth();
  const unreadMessagesCount = useUnreadMessages();

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
      <nav className="sticky top-0 z-50 bg-slate-950/10 backdrop-blur-3xl border-b border-white/5 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4 sm:gap-6">
              <Link to="/" className="flex items-center gap-2.5 group shrink-0">
                <div className="w-9 h-9 rounded-xl overflow-hidden ring-2 ring-primary/20 group-hover:ring-primary/40 group-hover:scale-105 transition-all shadow-lg bg-slate-900 border border-slate-850/50 shrink-0 flex items-center justify-center">
                  <img src="/prof_dali_logo.png" className="w-full h-full object-cover" alt="TeachDZ" />
                </div>
                <span className="text-lg sm:text-xl font-black bg-gradient-to-r from-white via-purple-300 to-indigo-300 bg-clip-text text-transparent tracking-tight drop-shadow-[0_0_12px_rgba(168,85,247,0.8)] filter">TeachDZ</span>
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

            <div className="flex items-center gap-4">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('show-chat'))}
                className="p-2.5 text-slate-400 hover:text-primary hover:bg-primary/10 bg-slate-900 rounded-xl transition-all relative border border-slate-800 md:hidden"
                title="Show Chat"
              >
                <MessageSquare className="w-5 h-5" />
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

              <Link to="/notifications" className="p-2.5 text-slate-400 hover:text-primary hover:bg-primary/10 bg-slate-900 rounded-xl transition-all relative border border-slate-800">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-slate-950"></span>
              </Link>
              
              <div className="h-8 w-px bg-slate-800 mx-1"></div>

              <Link 
                to={profile?.uid ? `/profile/${profile.uid}` : '/profile/loading'} 
                className="flex items-center gap-3 p-1.5 pr-4 hover:bg-slate-900 rounded-2xl transition-all group border border-transparent hover:border-slate-800"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-800 overflow-hidden ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all animate-fade-in">
                  {profile?.photoURL ? (
                    <img
                      src={profile.photoURL}
                      alt={profile.displayName || ''}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700">
                      <UserIcon className="w-5 h-5" />
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
                className="p-2.5 text-red-400 hover:text-red-500 hover:bg-red-500/10 bg-slate-900 rounded-xl transition-all border border-slate-800 flex items-center justify-center gap-1.5 cursor-pointer"
                title="تسجيل الخروج"
                id="navbar-logout-btn"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden xs:inline text-xs font-black">خروج</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

export default memo(Navbar);
