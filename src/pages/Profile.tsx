import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, storage } from '../firebase';
import { doc, getDoc, updateDoc, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, arrayUnion, arrayRemove, limit, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../hooks/useAuth';
import { useUpload } from '../hooks/useUpload';
import { UserProfile, Post } from '../types';
import PostCard from '../components/PostCard';
import { ALGERIAN_WILAYAS } from '../constants';
import { Edit3, Camera, Image as ImageIcon, MapPin, Book, Calendar, Mail, CheckCircle, GraduationCap, PenTool, UserPlus, UserCheck, UserX, Clock, Phone, Eye, EyeOff, Bell, Droplets, Dumbbell, Plus, Minus, ShoppingBag, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playSound } from '../lib/sounds';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export default function Profile() {
  const { uid } = useParams();
  const { profile: loggedInProfile } = useAuth();
  const { startUpload } = useUpload();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showSouqi, setShowSouqi] = useState(false);
  const [editData, setEditData] = useState({ 
    displayName: '', 
    firstName: '',
    lastName: '',
    bio: '', 
    bioBackground: '',
    bioTextColor: '',
    appBackground: '',
    subject: '', 
    school: '',
    wilaya: '',
    level: '',
    role: '',
    rank: '',
    gender: '',
    yearsOfExperience: 0,
    phoneNumber: '',
    birthDate: '',
    showEmail: true,
    showPhone: true,
    reminders: {
      prayer: false,
      water: false,
      exercise: false,
      exerciseDays: 2,
      waterGoal: 8,
      waterCurrent: 0
    }
  });

  const [prayerTimes, setPrayerTimes] = useState<any>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlockingMe, setIsBlockingMe] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'connected'>('none');
  const [invitationId, setInvitationId] = useState<string | null>(null);

  const BIO_BACKGROUNDS = [
    'linear-gradient(to bottom right, var(--primary-color), var(--primary-dark))',
    'linear-gradient(to bottom right, #0ea5e9, #2563eb)',
    'linear-gradient(to bottom right, #f43f5e, #e11d48)',
    'linear-gradient(to bottom right, #10b981, #059669)',
    'linear-gradient(to bottom right, #f59e0b, #d97706)',
    'linear-gradient(to bottom right, #1e293b, #0f172a)',
    '#1e293b',
    'var(--primary-color)',
    '#0ea5e9'
  ];

  const BIO_TEXT_COLORS = ['#ffffff', '#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8'];

  const isOwner = loggedInProfile?.uid === uid;

  useEffect(() => {
    if (profile?.wilaya && profile?.reminders?.prayer) {
      fetch(`https://api.aladhan.com/v1/timingsByCity?city=${profile.wilaya}&country=Algeria&method=3`)
        .then(res => res.json())
        .then(data => {
          if (data.code === 200) setPrayerTimes(data.data.timings);
        });
    }
  }, [profile?.wilaya, profile?.reminders?.prayer]);

  useEffect(() => {
    if (!uid || !loggedInProfile?.uid) return;

    // Check connection status
    const q = query(
      collection(db, 'invitations'),
      where('participants', 'array-contains', loggedInProfile.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const invs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      const inv = invs.find(i => i.participants.includes(uid));
      
      if (inv) {
        setInvitationId(inv.id);
        if (inv.status === 'accepted') {
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('pending');
        }
      } else {
        setConnectionStatus('none');
        setInvitationId(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'invitations');
    });

    return unsubscribe;
  }, [uid, loggedInProfile]);

  useEffect(() => {
    if (!uid) {
      console.warn("Profile UID is missing from params");
      return;
    }

    console.log("Fetching profile for UID:", uid);
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          
           // Check blocking status
          const blockedByMe = loggedInProfile?.blockedUsers?.includes(uid);
          const blockedByThem = data.blockedUsers?.includes(loggedInProfile?.uid || '');
          
          setIsBlocked(blockedByMe || false);
          setIsBlockingMe(blockedByThem || false);

          if (blockedByMe || blockedByThem) {
            setProfile(data); // Still set profile for basic info if needed, but UI will handle block
          } else {
            setProfile(data);
          }

          setEditData({
            displayName: data.displayName,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            bio: data.bio || '',
            bioBackground: data.bioBackground || 'linear-gradient(to bottom right, #4f46e5, #7c3aed)',
            bioTextColor: data.bioTextColor || '#ffffff',
            subject: data.subject || '',
            school: data.school || '',
            wilaya: data.wilaya || '',
            level: data.level || '',
            role: data.role || 'أستاذ (Teacher)',
            rank: data.rank || 'أستاذ متوسط',
            gender: data.gender || 'ذكر (Male)',
            yearsOfExperience: data.yearsOfExperience || 0,
            phoneNumber: data.phoneNumber || '',
            appBackground: data.appBackground || '',
            birthDate: data.birthDate || '',
            showEmail: data.showEmail !== false,
            showPhone: data.showPhone !== false,
            reminders: {
              prayer: data.reminders?.prayer || false,
              water: data.reminders?.water || false,
              exercise: data.reminders?.exercise || false,
              exerciseDays: data.reminders?.exerciseDays || 2,
              waterGoal: data.reminders?.waterGoal || 8,
              waterCurrent: data.reminders?.waterCurrent || 0
            }
          });
        } else {
          console.warn("No profile document found for UID:", uid);
        }
      } catch (e) {
        console.error("Error fetching profile:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    const isOwnProfile = profile?.uid === uid;
    
    // If it's the user's own profile, show all their posts. 
    // Otherwise, show only public posts for this author.
    const q = isOwnProfile 
      ? query(
          collection(db, 'posts'),
          where('authorId', '==', uid),
          orderBy('createdAt', 'desc'),
          limit(30)
        )
      : query(
          collection(db, 'posts'),
          where('authorId', '==', uid),
          where('privacy', '==', 'public'),
          orderBy('createdAt', 'desc'),
          limit(30)
        );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ 
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt || Timestamp.now()
      })) as any as Post[];
      
      postsData.sort((a, b) => {
        const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
        const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
        return timeB - timeA;
      });
      
      setPosts(postsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'posts');
    });

    return unsubscribe;
  }, [uid]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    setLoading(true);
    try {
      const { email, phoneNumber, reminders, ...publicData } = editData as any;
      const finalData = {
        ...publicData,
        displayName: `${editData.firstName} ${editData.lastName}`.trim() || editData.displayName
      };
      
      const privateData: any = {};
      if (email !== undefined) privateData.email = email;
      if (phoneNumber !== undefined) privateData.phoneNumber = phoneNumber;
      if (reminders !== undefined) privateData.reminders = reminders;

      const profileUpdate = {
        ...finalData,
        appBackground: editData.appBackground
      };

      await updateDoc(doc(db, 'users', uid), profileUpdate);
      if (Object.keys(privateData).length > 0) {
        await updateDoc(doc(db, 'users_private', uid), privateData);
      }
      
      setProfile(prev => prev ? { ...prev, ...profileUpdate, ...privateData } : null);
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;

    try {
      await startUpload(file, 'profile', { uid });
      playSound('post');
    } catch (error) {
      console.error("Error initiating photo upload:", error);
    }
  };

  const handleAppBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;

    try {
      setLoading(true);
      const url = await startUpload(file, 'post', { authorId: uid, skipFirestore: true });
      if (url && typeof url === 'string') {
        await updateDoc(doc(db, 'users', uid), { appBackground: url });
        setProfile(prev => prev ? { ...prev, appBackground: url } : null);
        setEditData(prev => ({ ...prev, appBackground: url }));
        playSound('notification');
      }
    } catch (error) {
      console.error("Error uploading background:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!loggedInProfile || !uid || loading) return;
    setLoading(true);
    try {
      if (connectionStatus === 'none') {
        await addDoc(collection(db, 'invitations'), {
          senderId: loggedInProfile.uid,
          recipientId: uid,
          participants: [loggedInProfile.uid, uid],
          status: 'pending',
          createdAt: serverTimestamp(),
        });
        
        // Notification
        await addDoc(collection(db, 'notifications'), {
          recipientId: uid,
          senderId: loggedInProfile.uid,
          senderName: loggedInProfile.displayName,
          type: 'follow', // Using 'follow' as a placeholder for connection request
          read: false,
          createdAt: serverTimestamp(),
        });
        
        playSound('notification');
      } else if (connectionStatus === 'pending' || connectionStatus === 'connected') {
        if (invitationId) {
          await deleteDoc(doc(db, 'invitations', invitationId));
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'invitations');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async () => {
    if (!loggedInProfile || !uid) return;
    
    const isCurrentlyBlocked = loggedInProfile.blockedUsers?.includes(uid);
    if (!isCurrentlyBlocked && !confirm("هل أنت متأكد من رغبتك في حظر هذا المستخدم؟")) return;
    
    try {
      const userRef = doc(db, 'users', loggedInProfile.uid);
      if (isCurrentlyBlocked) {
        await updateDoc(userRef, {
          blockedUsers: arrayRemove(uid)
        });
        setIsBlocked(false);
        alert("تم إلغاء حظر المستخدم");
      } else {
        await updateDoc(userRef, {
          blockedUsers: arrayUnion(uid)
        });
        setIsBlocked(true);
        alert("تم حظر المستخدم بنجاح");
        window.location.href = '/';
      }
    } catch (error) {
      console.error("Error blocking user:", error);
    }
  };

  const handleWaterUpdate = async (delta: number) => {
    if (!profile || !isOwner) return;
    const newCount = Math.max(0, (profile.reminders?.waterCurrent || 0) + delta);
    try {
      await updateDoc(doc(db, 'users_private', uid!), {
        'reminders.waterCurrent': newCount
      });
      setProfile(prev => prev ? { 
        ...prev, 
        reminders: { ...prev.reminders, waterCurrent: newCount } 
      } : null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users_private/${uid}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (isBlocked || isBlockingMe) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-2xl shadow-xl p-12 border border-slate-100">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-12 h-12 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            {isBlocked ? "You have blocked this user" : "This profile is unavailable"}
          </h2>
          <p className="text-slate-600 mb-8 max-w-md mx-auto">
            {isBlocked 
              ? "You won't see their posts or be able to message them. You can unblock them in your settings." 
              : "You cannot view this profile or interact with this user."}
          </p>
          {isBlocked && (
            <button
              onClick={handleBlockUser}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              Unblock User
            </button>
          )}
          <Link
            to="/"
            className="block mt-4 text-indigo-600 font-medium hover:underline"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center bg-slate-900 rounded-3xl border border-slate-800">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
        <h2 className="text-xl font-black text-white mb-2">Loading Profile...</h2>
        <p className="text-slate-400 mb-6">Fetching teacher information from the database.</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Taskbar / Reminders */}
      {isOwner && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 rounded-3xl p-4 border border-slate-800 flex flex-wrap items-center gap-6 shadow-xl"
        >
          {/* Prayer Times */}
          {profile.reminders?.prayer && prayerTimes && (
            <div className="flex items-center gap-3 px-4 py-2 bg-amber-500/10 rounded-2xl border border-amber-500/20">
              <div className="bg-amber-500 p-2 rounded-xl">
                <Bell className="w-4 h-4 text-white" />
              </div>
              <div className="flex gap-4 overflow-x-auto scrollbar-hide">
                {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(p => (
                  <div key={p} className="text-center min-w-[50px]">
                    <p className="text-[8px] font-black text-amber-500 uppercase">{p}</p>
                    <p className="text-xs font-bold text-white">{prayerTimes[p]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Water Tracker */}
          {profile.reminders?.water && (
            <div className="flex items-center gap-4 px-4 py-2 bg-blue-500/10 rounded-2xl border border-blue-500/20">
              <div className="bg-blue-500 p-2 rounded-xl">
                <Droplets className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => handleWaterUpdate(-1)} className="p-1 hover:bg-blue-500/20 rounded-lg text-blue-400"><Minus className="w-4 h-4" /></button>
                <div className="text-center">
                  <p className="text-[8px] font-black text-blue-500 uppercase">Water Intake</p>
                  <p className="text-xs font-bold text-white">{profile.reminders.waterCurrent || 0} / {profile.reminders.waterGoal || 8}</p>
                </div>
                <button onClick={() => handleWaterUpdate(1)} className="p-1 hover:bg-blue-500/20 rounded-lg text-blue-400"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
          )}

          {/* Exercise Tracker */}
          {profile.reminders?.exercise && (
            <div className="flex items-center gap-3 px-4 py-2 bg-green-500/10 rounded-2xl border border-green-500/20">
              <div className="bg-green-500 p-2 rounded-xl">
                <Dumbbell className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-[8px] font-black text-green-500 uppercase">Exercise Plan</p>
                <p className="text-xs font-bold text-white">Every {profile.reminders.exerciseDays || 2} Days</p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Profile Header */}
      <div className="bg-slate-900 rounded-3xl shadow-xl border border-slate-800 overflow-hidden">
        <div 
          className="min-h-[300px] relative flex items-center justify-center p-12 text-center"
          style={{ 
            background: profile.appBackground ? `url(${profile.appBackground}) center/cover no-repeat` : (profile.bioBackground || 'linear-gradient(to bottom right, var(--primary-color), var(--primary-dark))') 
          }}
        >
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-900/50"></div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 max-w-2xl"
          >
            <h2 
              className="text-4xl md:text-5xl font-black tracking-tighter leading-tight mb-4"
              style={{ color: profile.bioTextColor || '#ffffff' }}
            >
              {profile.bio || "أهلاً بك في ملفي الشخصي! أنا هنا لأشارك خبرتي التعليمية."}
            </h2>
          </motion.div>
        </div>
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col md:flex-row items-end gap-6 -mt-16 mb-6">
            <div className="relative">
              <img
                src={profile.photoURL}
                alt={profile.displayName}
                className="w-32 h-32 rounded-3xl object-cover ring-8 ring-slate-900 shadow-2xl"
              />
              {isOwner && (
                <label className="absolute -bottom-2 -right-2 bg-purple-600 p-2.5 rounded-xl text-white shadow-xl cursor-pointer hover:bg-purple-700 transition-all border-4 border-slate-900 active:scale-95 flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </label>
              )}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black text-white tracking-tight">{profile.displayName}</h1>
                <CheckCircle className="w-6 h-6 text-purple-500 fill-purple-500/10" />
              </div>
              <p className="text-slate-400 font-bold flex items-center gap-2 mb-2">
                <GraduationCap className="w-4 h-4 text-primary" />
                {profile.subject || 'Education Professional'} • {profile.level || 'General'}
                <span className="flex items-center gap-1 border-l border-slate-800 pl-2 ml-2">
                  <MapPin className="w-4 h-4 text-amber-500" />
                  {profile.wilaya || 'Algeria'}
                </span>
              </p>
              <p className="text-slate-500 font-medium text-sm border-t border-slate-800 pt-2 line-clamp-2 max-w-md">
                {profile.bio || "No biography provided yet."}
              </p>
            </div>
            {isOwner ? (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-6 py-3 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark transition-all flex items-center gap-2 shadow-lg shadow-primary/20 active:scale-95"
              >
                <Edit3 className="w-4 h-4" />
                {isEditing ? 'إلغاء (Cancel)' : 'تعديل الملف (Edit Profile)'}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleConnect}
                  disabled={loading}
                  className={`px-6 py-3 font-black rounded-2xl transition-all flex items-center gap-2 shadow-lg active:scale-95 ${
                    connectionStatus === 'connected' 
                      ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-500/20' 
                      : connectionStatus === 'pending'
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-primary text-white hover:bg-primary-dark shadow-primary/20'
                  }`}
                >
                  {connectionStatus === 'connected' ? (
                    <><UserCheck className="w-4 h-4" /> Connected</>
                  ) : connectionStatus === 'pending' ? (
                    <><Clock className="w-4 h-4" /> Pending</>
                  ) : (
                    <><UserPlus className="w-4 h-4" /> Connect</>
                  )}
                </button>
                <button
                  onClick={handleBlockUser}
                  className="p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-95"
                  title="حظر المستخدم"
                >
                  <UserX className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.form 
                key="profile-edit-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleUpdateProfile} 
                className="space-y-6 bg-slate-950 p-8 rounded-[2.5rem] border border-slate-800"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between items-center">
                      <span>First Name</span>
                      <span>الاسم</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 text-white rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 transition-all font-bold"
                      value={editData.firstName}
                      onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between items-center">
                      <span>Last Name</span>
                      <span>اللقب</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 text-white rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 transition-all font-bold"
                      value={editData.lastName}
                      onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between items-center">
                      <span>Specialization / Subject</span>
                      <span>الاختصاص / المادة</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 text-white rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 transition-all font-bold"
                      value={editData.subject}
                      onChange={(e) => setEditData({ ...editData, subject: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between items-center">
                      <span>Wilaya</span>
                      <span>الولاية</span>
                    </label>
                    <select
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 text-white rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 transition-all font-bold appearance-none"
                      value={editData.wilaya}
                      onChange={(e) => setEditData({ ...editData, wilaya: e.target.value })}
                    >
                      <option value="">اختر الولاية (Select Wilaya)</option>
                      {ALGERIAN_WILAYAS.map(w => (
                        <option key={w} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between items-center">
                      <span>Phone Number</span>
                      <span>رقم الهاتف</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 text-white rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 transition-all font-bold"
                        value={editData.phoneNumber}
                        onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                      />
                      <button 
                        type="button"
                        onClick={() => setEditData({ ...editData, showPhone: !editData.showPhone })}
                        className={`p-3 rounded-2xl border border-slate-800 transition-all ${editData.showPhone ? 'bg-purple-600/10 text-purple-400' : 'bg-slate-900 text-slate-500'}`}
                      >
                        {editData.showPhone ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between items-center">
                      <span>Email Privacy</span>
                      <span>خصوصية البريد</span>
                    </label>
                    <button 
                      type="button"
                      onClick={() => setEditData({ ...editData, showEmail: !editData.showEmail })}
                      className={`w-full px-4 py-3 rounded-2xl border border-slate-800 transition-all flex items-center justify-between font-bold ${editData.showEmail ? 'bg-purple-600/10 text-purple-400' : 'bg-slate-900 text-slate-500'}`}
                    >
                      <span className="text-xs">{editData.showEmail ? 'Email Visible to Friends' : 'Email Hidden'}</span>
                      {editData.showEmail ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between items-center">
                      <span>Years of Experience</span>
                      <span>سنوات الخبرة</span>
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 text-white rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 transition-all font-bold"
                      value={editData.yearsOfExperience}
                      onChange={(e) => setEditData({ ...editData, yearsOfExperience: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between items-center">
                      <span>Teaching Level</span>
                      <span>الطور التعليمي</span>
                    </label>
                    <select
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 text-white rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 transition-all font-bold appearance-none"
                      value={editData.level}
                      onChange={(e) => setEditData({ ...editData, level: e.target.value })}
                    >
                      <option value="">Select Level</option>
                      <option value="الطور الابتدائي (Primary School)">الطور الابتدائي (Primary School)</option>
                      <option value="الطور المتوسط (Middle School)">الطور المتوسط (Middle School)</option>
                      <option value="الطور الثانوي (High School)">الطور الثانوي (High School)</option>
                      <option value="التعليم الجامعي (University)">التعليم الجامعي (University)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between items-center">
                      <span>Role (الصفة)</span>
                      <span>الصفة الحالية</span>
                    </label>
                    <select
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 text-white rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 transition-all font-bold appearance-none"
                      value={editData.role}
                      onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                    >
                      <option value="أستاذ (Teacher)">أستاذ (Teacher)</option>
                      <option value="مدير (Director)">مدير (Director)</option>
                      <option value="مفتش (Inspector)">مفتش (Inspector)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between items-center">
                      <span>Rank (الرتبة)</span>
                      <span>الرتبة الإدارية</span>
                    </label>
                    <select
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 text-white rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 transition-all font-bold appearance-none"
                      value={editData.rank}
                      onChange={(e) => setEditData({ ...editData, rank: e.target.value })}
                    >
                      <option value="أستاذ متوسط">أستاذ متوسط</option>
                      <option value="أستاذ قسم أول">أستاذ قسم أول</option>
                      <option value="أستاذ قسم ثاني">أستاذ قسم ثاني</option>
                      <option value="أستاذ مميز">أستاذ مميز</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between items-center">
                      <span>Gender (الجنس)</span>
                      <span>الجنس</span>
                    </label>
                    <select
                      className="w-full px-4 py-3 bg-slate-900 border border-slate-800 text-white rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 transition-all font-bold appearance-none"
                      value={editData.gender}
                      onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                    >
                      <option value="ذكر (Male)">ذكر (Male)</option>
                      <option value="أنثى (Female)">أنثى (Female)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Reminders - تذكيرات</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                      type="button"
                      onClick={() => setEditData({ ...editData, reminders: { ...editData.reminders, prayer: !editData.reminders.prayer } })}
                      className={`p-4 rounded-2xl border border-slate-800 transition-all flex items-center gap-3 font-bold ${editData.reminders.prayer ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-slate-900 text-slate-500'}`}
                    >
                      <Bell className="w-5 h-5" />
                      <span>Prayer Reminders - مواقيت الصلاة</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setEditData({ ...editData, reminders: { ...editData.reminders, water: !editData.reminders.water } })}
                      className={`p-4 rounded-2xl border border-slate-800 transition-all flex items-center gap-3 font-bold ${editData.reminders.water ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-slate-900 text-slate-500'}`}
                    >
                      <Droplets className="w-5 h-5" />
                      <span>Water Intake - شرب الماء</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setEditData({ ...editData, reminders: { ...editData.reminders, exercise: !editData.reminders.exercise } })}
                      className={`p-4 rounded-2xl border border-slate-800 transition-all flex items-center gap-3 font-bold ${editData.reminders.exercise ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-slate-900 text-slate-500'}`}
                    >
                      <Dumbbell className="w-5 h-5" />
                      <span>Exercise - ممارسة الرياضة</span>
                    </button>
                    {editData.reminders.exercise && (
                      <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400">Every (days):</span>
                        <input 
                          type="number" 
                          min="1" 
                          max="7"
                          value={editData.reminders.exerciseDays}
                          onChange={(e) => setEditData({ ...editData, reminders: { ...editData.reminders, exerciseDays: parseInt(e.target.value) } })}
                          className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-white text-center font-bold"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Bio & Style</label>
                  <textarea
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-800 text-white rounded-2xl outline-none focus:ring-2 focus:ring-purple-500 transition-all font-bold min-h-[150px] text-xl text-center"
                    value={editData.bio}
                    onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                    placeholder="اكتب نبذة عنك هنا..."
                  />
                  
                  <div className="space-y-4 pt-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Application Background (Optional)</label>
                    <div className="flex gap-4 items-center p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                      {editData.appBackground ? (
                        <img src={editData.appBackground} className="w-16 h-10 rounded-lg object-cover border border-slate-700" />
                      ) : (
                        <div className="w-16 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-slate-600" />
                        </div>
                      )}
                      <label className="flex-1 px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 text-xs font-bold rounded-xl cursor-pointer text-center transition-all">
                        {editData.appBackground ? 'Change Background' : 'Upload App Background'}
                        <input type="file" className="hidden" accept="image/*" onChange={handleAppBackgroundUpload} />
                      </label>
                      {editData.appBackground && (
                        <button 
                          type="button"
                          onClick={() => setEditData({...editData, appBackground: ''})}
                          className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Bio Background</label>
                    <div className="flex flex-wrap gap-2">
                      {BIO_BACKGROUNDS.map(bg => (
                        <button
                          key={bg}
                          type="button"
                          onClick={() => setEditData({ ...editData, bioBackground: bg })}
                          className={`w-10 h-10 rounded-xl border-2 transition-all ${editData.bioBackground === bg ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`}
                          style={{ background: bg }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Text Color</label>
                    <div className="flex flex-wrap gap-2">
                      {BIO_TEXT_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEditData({ ...editData, bioTextColor: color })}
                          className={`w-10 h-10 rounded-xl border-2 transition-all ${editData.bioTextColor === color ? 'border-purple-500 scale-110 shadow-lg' : 'border-slate-800'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-4 bg-purple-600 text-white font-black rounded-2xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  {loading ? 'جاري الحفظ...' : 'حفظ التغييرات (Save Changes)'}
                </button>
              </motion.form>
            ) : (
              <motion.div 
                key="profile-display"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-8"
              >
                <div className="md:col-span-3 space-y-4 bg-slate-950 p-6 rounded-3xl border border-slate-800">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 text-slate-300 font-bold text-sm">
                      <Book className="w-4 h-4 text-purple-500" />
                      <span>{profile.subject || 'Not specified'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-300 font-bold text-sm">
                      <MapPin className="w-4 h-4 text-purple-500" />
                      <span>{profile.wilaya || 'Algeria'} • {profile.level || 'General'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-300 font-bold text-sm">
                      <Clock className="w-4 h-4 text-purple-500" />
                      <span>{profile.yearsOfExperience || 0} Years Experience</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-300 font-bold text-sm">
                      <CheckCircle className="w-4 h-4 text-purple-500" />
                      <span>{profile.role || 'Teacher'} • {profile.rank || 'Middle Rank'} • {profile.gender || 'Not specified'}</span>
                    </div>
                    {(isOwner || profile.showEmail) && (
                      <div className="flex items-center gap-3 text-slate-300 font-bold text-sm">
                        <Mail className="w-4 h-4 text-purple-500" />
                        <span>{profile.email}</span>
                      </div>
                    )}
                    {(isOwner || (profile.showPhone && profile.phoneNumber)) && (
                      <div className="flex items-center gap-3 text-slate-300 font-bold text-sm">
                        <Phone className="w-4 h-4 text-purple-500" />
                        <span>{profile.phoneNumber}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-slate-300 font-bold text-sm">
                      <Calendar className="w-4 h-4 text-purple-500" />
                      <span>Joined {profile.createdAt?.toDate().toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* User Posts */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-white tracking-tight">Recent Posts</h2>
          <div className="h-px flex-1 bg-slate-900 mx-6"></div>
        </div>
        
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}

        {posts.length === 0 && (
          <div className="text-center py-20 bg-slate-900 rounded-3xl border border-dashed border-slate-800">
            <div className="bg-slate-950 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <PenTool className="w-8 h-8 text-slate-700" />
            </div>
            <h3 className="text-slate-100 font-black text-lg mb-1">No posts yet</h3>
            <p className="text-slate-500 font-medium text-sm">This teacher hasn't shared anything yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
