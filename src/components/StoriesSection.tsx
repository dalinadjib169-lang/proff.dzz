import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Story } from '../types';
import { useAuth } from '../hooks/useAuth';
import { Plus, Heart, Sparkles } from 'lucide-react';
import { StoryCreator } from './StoryCreator';
import { StoryViewer } from './StoryViewer';
import { motion, AnimatePresence } from 'motion/react';

interface UserStories {
  userId: string;
  userName: string;
  userPhoto: string;
  stories: Story[];
  hasUnseen: boolean;
}

import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export const StoriesSection: React.FC = () => {
  const { profile } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<UserStories | null>(null);

  useEffect(() => {
    if (!profile) return;
    const now = Timestamp.now();
    const q = query(
      collection(db, 'stories'),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const storyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Story[];
      setStories(storyData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'stories');
    });
  }, [profile]);

  // Group stories by user
  const userStories: UserStories[] = Array.from(
    stories.reduce((acc, s) => {
      if (!acc.has(s.userId)) {
        acc.set(s.userId, {
          userId: s.userId,
          userName: s.userDisplayName,
          userPhoto: s.userPhotoURL,
          stories: [],
          hasUnseen: false
        });
      }
      const userGroup = acc.get(s.userId)!;
      userGroup.stories.push(s);
      // Sort stories for this user by creation date
      userGroup.stories.sort((a, b) => {
        const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
        const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
        return timeA - timeB;
      });
      if (!s.seenBy?.includes(profile?.uid || '')) {
        userGroup.hasUnseen = true;
      }
      return acc;
    }, new Map<string, UserStories>())
  ).map(([, value]) => value);

  // Put current user at the beginning if they have stories
  const me = userStories.find(us => us.userId === profile?.uid);
  const others = userStories.filter(us => us.userId !== profile?.uid);
  const sortedUserStories = me ? [me, ...others] : others;

  return (
    <div className="relative mb-8 pt-2">
      <div className="flex px-4 overflow-x-auto no-scrollbar gap-4 items-center">
        {/* Add Story Button */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <button 
            onClick={() => setIsCreatorOpen(true)}
            className="w-16 h-16 rounded-3xl bg-slate-900 border-2 border-dashed border-emerald-500/30 flex items-center justify-center relative group transition-all hover:border-emerald-500 active:scale-90"
          >
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
              <Plus className="w-6 h-6" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-xl border-4 border-slate-950 flex items-center justify-center">
               <Heart className="w-2 h-2 text-white fill-white" />
            </div>
          </button>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">إضافة دواء</span>
        </div>

        {/* User Story Circles */}
        {sortedUserStories.map((us) => (
          <div key={us.userId} className="flex flex-col items-center gap-2 shrink-0">
            <button 
              onClick={() => setViewingUser(us)}
              className={`w-16 h-16 rounded-3xl p-[3px] transition-all active:scale-90 relative group ${
                us.hasUnseen 
                  ? 'animate-neon-orbit' 
                  : 'bg-slate-800'
              }`}
            >
              {/* Neon Glow Layer */}
              {us.hasUnseen && (
                <div className="absolute inset-0 rounded-3xl opacity-80 blur-[6px] bg-gradient-to-tr from-emerald-400 via-teal-300 to-indigo-500 animate-pulse" />
              )}
              
              <div className="w-full h-full rounded-[1.25rem] bg-slate-950 p-[2px] overflow-hidden relative z-10">
                 <img src={us.userPhoto} className="w-full h-full object-cover rounded-[1.1rem] group-hover:scale-110 transition-transform duration-500" alt="" />
              </div>
              {us.hasUnseen && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-slate-950 flex items-center justify-center z-20 shadow-[0_0_15px_rgba(16,185,129,0.6)]">
                  <Sparkles className="w-2.5 h-2.5 text-white animate-pulse" />
                </div>
              )}
            </button>
            <span className="text-[10px] font-black text-white/70 uppercase truncate max-w-[64px] font-amiri tracking-wider group-hover:text-emerald-400 transition-colors">
               {us.userId === profile?.uid ? 'قصتك' : us.userName.split(' ')[0]}
            </span>
          </div>
        ))}

        {userStories.length === 0 && (
           <div className="ml-4 flex items-center gap-3 py-4 opacity-30 select-none">
              <div className="w-px h-8 bg-white/10" />
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] whitespace-nowrap">
                لا توجد أدوية للروح حالياً... كن أول من ينشر النور
              </p>
           </div>
        )}
      </div>

      <StoryCreator 
        isOpen={isCreatorOpen} 
        onClose={() => setIsCreatorOpen(false)} 
      />

      {viewingUser && (
        <StoryViewer 
          stories={viewingUser.stories}
          isOpen={!!viewingUser}
          onClose={() => setViewingUser(null)}
        />
      )}
    </div>
  );
};
