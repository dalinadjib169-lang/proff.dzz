import React, { useState, useEffect } from 'react';
import { MessageSquare, TrendingUp, Filter, Plus, ChevronRight, User, Loader2, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, limit, doc, getDoc, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export default function Discussions() {
  const { profile } = useAuth();
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTopic, setActiveTopic] = useState<any>(null);
  const [newTopic, setNewTopic] = useState({ title: '', category: 'بيداغوجيا' });
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeCategory, setActiveCategory] = useState('الكل');

  const categories = ['الكل', 'بيداغوجيا', 'أخبار', 'تكنولوجيا', 'إدارة', 'موارد'];

  useEffect(() => {
    const q = query(
      collection(db, 'discussions'),
      orderBy('lastActivity', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTopics(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'discussions');
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!activeTopic) return;

    const q = query(
      collection(db, 'discussions', activeTopic.id, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Update view count
    updateDoc(doc(db, 'discussions', activeTopic.id), {
      viewsCount: increment(1)
    }).catch(() => {});

    return unsubscribe;
  }, [activeTopic]);

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newTopic.title.trim()) return;

    try {
      const docRef = await addDoc(collection(db, 'discussions'), {
        title: newTopic.title,
        category: newTopic.category,
        authorId: profile.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL,
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
        repliesCount: 0,
        viewsCount: 0
      });

      setNewTopic({ title: '', category: 'بيداغوجيا' });
      setShowCreateModal(false);
      
      // Auto-open the new topic
      const snap = await getDoc(docRef);
      setActiveTopic({ id: docRef.id, ...snap.data() });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'discussions');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newMessage.trim() || !activeTopic) return;

    const msg = newMessage;
    setNewMessage('');

    try {
      await addDoc(collection(db, 'discussions', activeTopic.id, 'messages'), {
        text: msg,
        senderId: profile.uid,
        senderName: profile.displayName,
        senderPhoto: profile.photoURL,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'discussions', activeTopic.id), {
        lastActivity: serverTimestamp(),
        repliesCount: increment(1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `discussions/${activeTopic.id}/messages`);
    }
  };

  const filteredTopics = topics.filter(t => 
    activeCategory === 'الكل' || t.category === activeCategory
  );

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl overflow-hidden relative min-h-[600px] flex flex-col">
        {!activeTopic ? (
          <>
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600/10 p-3 rounded-2xl">
                  <MessageSquare className="w-6 h-6 text-indigo-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">النقاشات - Discussions</h2>
                  <p className="text-sm text-slate-500 font-medium">Professional exchange and forum</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New Discussion</span>
              </button>
            </div>

            <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black whitespace-nowrap border transition-all ${activeCategory === cat ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-indigo-400'}`}
                >
                  {cat || 'All'}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4 flex-1">
                <AnimatePresence>
                  {filteredTopics.map((topic, idx) => (
                    <motion.div
                      key={topic.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => setActiveTopic(topic)}
                      className="bg-slate-950/40 p-5 rounded-3xl border border-slate-800/50 hover:bg-slate-900 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 text-right">
                          <div className="flex items-center justify-end gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-500 text-[8px] font-black uppercase rounded-lg border border-slate-700">{topic.category}</span>
                            <span className="text-[10px] text-slate-600 font-bold">
                              {topic.lastActivity?.toDate ? formatDistanceToNow(topic.lastActivity.toDate(), { addSuffix: true }) : 'Just now'}
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors leading-tight mb-2" dir="rtl">
                            {topic.title}
                          </h3>
                          <div className="flex items-center justify-end gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {topic.repliesCount || 0} Replies</span>
                              <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {topic.viewsCount || 0} Views</span>
                            </div>
                            <div className="flex items-center gap-2 text-indigo-400">
                              <span>{topic.authorName}</span>
                              <div className="w-6 h-6 rounded-lg overflow-hidden border border-slate-800">
                                <img src={topic.authorPhoto || `https://ui-avatars.com/api/?name=${topic.authorName}&background=random`} className="w-full h-full object-cover" />
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="p-2 text-slate-700 group-hover:text-indigo-500 transform group-hover:translate-x-1 transition-all">
                          <ChevronRight className="w-6 h-6 rotate-180" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {filteredTopics.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-center text-slate-500 space-y-4">
                    <MessageSquare className="w-16 h-16 opacity-20" />
                    <p className="font-bold">No discussions found in this category.</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col h-full -mx-6 -my-6 bg-slate-950">
            {/* Thread Header */}
            <div className="p-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setActiveTopic(null)}
                  className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all active:scale-95"
                >
                  <X className="w-5 h-5 rotate-45" />
                </button>
                <div className="text-right">
                  <h3 className="font-black text-white text-lg leading-tight" dir="rtl">{activeTopic.title}</h3>
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <span className="text-[10px] font-black text-indigo-400">{activeTopic.category}</span>
                    <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                    <span className="text-[10px] text-slate-500 font-bold">{activeTopic.authorName}</span>
                  </div>
                </div>
              </div>
              <div className="bg-indigo-600/10 px-4 py-2 rounded-2xl border border-indigo-500/20 text-indigo-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-black">{activeTopic.viewsCount} Views</span>
              </div>
            </div>

            {/* Thread Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, x: idx % 2 === 0 ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex gap-4 ${msg.senderId === profile?.uid ? 'flex-row-reverse' : ''}`}
                >
                  <img 
                    src={msg.senderPhoto || `https://ui-avatars.com/api/?name=${msg.senderName}&background=random`} 
                    className="w-10 h-10 rounded-xl border-2 border-slate-800 object-cover shrink-0" 
                    referrerPolicy="no-referrer"
                  />
                  <div className={`max-w-[80%] space-y-1 ${msg.senderId === profile?.uid ? 'text-right' : 'text-left'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {msg.senderId === profile?.uid ? (
                        <>
                          <span className="text-[10px] text-slate-500 font-bold">
                            {msg.createdAt?.toDate ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                          </span>
                          <span className="text-xs font-black text-indigo-400">{msg.senderName}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-black text-slate-300">{msg.senderName}</span>
                          <span className="text-[10px] text-slate-500 font-bold">
                            {msg.createdAt?.toDate ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                          </span>
                        </>
                      )}
                    </div>
                    <div className={`p-4 rounded-3xl font-medium shadow-xl ${
                      msg.senderId === profile?.uid 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-slate-900 text-slate-100 border border-slate-800 rounded-tl-none'
                    }`}>
                      <p className="whitespace-pre-wrap leading-relaxed text-sm" dir="rtl">{msg.text}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
              {messages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center mb-4 border border-slate-800">
                    <MessageSquare className="w-8 h-8 text-slate-700" />
                  </div>
                  <p className="text-slate-500 font-bold">No replies yet. Be the first to join the discussion!</p>
                </div>
              )}
            </div>

            {/* Thread Input */}
            <div className="p-6 bg-slate-900 border-t border-slate-800">
              <form onSubmit={handleSendMessage} className="relative">
                <textarea
                  placeholder="شارك برأيك في هذا الموضوع..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-[1.5rem] pr-20 pl-6 py-4 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-bold min-h-[100px] resize-none"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  dir="rtl"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="absolute right-4 bottom-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:grayscale text-white p-3 rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
                >
                  <Send className="w-5 h-5 rotate-180" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Create Topic Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-white">بدء نقاش جديد</h3>
                  <button onClick={() => setShowCreateModal(false)} className="text-slate-500 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleCreateTopic} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">عنوان الموضوع</label>
                    <input
                      type="text"
                      placeholder="عن ماذا تريد التحدث؟"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-right"
                      value={newTopic.title}
                      onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                      dir="rtl"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">التصنيف</label>
                    <div className="grid grid-cols-2 gap-2">
                      {categories.slice(1).map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewTopic({ ...newTopic, category: cat })}
                          className={`py-3 rounded-xl text-xs font-black transition-all border ${newTopic.category === cat ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95"
                  >
                    نشر الموضوع (Post Topic)
                  </button>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
