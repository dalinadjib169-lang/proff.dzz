import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { 
  doc, onSnapshot, collection, query, where, orderBy, 
  addDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, 
  serverTimestamp, getDoc, getDocs 
} from 'firebase/firestore';
import { EducationalGroup, GroupPost, UserProfile } from '../types';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Shield, Settings, MessageSquare, Send, Image as ImageIcon, 
  MoreVertical, Flag, Trash2, Check, X, ShieldAlert, Globe, Lock, 
  UserPlus, LogOut, ChevronLeft, Loader2, AlertCircle, Sparkles, UserCheck 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import PostCard from '../components/PostCard';
import CloudinaryUploader from '../components/CloudinaryUploader';

export default function GroupDetails() {
  const { groupId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [group, setGroup] = useState<EducationalGroup | null>(null);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'posts' | 'members' | 'settings'>('posts');
  
  // Post Creation
  const [newPost, setNewPost] = useState('');
  const [postImage, setPostImage] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    if (!groupId) return;

    // 1. Group Data
    const groupRef = doc(db, 'groups', groupId);
    const unsubscribeGroup = onSnapshot(groupRef, (snapshot) => {
      if (snapshot.exists()) {
        setGroup({ id: snapshot.id, ...snapshot.data() } as EducationalGroup);
      } else {
        navigate('/groups');
      }
      setLoading(false);
    });

    // 2. Group Posts
    const postsQuery = query(
      collection(db, 'group_posts'), 
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc')
    );
    const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as GroupPost[]);
    });

    return () => {
      unsubscribeGroup();
      unsubscribePosts();
    };
  }, [groupId, navigate]);

  // Fetch Member Details when tab changes
  useEffect(() => {
    if (tab === 'members' && group) {
      const fetchMembers = async () => {
        // Members
        const memberQuery = query(collection(db, 'users'), where('uid', 'in', group.members.slice(0, 10)));
        const memberSnap = await getDocs(memberQuery);
        setMembers(memberSnap.docs.map(d => d.data() as UserProfile));

        // Pending
        if (group.pendingRequests && group.pendingRequests.length > 0) {
          const pendingQuery = query(collection(db, 'users'), where('uid', 'in', group.pendingRequests.slice(0, 10)));
          const pendingSnap = await getDocs(pendingQuery);
          setPendingUsers(pendingSnap.docs.map(d => d.data() as UserProfile));
        }
      };
      fetchMembers();
    }
  }, [tab, group]);

  const isAdmin = group?.admins.includes(user?.uid || '');
  const isMember = group?.members.includes(user?.uid || '');
  const isPending = group?.pendingRequests?.includes(user?.uid || '');

  const handleJoinRequest = async () => {
    if (!user || !group) return;
    
    // Check teacher verification requirement
    if (group.requireTeacherVerification && !profile?.isActivated) {
      alert('هذه المجموعة تتطلب توثيق الأستاذية أولاً. يرجى توثيق حسابك من الإعدادات.');
      return;
    }

    try {
      const groupRef = doc(db, 'groups', group.id);
      if (group.autoJoin) {
        await updateDoc(groupRef, {
          members: arrayUnion(user.uid),
          memberCount: group.memberCount + 1
        });
      } else {
        await updateDoc(groupRef, {
          pendingRequests: arrayUnion(user.uid)
        });
      }
    } catch (error) {
      console.error("Error joining group:", error);
    }
  };

  const handleApproveMember = async (targetId: string) => {
    if (!group) return;
    try {
      const groupRef = doc(db, 'groups', group.id);
      await updateDoc(groupRef, {
        members: arrayUnion(targetId),
        pendingRequests: arrayRemove(targetId),
        memberCount: group.memberCount + 1
      });
      // Optionally create notification for user
    } catch (error) {
      console.error("Error approving member:", error);
    }
  };

  const handleRejectMember = async (targetId: string) => {
    if (!group) return;
    try {
      const groupRef = doc(db, 'groups', group.id);
      await updateDoc(groupRef, {
        pendingRequests: arrayRemove(targetId)
      });
    } catch (error) {
      console.error("Error rejecting member:", error);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !groupId || (!newPost.trim() && !postImage)) return;

    setIsPosting(true);
    try {
      await addDoc(collection(db, 'group_posts'), {
        groupId,
        authorId: user.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL,
        content: newPost,
        imageUrl: postImage || null,
        likes: [],
        commentCount: 0,
        privacy: group?.privacy === 'public' ? 'public' : 'private',
        createdAt: serverTimestamp(),
      });
      setNewPost('');
      setPostImage('');
    } catch (error) {
      console.error("Error creating group post:", error);
    } finally {
      setIsPosting(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!group || !user || !window.confirm('هل أنت متأكد من مغادرة المجموعة؟')) return;
    try {
      const groupRef = doc(db, 'groups', group.id);
      await updateDoc(groupRef, {
        members: arrayRemove(user.uid),
        admins: arrayRemove(user.uid),
        memberCount: group.memberCount - 1
      });
    } catch (error) {
      console.error("Error leaving group:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-slate-500 font-bold animate-pulse">جاري تحميل بيانات المجموعة...</p>
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Group Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-2xl relative">
        {/* Cover Image */}
        <div className="relative h-64 md:h-80 overflow-hidden">
          {group.coverImage ? (
            <img src={group.coverImage} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-600 via-purple-700 to-amber-600 opacity-20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />
          
          <Link to="/groups" className="absolute top-6 left-6 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-all">
            <ChevronLeft className="w-6 h-6 rotate-180" />
          </Link>

          <div className="absolute bottom-8 right-8 left-8 transition-transform group-hover:translate-y-[-10px]">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h1 className="text-4xl font-black text-white uppercase tracking-tighter drop-shadow-lg">
                    {group.name}
                  </h1>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-white/90 text-xs font-bold border border-white/10">
                    <Users className="w-3.5 h-3.5" />
                    <span>{group.memberCount} عضو</span>
                  </div>
                  {group.privacy === 'public' ? (
                     <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/20 backdrop-blur-md rounded-full text-green-400 text-xs font-bold border border-green-500/20">
                      <Globe className="w-3.5 h-3.5" />
                      <span>مجموعة عامة</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 backdrop-blur-md rounded-full text-amber-400 text-xs font-bold border border-amber-500/20">
                      <Lock className="w-3.5 h-3.5" />
                      <span>مجموعة خاصة</span>
                    </div>
                  )}
                  {group.requireTeacherVerification && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 backdrop-blur-md rounded-full text-blue-400 text-xs font-bold border border-blue-500/20">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>للأساتذة فقط</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                {isMember ? (
                  <div className="flex gap-2">
                     {isAdmin && (
                      <button 
                        onClick={() => setTab('settings')}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-3 rounded-2xl transition-all border border-white/20"
                        title="إعدادات المجموعة"
                      >
                        <Settings className="w-5 h-5" />
                      </button>
                    )}
                    <button 
                      onClick={handleLeaveGroup}
                      className="bg-red-500/20 hover:bg-red-500/30 backdrop-blur-md text-red-100 px-4 py-3 rounded-2xl transition-all border border-red-500/20 flex items-center gap-2 font-bold text-xs"
                    >
                      <LogOut className="w-4 h-4" />
                      مغادرة
                    </button>
                  </div>
                ) : isPending ? (
                  <div className="bg-amber-500/20 backdrop-blur-md text-amber-100 px-8 py-3 rounded-2xl border border-amber-500/20 font-black text-xs">
                    طلبك قيد المراجعة...
                  </div>
                ) : (
                  <button 
                    onClick={handleJoinRequest}
                    className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-2xl font-black transition-all active:scale-95 shadow-xl shadow-primary/30 flex items-center gap-2"
                  >
                    <UserPlus className="w-5 h-5" />
                    انضمام للمجموعة
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex px-6 pt-2 border-b border-slate-50 dark:border-slate-800">
          <button 
            onClick={() => setTab('posts')}
            className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${tab === 'posts' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            المنشورات
          </button>
          <button 
            onClick={() => setTab('members')}
            className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${tab === 'members' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            الأعضاء
          </button>
          {isAdmin && (
            <button 
              onClick={() => setTab('settings')}
              className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${tab === 'settings' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              الإدارة
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {tab === 'posts' && (
            <>
              {isMember ? (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl space-y-6">
                  <div className="flex gap-4">
                    <img src={profile?.photoURL} className="w-12 h-12 rounded-2xl ring-4 ring-primary/10" />
                    <textarea 
                      placeholder="شارك أفكارك مع زملائك في المجموعة..."
                      className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm font-bold resize-none outline-none focus:ring-2 focus:ring-primary/50 transition-all min-h-[120px]"
                      value={newPost}
                      onChange={e => setNewPost(e.target.value)}
                      dir="rtl"
                    />
                  </div>
                  
                  {postImage && (
                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden group">
                      <img src={postImage} className="w-full h-full object-cover" />
                      <button onClick={() => setPostImage('')} className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800 pt-4">
                    <CloudinaryUploader 
                      onUploadSuccess={url => setPostImage(url)}
                      className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-bold text-xs cursor-pointer"
                    >
                      <ImageIcon className="w-5 h-5" />
                      إرفاق صورة
                    </CloudinaryUploader>
                    
                    <button 
                      onClick={handleCreatePost}
                      disabled={isPosting || (!newPost.trim() && !postImage)}
                      className="bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-xl font-black transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                      {isPosting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4 rotate-180" />}
                      نشر
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/50 p-12 rounded-[2.5rem] border border-dashed border-slate-800 text-center space-y-4">
                  <ShieldAlert className="w-12 h-12 text-slate-700 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-white font-black">أنت لست عضواً في هذه المجموعة</h3>
                    <p className="text-slate-500 text-xs font-bold leading-relaxed">انضم للمجموعة لتتمكن من رؤية المنشورات والمشاركة في النقاشات مع زملائك</p>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                {posts.map(post => (
                  <PostCard 
                    key={post.id} 
                    post={{...post, authorId: post.authorId}} 
                    isGroupPost={true}
                    groupId={groupId}
                    onDelete={isAdmin ? () => {} : undefined} // Admin can delete any group post
                  />
                ))}
              </div>
            </>
          )}

          {tab === 'members' && (
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden">
               <div className="p-6 border-b border-slate-50 dark:border-slate-800">
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  أعضاء المجموعة
                </h3>
               </div>
               <div className="divide-y divide-slate-50 dark:divide-slate-800">
                {members.map(member => (
                  <div key={member.uid} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <img src={member.photoURL} className="w-10 h-10 rounded-xl" />
                      <div className="flex flex-col -space-y-1 text-right">
                        <span className="text-sm font-bold text-slate-800 dark:text-white">{member.displayName}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">{member.subject || member.role || 'عضو'}</span>
                      </div>
                    </div>
                    {group.admins.includes(member.uid) && (
                      <div className="bg-amber-500/10 text-amber-500 text-[8px] font-black px-2 py-0.5 rounded-full border border-amber-500/20 uppercase">أدمن</div>
                    )}
                  </div>
                ))}
               </div>
            </div>
          )}

          {tab === 'settings' && isAdmin && (
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden p-6 space-y-8">
               <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">إدارة المجموعة</h3>
                <p className="text-xs text-slate-500 font-bold">تحكم في الأعضاء والطلبات وإعدادات المجموعة</p>
               </div>

               {/* Join Requests */}
               <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">طلبات الانضمام المعلقة</h4>
                  <span className="bg-amber-500/10 text-amber-500 text-[10px] px-2 py-0.5 rounded-full font-black">{group.pendingRequests?.length || 0}</span>
                </div>
                {pendingUsers.length > 0 ? (
                  <div className="space-y-3">
                    {pendingUsers.map(u => (
                      <div key={u.uid} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <img src={u.photoURL} className="w-10 h-10 rounded-xl" />
                          <div className="flex flex-col -space-y-1 text-right">
                            <span className="text-sm font-bold text-slate-800 dark:text-white">{u.displayName}</span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase">{u.subject || 'مستخدم جديد'}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleApproveMember(u.uid)} className="p-2 bg-green-500/10 text-green-600 rounded-xl hover:bg-green-500 hover:text-white transition-all"><Check className="w-5 h-5" /></button>
                          <button onClick={() => handleRejectMember(u.uid)} className="p-2 bg-red-500/10 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all"><X className="w-5 h-5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-slate-400 text-xs font-bold">لا توجد طلبات معلقة</p>
                  </div>
                )}
               </div>

               {/* Dangerous Settings */}
               <div className="pt-6 border-t border-slate-50 dark:border-slate-800">
                <h4 className="text-sm font-black text-red-500 uppercase tracking-wider mb-4">منطقة الخطر</h4>
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-between p-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 rounded-2xl transition-all">
                    <div className="text-right">
                      <span className="block text-xs font-black text-red-600 uppercase">حذف المجموعة نهائياً</span>
                      <span className="text-[10px] text-slate-500 font-bold">سيتم حذف جميع المنشورات والأعضاء والبيانات</span>
                    </div>
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </button>
                </div>
               </div>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl space-y-6">
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">حول المجموعة</h4>
              <p className="text-sm font-bold text-slate-700 dark:text-white leading-relaxed text-right">
                {group.description}
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase">المنشئ</span>
                <span className="text-xs font-black text-slate-700 dark:text-white">{group.creatorId === user?.uid ? 'أنت' : 'زميل'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 uppercase">تاريخ الإنشاء</span>
                <span className="text-xs font-black text-slate-700 dark:text-white">
                  {group.createdAt?.toDate ? formatDistanceToNow(group.createdAt.toDate(), { addSuffix: true, locale: ar }) : '...'}
                </span>
              </div>
            </div>

            {!isMember && !isPending && !group.autoJoin && (
              <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-2 text-amber-600">
                  <ShieldAlert className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase">ملاحظة</span>
                </div>
                <p className="text-[10px] font-bold text-amber-700 leading-relaxed text-right">
                  يتعين على الأدمن مراجعة طلبك والموافقة عليه قبل أن تتمكن من رؤية المحتوى والمشاركة.
                </p>
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              قوانين المجموعة
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span className="text-[11px] font-bold text-slate-400 leading-tight">الاحترام المتبادل بين الزملاء أساس التعامل</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span className="text-[11px] font-bold text-slate-400 leading-tight">يمنع نشر محتوى غير تربوي أو مخالف للآداب العامة</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span className="text-[11px] font-bold text-slate-400 leading-tight">التعاون ومشاركة المعرفة هما هدفنا الأسمى</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
