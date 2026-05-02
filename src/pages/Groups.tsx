import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { EducationalGroup } from '../types';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Users, Search, Globe, Lock, ShieldCheck, ChevronRight, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import CloudinaryUploader from '../components/CloudinaryUploader';

export default function Groups() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<EducationalGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState('');
  
  // Create Group Form State
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    coverImage: '',
    privacy: 'public' as 'public' | 'private',
    autoJoin: true,
    requireTeacherVerification: false,
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'groups'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as EducationalGroup[];
      setGroups(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'groups');
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    if (!newGroup.name.trim()) return;

    setIsCreating(true);
    try {
      const groupData = {
        ...newGroup,
        creatorId: user.uid,
        admins: [user.uid],
        members: [user.uid],
        pendingRequests: [],
        memberCount: 1,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'groups'), groupData);
      setShowCreateModal(false);
      navigate(`/groups/${docRef.id}`);
    } catch (error) {
      console.error("Error creating group:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) || 
    g.description.toLowerCase().includes(search.toLowerCase())
  );

  const myGroups = groups.filter(g => g.members.includes(user?.uid || ''));
  const otherGroups = filteredGroups.filter(g => !g.members.includes(user?.uid || ''));

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            المجموعات التربوية
          </h1>
          <p className="text-slate-500 font-bold">تواصل وتعاون مع زملائك في بيئة تعليمية متخصصة</p>
        </div>
        
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-2xl font-black transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          إنشاء مجموعة جديدة
        </button>
      </div>

      {/* Search and Filters */}
      <div className="relative group">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
        <input 
          type="text"
          placeholder="ابحث عن مجموعات حسب الاسم أو التخصص..."
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pr-12 pl-6 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          dir="rtl"
        />
      </div>

      {/* My Groups Section */}
      {!loading && myGroups.length > 0 && !search && (
        <section className="space-y-4">
          <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
            مجموعاتي
            <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full">{myGroups.length}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myGroups.map(group => (
              <GroupCard key={group.id} group={group} isMember={true} />
            ))}
          </div>
        </section>
      )}

      {/* Featured/All Groups */}
      <section className="space-y-4">
        <h2 className="text-lg font-black text-slate-800 dark:text-white">
          اكتشف مجموعات جديدة
        </h2>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-64 bg-slate-100 dark:bg-slate-900 animate-pulse rounded-[2rem]" />
            ))}
          </div>
        ) : otherGroups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {otherGroups.map(group => (
              <GroupCard key={group.id} group={group} isMember={false} />
            ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 font-bold">لا توجد مجموعات متاحة حالياً تطابق بحثك</p>
          </div>
        )}
      </section>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase">إنشاء مجموعة تربوية</h2>
                  <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <div className="space-y-2 text-right">
                    <label className="text-xs font-black text-slate-500 uppercase">اسم المجموعة</label>
                    <input 
                      type="text" 
                      required
                      placeholder="مثال: أساتذة الفيزياء - الطور الثانوي"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/50"
                      value={newGroup.name}
                      onChange={e => setNewGroup({...newGroup, name: e.target.value})}
                      dir="rtl"
                    />
                  </div>

                  <div className="space-y-2 text-right">
                    <label className="text-xs font-black text-slate-500 uppercase">وصف المجموعة</label>
                    <textarea 
                      required
                      placeholder="ما هو هدف هذه المجموعة؟"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px] resize-none"
                      value={newGroup.description}
                      onChange={e => setNewGroup({...newGroup, description: e.target.value})}
                      dir="rtl"
                    />
                  </div>

                  <div className="space-y-2 text-right">
                    <label className="text-xs font-black text-slate-500 uppercase">صورة الغلاف</label>
                    <div className="flex items-center gap-4">
                      {newGroup.coverImage ? (
                        <div className="relative w-full h-32 rounded-2xl overflow-hidden">
                          <img src={newGroup.coverImage} className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => setNewGroup({...newGroup, coverImage: ''})}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <CloudinaryUploader 
                          onUploadSuccess={(url) => setNewGroup({...newGroup, coverImage: url})}
                          className="w-full border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-all cursor-pointer"
                        >
                          <ImageIcon className="w-8 h-8 mb-2" />
                          <span className="text-[10px] font-black uppercase">اختر صورة غلاف</span>
                        </CloudinaryUploader>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 text-right">
                      <label className="text-xs font-black text-slate-500 uppercase">الخصوصية</label>
                      <select 
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs font-black outline-none focus:ring-2 focus:ring-primary/50"
                        value={newGroup.privacy}
                        onChange={e => setNewGroup({...newGroup, privacy: e.target.value as any})}
                      >
                        <option value="public">عامة (للجميع)</option>
                        <option value="private">خاصة (بطلب انضمام)</option>
                      </select>
                    </div>

                    <div className="space-y-2 text-right">
                      <label className="text-xs font-black text-slate-500 uppercase">الانضمام</label>
                      <select 
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs font-black outline-none focus:ring-2 focus:ring-primary/50"
                        value={newGroup.autoJoin ? 'auto' : 'request'}
                        onChange={e => setNewGroup({...newGroup, autoJoin: e.target.value === 'auto'})}
                      >
                        <option value="auto">انضمام مباشر</option>
                        <option value="request">طلب موافقة الأدمن</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                    <input 
                      type="checkbox" 
                      id="verify"
                      checked={newGroup.requireTeacherVerification}
                      onChange={e => setNewGroup({...newGroup, requireTeacherVerification: e.target.checked})}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="verify" className="text-[10px] font-black text-blue-600 uppercase">يتطلب "توثيق الأستاذية" للانضمام</label>
                  </div>

                  <button 
                    type="submit"
                    disabled={isCreating}
                    className="w-full bg-primary hover:bg-primary-dark text-white py-4 rounded-2xl font-black transition-all active:scale-95 shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                  >
                    {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    بدء إنشاء المجموعة
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GroupCard({ group, isMember }: { group: EducationalGroup, isMember: boolean }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all flex flex-col group h-full"
    >
      <div className="relative h-32 overflow-hidden">
        {group.coverImage ? (
          <img src={group.coverImage} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-600 to-amber-500 opacity-20" />
        )}
        <div className="absolute top-3 right-3 flex gap-2">
          {group.privacy === 'public' ? (
            <div className="bg-green-500/80 backdrop-blur-sm text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
              <Globe className="w-2.5 h-2.5" />
              عامة
            </div>
          ) : (
            <div className="bg-amber-500/80 backdrop-blur-sm text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              خاصة
            </div>
          )}
          {group.requireTeacherVerification && (
            <div className="bg-blue-500/80 backdrop-blur-sm text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
              <ShieldCheck className="w-2.5 h-2.5" />
              موثق
            </div>
          )}
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-lg font-black text-slate-800 dark:text-white line-clamp-1 mb-2">
          {group.name}
        </h3>
        <p className="text-xs text-slate-500 font-bold line-clamp-2 mb-4 flex-1">
          {group.description}
        </p>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50 dark:border-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2 rtl:space-x-reverse">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-bold text-slate-500">
                  U
                </div>
              ))}
            </div>
            <span className="text-[10px] font-black text-slate-400">+{group.memberCount} عضو</span>
          </div>

          <Link 
            to={`/groups/${group.id}`}
            className={`flex items-center gap-2 text-xs font-black transition-all ${isMember ? 'text-primary hover:text-primary-dark' : 'text-slate-400 group-hover:text-primary'}`}
          >
            {isMember ? 'دخول المجموعة' : 'عرض التفاصيل'}
            <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${isMember ? 'rotate-180' : 'rotate-180'}`} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
