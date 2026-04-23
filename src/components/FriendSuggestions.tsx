import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, limit, doc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { UserProfile } from '../types';
import { UserPlus, UserCheck, MapPin, Book, GraduationCap, Clock, Sparkles, ChevronRight, Info, MessageSquare, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { playSound } from '../lib/sounds';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export default function FriendSuggestions() {
  const { profile: loggedInProfile } = useAuth();
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!loggedInProfile?.uid) return;

    // Fetch invitations to filter out existing connections
    const invQuery = query(
      collection(db, 'invitations'),
      where('participants', 'array-contains', loggedInProfile.uid)
    );

    const unsubInv = onSnapshot(invQuery, (snapshot) => {
      setInvitations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'invitations');
    });

    // Fetch all users (increased limit)
    const usersQuery = query(collection(db, 'users'), limit(100));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[];
      
      // Filter out current user AND blocked users
      const filtered = allUsers.filter(u => {
        const isMe = u.uid === loggedInProfile.uid;
        const isBlockedByMe = loggedInProfile.blockedUsers?.includes(u.uid);
        const amIBlockedByThem = u.blockedUsers?.includes(loggedInProfile.uid);
        return !isMe && !isBlockedByMe && !amIBlockedByThem;
      });

      // Sort by relevance
      const sorted = filtered.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;

        if (a.wilaya === loggedInProfile.wilaya) scoreA += 10;
        if (b.wilaya === loggedInProfile.wilaya) scoreB += 10;

        if (a.level === loggedInProfile.level) scoreA += 5;
        if (b.level === loggedInProfile.level) scoreB += 5;

        if (a.subject === loggedInProfile.subject) scoreA += 3;
        if (b.subject === loggedInProfile.subject) scoreB += 3;

        return scoreB - scoreA;
      });

      setSuggestions(sorted.slice(0, 5));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });

    return () => {
      unsubInv();
      unsubUsers();
    };
  }, [loggedInProfile, invitations.length]);

  const handleMessage = (user: UserProfile) => {
    // Dispatch a custom event to open chat bubble
    const event = new CustomEvent('openChat', { detail: user });
    window.dispatchEvent(event);
  };

  const handleConnect = async (targetUid: string, targetName: string) => {
    if (!loggedInProfile) return;
    try {
      await addDoc(collection(db, 'invitations'), {
        senderId: loggedInProfile.uid,
        recipientId: targetUid,
        participants: [loggedInProfile.uid, targetUid],
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      
      await addDoc(collection(db, 'notifications'), {
        recipientId: targetUid,
        senderId: loggedInProfile.uid,
        senderName: loggedInProfile.displayName,
        type: 'follow',
        read: false,
        createdAt: serverTimestamp(),
      });
      
      playSound('notification');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'invitations');
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 animate-pulse">
        <div className="h-6 w-32 bg-slate-800 rounded-lg mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-800 rounded-xl"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-slate-800 rounded"></div>
                <div className="h-3 w-16 bg-slate-800 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-800 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-black text-slate-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          اقتراحات الزملاء
        </h3>
        <Link to="/colleagues" className="text-[10px] font-black text-purple-400 hover:text-purple-300 uppercase tracking-widest">
          عرض الكل
        </Link>
      </div>

      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {suggestions.map((user) => (
            <motion.div
              key={user.uid}
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="group relative"
            >
              <div className="flex items-center gap-3">
                <Link to={`/profile/${user.uid}`} className="relative shrink-0">
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-purple-500/10 group-hover:ring-purple-500/30 transition-all"
                    referrerPolicy="no-referrer"
                  />
                  {user.wilaya === loggedInProfile?.wilaya && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-slate-900 rounded-full" title="Same Wilaya"></div>
                  )}
                </Link>
                
                <div className="flex-1 min-w-0">
                  <Link to={`/profile/${user.uid}`} className="block truncate font-black text-slate-100 hover:text-purple-400 transition-colors text-sm">
                    {user.displayName}
                  </Link>
                  <p className="text-[10px] font-bold text-slate-500 truncate">
                    {user.subject} • {user.level}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleMessage(user)}
                    className="p-2 bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white rounded-xl transition-all active:scale-90"
                    title="إرسال رسالة"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleConnect(user.uid, user.displayName)}
                    className="p-2 bg-slate-800 text-slate-400 hover:bg-purple-500 hover:text-white rounded-xl transition-all active:scale-90"
                    title="إرسال طلب صداقة"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Teacher Info Bubble - Appears on Hover */}
              <div className="mt-3 hidden group-hover:block animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
                      <div className="bg-purple-500/10 p-1.5 rounded-lg">
                        <MapPin className="w-3.5 h-3.5 text-purple-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] text-slate-500 uppercase tracking-tighter">الولاية</span>
                        <span className="truncate">{user.wilaya || 'غير محدد'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
                      <div className="bg-purple-500/10 p-1.5 rounded-lg">
                        <Book className="w-3.5 h-3.5 text-purple-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] text-slate-500 uppercase tracking-tighter">الاختصاص</span>
                        <span className="truncate">{user.subject || 'غير محدد'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
                      <div className="bg-purple-500/10 p-1.5 rounded-lg">
                        <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] text-slate-500 uppercase tracking-tighter">الطور</span>
                        <span className="truncate">{user.level || 'غير محدد'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold text-slate-300">
                      <div className="bg-purple-500/10 p-1.5 rounded-lg">
                        <Clock className="w-3.5 h-3.5 text-purple-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] text-slate-500 uppercase tracking-tighter">الخبرة</span>
                        <span>{user.yearsOfExperience || 0} سنة</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleMessage(user)}
                      className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 transition-all"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      مراسلة
                    </button>
                    <button
                      onClick={() => {
                        handleMessage(user);
                        setTimeout(() => {
                          const event = new CustomEvent('startCall', { detail: { type: 'audio', user } });
                          window.dispatchEvent(event);
                        }, 500);
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl transition-all"
                      title="اتصال صوتي"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-800">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
          <Info className="w-3 h-3 text-purple-500" />
          <span>يتم ترتيب الاقتراحات بناءً على الولاية، الطور، والاختصاص.</span>
        </div>
      </div>
    </div>
  );
}
