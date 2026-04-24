import React, { useState, useEffect } from 'react';
import { Bookmark, Search, Trash2, ExternalLink, Filter, FolderPlus, Clock, FileText, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Post } from '../types';
import PostCard from '../components/PostCard';

export default function Saved() {
  const { profile } = useAuth();
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // In a real app, we'd fetch from a 'saved' collection or similar.
  // For now, we'll simulate by fetching some posts or showing a placeholder state.
  useEffect(() => {
    if (!profile?.uid) return;
    
    // Simulate fetching saved posts
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [profile]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl min-h-[60vh] flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-rose-600/10 p-3 rounded-2xl">
              <Bookmark className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">المحفوظات - Saved</h2>
              <p className="text-sm text-slate-500 font-medium">Your private archive of useful resources</p>
            </div>
          </div>
          <div className="flex gap-2">
             <button className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-500 hover:text-white transition-all">
               <FolderPlus className="w-5 h-5" />
             </button>
             <button className="p-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-500 hover:text-white transition-all">
               <Filter className="w-5 h-5" />
             </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-500"></div>
          </div>
        ) : savedPosts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
             <div className="bg-slate-950 w-24 h-24 rounded-3xl border border-slate-800 flex items-center justify-center mb-6">
               <Bookmark className="w-12 h-12 text-slate-700" />
             </div>
             <h3 className="text-xl font-black text-white mb-2">No saved items yet</h3>
             <p className="text-slate-500 max-w-sm mb-8 font-medium">Items you bookmark will appear here for easy access later.</p>
             <div className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800/50 w-full max-w-md">
               <div className="flex items-center gap-3 text-left">
                 <div className="bg-blue-600/10 p-2 rounded-xl">
                   <Clock className="w-4 h-4 text-blue-500" />
                 </div>
                 <div>
                   <p className="text-xs font-black text-white uppercase tracking-widest">Recent Activity</p>
                   <p className="text-[10px] font-bold text-slate-500 mt-0.5">Start exploring and saving useful posts!</p>
                 </div>
               </div>
             </div>
          </div>
        ) : (
          <div className="space-y-6">
            {savedPosts.map(post => <PostCard key={post.id} post={post} />)}
          </div>
        )}

        <div className="mt-auto pt-8 flex items-center justify-center gap-8 grayscale opacity-50">
          <div className="flex flex-col items-center gap-1">
             <div className="bg-slate-800 p-2 rounded-xl"><FileText className="w-4 h-4" /></div>
             <span className="text-[8px] font-black uppercase text-slate-500">Documents</span>
          </div>
          <div className="flex flex-col items-center gap-1">
             <div className="bg-slate-800 p-2 rounded-xl"><ImageIcon className="w-4 h-4" /></div>
             <span className="text-[8px] font-black uppercase text-slate-500">Images</span>
          </div>
          <div className="flex flex-col items-center gap-1">
             <div className="bg-slate-800 p-2 rounded-xl"><ExternalLink className="w-4 h-4" /></div>
             <span className="text-[8px] font-black uppercase text-slate-500">Links</span>
          </div>
        </div>
      </div>
    </div>
  );
}
