import { Link } from 'react-router-dom';
import { auth } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { GraduationCap, Bell, Search, LogOut, User as UserIcon, MessageSquare, Mail } from 'lucide-react';
import { useUnreadMessages } from '../hooks/useUnreadMessages';

export default function Navbar() {
  const { profile } = useAuth();
  const unreadMessagesCount = useUnreadMessages();

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-purple-600 p-1.5 rounded-xl group-hover:scale-110 transition-transform shadow-lg shadow-purple-500/20">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-black text-white tracking-tight">Teac DZ</span>
            </Link>

            <div className="hidden md:flex items-center bg-slate-900 rounded-2xl px-4 py-2 w-80 group focus-within:ring-2 focus-within:ring-purple-500/50 transition-all border border-slate-800">
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
              className="p-2.5 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 bg-slate-900 rounded-xl transition-all relative border border-slate-800 md:hidden"
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
              className="hidden md:flex p-2.5 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 bg-slate-900 rounded-xl transition-all relative border border-slate-800"
              title="Messages"
            >
              <Mail className="w-5 h-5" />
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-slate-950 flex items-center justify-center text-[10px] font-black text-white animate-bounce">
                  {unreadMessagesCount}
                </span>
              )}
            </button>

            <Link to="/notifications" className="p-2.5 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 bg-slate-900 rounded-xl transition-all relative border border-slate-800">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full border-2 border-slate-950"></span>
            </Link>
            
            <div className="h-8 w-px bg-slate-800 mx-1"></div>

            <Link to={`/profile/${profile?.uid}`} className="flex items-center gap-3 p-1.5 pr-4 hover:bg-slate-900 rounded-2xl transition-all group border border-transparent hover:border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-slate-800 animate-pulse overflow-hidden ring-2 ring-purple-500/10 group-hover:ring-purple-500/30 transition-all">
                {profile?.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt={profile.displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-700">
                    <UserIcon className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-bold text-white leading-none">{profile?.displayName || 'Loading...'}</p>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-1">Teacher</p>
              </div>
            </Link>

            <button
              onClick={() => auth.signOut()}
              className="p-2.5 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
