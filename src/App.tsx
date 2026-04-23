/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import PremiumTools from './pages/PremiumTools';
import Market from './pages/Market';
import CloudinaryUploader from './components/CloudinaryUploader';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import ChatBubble from './components/ChatBubble';
import FriendSuggestions from './components/FriendSuggestions';
import CompleteProfile from './components/CompleteProfile';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GraduationCap, LogOut, AlertCircle, Lock, Unlock, ChevronRight, ChevronLeft } from 'lucide-react';
import { auth } from './firebase';
import { signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';

import { UploadProvider } from './hooks/useUpload';

export default function App() {
  const { user, profile, loading, error, retry } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setIsSidebarOpen(prev => !prev);
    window.addEventListener('toggle-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-sidebar', handleToggle);
  }, []);

  useEffect(() => {
    if (profile?.settings) {
      const { theme, fontSize, fontType, language } = profile.settings;
      
      // Theme
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // Font Size
      const sizeMap = { small: '14px', medium: '16px', large: '18px' };
      document.documentElement.style.fontSize = sizeMap[fontSize as keyof typeof sizeMap] || '16px';

      // Font Type
      const fontMap = { 
        sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif', 
        serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif', 
        mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' 
      };
      document.body.style.fontFamily = fontMap[fontType as keyof typeof fontMap] || fontMap.sans;

      // Language (RTL for Arabic)
      if (language === 'ar') {
        document.documentElement.dir = 'rtl';
        document.documentElement.lang = 'ar';
      } else {
        document.documentElement.dir = 'ltr';
        document.documentElement.lang = language || 'en';
      }
    }
  }, [profile?.settings]);

  return (
    <ErrorBoundary>
      <UploadProvider>
        <Router>
          <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500/30 relative">
            {profile?.appBackground && (
              <div 
                className="fixed inset-0 z-0 bg-cover bg-center opacity-20 pointer-events-none"
                style={{ backgroundImage: `url(${profile.appBackground})` }}
              />
            )}
            <div className="relative z-10">
              {loading ? (
              <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-8">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full animate-pulse"></div>
                  <div className="relative animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
                </div>
                <h2 className="text-xl font-black text-white mb-2 animate-pulse">Connecting to Teac DZ...</h2>
                <p className="text-slate-500 text-sm max-w-xs text-center">
                  If this takes more than 10 seconds, please check your internet connection or refresh the page.
                </p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-8 px-6 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-xl transition-all border border-slate-800"
                >
                  Refresh Page
                </button>
              </div>
            ) : user && !profile ? (
              <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-8 text-center">
                <div className="animate-bounce mb-6">
                  <GraduationCap className="w-16 h-16 text-purple-500" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">Setting up your profile...</h2>
                <p className="text-slate-400 max-w-md mb-6">We're preparing your teacher dashboard. This should only take a moment.</p>
                
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl mb-8 flex items-center gap-3 max-w-md mx-auto">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-sm text-red-400 text-left">{error}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button 
                    onClick={retry}
                    className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20"
                  >
                    Retry Setup
                  </button>
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all"
                  >
                    Refresh Page
                  </button>
                  <button 
                    onClick={() => signOut(auth)}
                    className="px-6 py-3 bg-slate-800/50 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Profile completion is now optional, users can edit it from their profile page anytime */}
                {user && <Navbar />}
                {user && <BottomNav />}
                
                {/* Mobile Sidebar Toggle - Disconnected to free screen space */}
                {/* {user && (
                  <div className="lg:hidden fixed left-0 top-1/2 -translate-y-1/2 z-[60]">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                      className="bg-purple-600 text-white p-3 rounded-r-2xl shadow-lg shadow-purple-500/20 border-y border-r border-purple-400/30 flex items-center gap-1"
                    >
                      {isSidebarOpen ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                      <ChevronRight className={`w-4 h-4 transition-transform ${isSidebarOpen ? 'rotate-180' : ''}`} />
                    </motion.button>
                  </div>
                )} */}

                {/* Mobile Sidebar Overlay */}
                <AnimatePresence>
                  {user && isSidebarOpen && (
                    <motion.div
                      key="sidebar-overlay"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsSidebarOpen(false)}
                      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[70] lg:hidden"
                    />
                  )}
                  {user && isSidebarOpen && (
                    <motion.div
                      key="sidebar-panel"
                      initial={{ x: '-100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: '-100%' }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      className="fixed left-0 top-0 bottom-0 w-[280px] bg-slate-950 z-[80] lg:hidden overflow-y-auto p-6 border-r border-slate-800"
                    >
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-8 h-8 text-purple-500" />
                          <span className="text-xl font-black text-white">Teac DZ</span>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-900 rounded-xl text-slate-400">
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                      </div>
                      <Sidebar />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 lg:pb-8">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8">
                    {user && (
                      <div className="hidden lg:block lg:col-span-3">
                        <Sidebar />
                      </div>
                    )}
                    <main className={user ? "lg:col-span-9 xl:col-span-6" : "col-span-12"}>
                      <Routes>
                        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
                        <Route path="/" element={user ? <Home /> : <Navigate to="/login" />} />
                        <Route path="/profile/:uid" element={user ? <Profile /> : <Navigate to="/login" />} />
                        <Route path="/notifications" element={user ? <Notifications /> : <Navigate to="/login" />} />
                        <Route path="/discussions" element={user ? <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 text-center"><h2 className="text-2xl font-black mb-4">Discussions</h2><p className="text-slate-400">Coming soon...</p></div> : <Navigate to="/login" />} />
                        <Route path="/saved" element={user ? <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 text-center"><h2 className="text-2xl font-black mb-4">Saved Resources</h2><p className="text-slate-400">Coming soon...</p></div> : <Navigate to="/login" />} />
                        <Route path="/colleagues" element={user ? <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 text-center"><h2 className="text-2xl font-black mb-4">Colleagues</h2><p className="text-slate-400">Coming soon...</p></div> : <Navigate to="/login" />} />
                        <Route path="/curriculum" element={user ? <div className="p-8 bg-slate-900 rounded-3xl border border-slate-800 text-center"><h2 className="text-2xl font-black mb-4">Curriculum</h2><p className="text-slate-400">Coming soon...</p></div> : <Navigate to="/login" />} />
                        <Route path="/premium-tools" element={(user || window.location.search.includes('mode=guest')) ? <PremiumTools /> : <Navigate to="/login" />} />
                        <Route path="/market" element={user ? <Market /> : <Navigate to="/login" />} />
                        <Route path="/image-uploader" element={user ? <CloudinaryUploader /> : <Navigate to="/login" />} />
                        <Route path="/settings" element={user ? <Settings /> : <Navigate to="/login" />} />
                        <Route path="*" element={<Navigate to="/" />} />
                      </Routes>
                    </main>
                    {user && (
                      <div className="hidden xl:block xl:col-span-3">
                        <div className="sticky top-24 space-y-6">
                          <FriendSuggestions />
                          <div className="bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-800">
                            <h3 className="font-black text-slate-100 mb-4 flex items-center gap-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                              Trending Topics
                            </h3>
                            <div className="space-y-3">
                              {['#AlgerianTeachers', '#Bac2026', '#EducationDZ', '#TechInClass'].map(tag => (
                                <div key={tag} className="text-sm font-bold text-slate-400 hover:text-purple-400 cursor-pointer transition-colors">
                                  {tag}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {user && <ChatBubble />}
              </>
            )}
            </div>
          </div>
        </Router>
      </UploadProvider>
    </ErrorBoundary>
  );
}

