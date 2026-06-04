import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Search, 
  Users, 
  MessageSquare, 
  Send, 
  Globe, 
  Lock,
  Loader2,
  CheckCircle2,
  GraduationCap
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit, addDoc, serverTimestamp, arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { EducationalGroup, UserProfile, Post } from '../types';
import { cn } from '../lib/utils';
import { playSound } from '../lib/sounds';

interface InternalShareModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
}

export default function InternalShareModal({ post, isOpen, onClose }: InternalShareModalProps) {
  const { profile, user } = useAuth();
  const [tab, setTab] = useState<'colleagues' | 'groups'>('colleagues');
  const [search, setSearch] = useState('');
  const [colleagues, setColleagues] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<EducationalGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharingStatus, setSharingStatus] = useState<Record<string, 'idle' | 'sharing' | 'shared'>>({});

  useEffect(() => {
    if (!isOpen || !profile) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch colleagues
        if (profile.friends && profile.friends.length > 0) {
          const colleagueQuery = query(
            collection(db, 'users'),
            where('uid', 'in', profile.friends.slice(0, 10))
          );
          const colleagueSnap = await getDocs(colleagueQuery);
          setColleagues(colleagueSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
        }

        // Fetch groups where user is a member
        const groupQuery = query(
          collection(db, 'groups'),
          where('members', 'array-contains', profile.uid),
          limit(10)
        );
        const groupSnap = await getDocs(groupQuery);
        setGroups(groupSnap.docs.map(d => ({ id: d.id, ...d.data() } as EducationalGroup)));
      } catch (error) {
        console.error("Error fetching share recipients:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, profile]);

  const handleShareToColleague = async (targetColleague: UserProfile) => {
    if (!profile || !user) return;
    
    setSharingStatus(prev => ({ ...prev, [targetColleague.uid]: 'sharing' }));
    
    try {
      const roomId = [profile.uid, targetColleague.uid].sort().join('_');
      const postUrl = `${window.location.origin}/post/${post.id}`;
      
      await addDoc(collection(db, 'messages'), {
        roomId,
        senderId: profile.uid,
        senderName: profile.displayName,
        participants: [profile.uid, targetColleague.uid],
        text: `شاركت معك منشوراً:\n${postUrl}`,
        createdAt: serverTimestamp(),
        seen: false
      });
      
      playSound('message');
      setSharingStatus(prev => ({ ...prev, [targetColleague.uid]: 'shared' }));
    } catch (error) {
      console.error("Error sharing to colleague:", error);
      setSharingStatus(prev => ({ ...prev, [targetColleague.uid]: 'idle' }));
    }
  };

  const handleShareToGroup = async (targetGroup: EducationalGroup) => {
    if (!profile || !user) return;
    
    setSharingStatus(prev => ({ ...prev, [targetGroup.id]: 'sharing' }));
    
    try {
      await addDoc(collection(db, 'group_posts'), {
        groupId: targetGroup.id,
        authorId: profile.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL,
        content: `شاركت منشوراً:\n${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}`,
        imageUrl: post.imageUrl || null,
        sharedPostId: post.id,
        likes: [],
        commentCount: 0,
        createdAt: serverTimestamp(),
        privacy: targetGroup.privacy === 'public' ? 'public' : 'private'
      });
      
      playSound('comment');
      setSharingStatus(prev => ({ ...prev, [targetGroup.id]: 'shared' }));
    } catch (error) {
      console.error("Error sharing to group:", error);
      setSharingStatus(prev => ({ ...prev, [targetGroup.id]: 'idle' }));
    }
  };

  const filteredColleagues = colleagues.filter(c => 
    c.displayName.toLowerCase().includes(search.toLowerCase()) || 
    c.subject?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden max-h-[80vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-primary rotate-180" />
              مشاركة المنشور داخلياً
            </h2>
            <button 
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Tabs */}
          <div className="p-4 space-y-4 bg-slate-950/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="ابحث عن زميل أو مجموعة..."
                className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-sm font-bold text-white outline-none focus:border-primary transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                dir="rtl"
              />
            </div>
            
            <div className="flex p-1 bg-slate-900 rounded-xl">
              <button 
                onClick={() => setTab('colleagues')}
                className={cn(
                  "flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2",
                  tab === 'colleagues' ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                الزملاء
              </button>
              <button 
                onClick={() => setTab('groups')}
                className={cn(
                  "flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2",
                  tab === 'groups' ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <Users className="w-3.5 h-3.5" />
                المجموعات
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {loading ? (
              <div className="py-10 flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-xs font-bold text-slate-500 animate-pulse">جاري تحميل الوجهات...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tab === 'colleagues' ? (
                  <>
                    {filteredColleagues.length > 0 ? (
                      filteredColleagues.map(colleague => (
                        <div key={colleague.uid} className="flex items-center justify-between p-3 bg-slate-950/30 hover:bg-slate-800/50 rounded-2xl border border-slate-800/20 group transition-all">
                          <div className="flex items-center gap-3">
                            <img src={colleague.photoURL} className="w-10 h-10 rounded-xl object-cover" alt="" />
                            <div>
                               <h4 className="text-sm font-bold text-white">{colleague.displayName}</h4>
                               <p className="text-[10px] text-slate-500 font-bold">{colleague.subject || 'زميل'}</p>
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => handleShareToColleague(colleague)}
                            disabled={sharingStatus[colleague.uid] === 'shared' || sharingStatus[colleague.uid] === 'sharing'}
                            className={cn(
                              "px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2",
                              sharingStatus[colleague.uid] === 'shared' 
                                ? "bg-green-500/20 text-green-500" 
                                : sharingStatus[colleague.uid] === 'sharing'
                                ? "bg-slate-800 text-slate-500"
                                : "bg-primary hover:bg-primary-dark text-white active:scale-95"
                            )}
                          >
                            {sharingStatus[colleague.uid] === 'shared' ? (
                              <> تم الإرسال <CheckCircle2 className="w-3.5 h-3.5" /> </>
                            ) : sharingStatus[colleague.uid] === 'sharing' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <> إرسال </>
                            )}
                          </button>
                        </div>
                      ))
                    ) : (
                      <EmptyState text="لا يوجد زملاء حالياً" icon={<MessageSquare className="w-8 h-8" />} />
                    )}
                  </>
                ) : (
                  <>
                    {filteredGroups.length > 0 ? (
                      filteredGroups.map(group => (
                        <div key={group.id} className="flex items-center justify-between p-3 bg-slate-950/30 hover:bg-slate-800/50 rounded-2xl border border-slate-800/20 group transition-all">
                          <div className="flex items-center gap-3">
                            {group.coverImage ? (
                              <img src={group.coverImage} className="w-10 h-10 rounded-xl object-cover" alt="" />
                            ) : (
                              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                                <Users className="w-5 h-5 text-slate-600" />
                              </div>
                            )}
                            <div>
                               <h4 className="text-sm font-bold text-white">{group.name}</h4>
                               <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                                 {group.privacy === 'public' ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                                 {group.memberCount} عضو
                               </p>
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => handleShareToGroup(group)}
                            disabled={sharingStatus[group.id] === 'shared' || sharingStatus[group.id] === 'sharing'}
                            className={cn(
                              "px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2",
                              sharingStatus[group.id] === 'shared' 
                                ? "bg-green-500/20 text-green-500" 
                                : sharingStatus[group.id] === 'sharing'
                                ? "bg-slate-800 text-slate-500"
                                : "bg-primary hover:bg-primary-dark text-white active:scale-95"
                            )}
                          >
                            {sharingStatus[group.id] === 'shared' ? (
                              <> تم النشر <CheckCircle2 className="w-3.5 h-3.5" /> </>
                            ) : sharingStatus[group.id] === 'sharing' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <> نشر </>
                            )}
                          </button>
                        </div>
                      ))
                    ) : (
                      <EmptyState text="أنت لست منضماً لمجموعات حالياً" icon={<Users className="w-8 h-8" />} />
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="p-4 bg-slate-950/50 border-t border-slate-800 text-center">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              يمكنك مشاركة هذا المنشور مع زملائك أو في مجموعاتك التعليمية
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function EmptyState({ text, icon }: { text: string, icon: React.ReactNode }) {
  return (
    <div className="py-10 flex flex-col items-center justify-center text-slate-600 gap-4 opacity-50">
      {icon}
      <p className="text-xs font-black uppercase">{text}</p>
    </div>
  );
}
