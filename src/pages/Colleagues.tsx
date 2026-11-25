import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, where, limit, updateDoc, doc, arrayUnion, arrayRemove, addDoc, serverTimestamp, writeBatch, getDocs } from 'firebase/firestore';
import { UserProfile } from '../types';
import { Users, Search, MapPin, GraduationCap, MessageSquare, UserPlus, MoreVertical, UserMinus, Ban, UserCheck, Clock, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { playSound } from '../lib/sounds';
import { sendRemotePushNotification } from '../lib/notifications';
import { useAuth } from '../hooks/useAuth';

export default function Colleagues() {
  const { profile: loggedInProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [wilayaFilter, setWilayaFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [confirmBlockId, setConfirmBlockId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), limit(500));
    return onSnapshot(q, (snapshot) => {
      const allUsers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[];
      
      // Filter out self and blocked users
      const otherUsers = allUsers.filter(u => {
        const isSelf = u.uid === loggedInProfile?.uid;
        const isBlockedByMe = loggedInProfile?.blockedUsers?.includes(u.uid);
        const blockedMe = u.blockedUsers?.includes(loggedInProfile?.uid || '');
        return !isSelf && !isBlockedByMe && !blockedMe;
      });

      // Advanced sorting: Same Wilaya > Same Level > Same Subject
      if (loggedInProfile) {
        otherUsers.sort((a, b) => {
          // 1. Same Wilaya
          const aSameWilaya = a.wilaya === loggedInProfile.wilaya;
          const bSameWilaya = b.wilaya === loggedInProfile.wilaya;
          if (aSameWilaya && !bSameWilaya) return -1;
          if (!aSameWilaya && bSameWilaya) return 1;

          // 2. Same Level (Cycle)
          const aSameLevel = a.level === loggedInProfile.level;
          const bSameLevel = b.level === loggedInProfile.level;
          if (aSameLevel && !bSameLevel) return -1;
          if (!aSameLevel && bSameLevel) return 1;

          // 3. Same Subject
          const aSameSubject = a.subject === loggedInProfile.subject;
          const bSameSubject = b.subject === loggedInProfile.subject;
          if (aSameSubject && !bSameSubject) return -1;
          if (!aSameSubject && bSameSubject) return 1;

          // 4. Default: Last seen
          const timeA = a.lastSeen?.toDate?.()?.getTime() || 0;
          const timeB = b.lastSeen?.toDate?.()?.getTime() || 0;
          return timeB - timeA;
        });
      }

      setUsers(otherUsers);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
      setLoading(false);
    });
  }, [loggedInProfile]);

  useEffect(() => {
    if (!loggedInProfile?.uid) return;
    const invQ = query(
      collection(db, 'invitations'),
      where('participants', 'array-contains', loggedInProfile.uid)
    );
    return onSnapshot(invQ, (snap) => {
      setInvitations(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => {});
  }, [loggedInProfile?.uid]);

  const handleSendFriendRequest = async (targetUser: UserProfile) => {
    if (!loggedInProfile) return;
    try {
      await addDoc(collection(db, 'invitations'), {
        senderId: loggedInProfile.uid,
        recipientId: targetUser.uid,
        participants: [loggedInProfile.uid, targetUser.uid],
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, 'notifications'), {
        recipientId: targetUser.uid,
        senderId: loggedInProfile.uid,
        senderName: loggedInProfile.displayName,
        type: 'follow',
        message: 'أرسل لك طلب صداقة ومراسلة',
        read: false,
        createdAt: serverTimestamp(),
      });

      sendRemotePushNotification({
        recipientId: targetUser.uid,
        title: `طلب صداقة ومراسلة من ${loggedInProfile.displayName}`,
        body: 'يريد التواصل معك عبر TeachDZ',
        icon: loggedInProfile.photoURL || '/prof_dali_logo.png',
        tag: `invite-${loggedInProfile.uid}`,
        url: '/notifications',
        type: 'notification',
      });

      playSound('notification');
      toast.success(`تم إرسال طلب المراسلة إلى ${targetUser.displayName}`);
    } catch (e) {
      console.error('Send friend request error:', e);
      toast.error('تعذر إرسال الطلب');
    }
  };

  const handleAcceptFriendRequest = async (inv: any, targetUser: UserProfile) => {
    if (!loggedInProfile) return;
    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'invitations', inv.id), {
        status: 'accepted',
        updatedAt: serverTimestamp(),
      });
      batch.update(doc(db, 'users', loggedInProfile.uid), {
        friends: arrayUnion(targetUser.uid),
        followers: arrayUnion(targetUser.uid),
        following: arrayUnion(targetUser.uid),
      });
      batch.update(doc(db, 'users', targetUser.uid), {
        friends: arrayUnion(loggedInProfile.uid),
        followers: arrayUnion(loggedInProfile.uid),
        following: arrayUnion(loggedInProfile.uid),
      });
      await addDoc(collection(db, 'notifications'), {
        recipientId: targetUser.uid,
        senderId: loggedInProfile.uid,
        senderName: loggedInProfile.displayName,
        type: 'friend_request_accepted',
        read: false,
        createdAt: serverTimestamp(),
      });
      await batch.commit();
      sendRemotePushNotification({
        recipientId: targetUser.uid,
        title: 'تم قبول طلب المراسلة ✅',
        body: `وافق ${loggedInProfile.displayName} على طلبك، يمكنكما التحدث الآن!`,
        icon: loggedInProfile.photoURL || '/prof_dali_logo.png',
        tag: `accept-${loggedInProfile.uid}`,
        url: '/',
        type: 'notification',
      });
      playSound('notification');
      toast.success(`أصبحتما أصدقاء مع ${targetUser.displayName}!`);
    } catch (e) {
      console.error('Accept friend request error:', e);
      toast.error('تعذر قبول الطلب');
    }
  };

  const handleBlockUser = async (targetUserId: string) => {
    if (!loggedInProfile) return;
    if (confirmBlockId !== targetUserId) {
      setConfirmBlockId(targetUserId);
      return;
    }
    try {
      const myRef = doc(db, 'users', loggedInProfile.uid);
      await updateDoc(myRef, {
        blockedUsers: arrayUnion(targetUserId),
        friends: arrayRemove(targetUserId)
      });
      const theirRef = doc(db, 'users', targetUserId);
      await updateDoc(theirRef, {
        friends: arrayRemove(loggedInProfile.uid)
      });
      setActionUserId(null);
      setConfirmBlockId(null);
      toast.success('تم حظر المستخدم');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${loggedInProfile.uid}`);
    }
  };

  const handleRemoveFriend = async (targetUserId: string) => {
    if (!loggedInProfile) return;
    try {
      const myRef = doc(db, 'users', loggedInProfile.uid);
      const theirRef = doc(db, 'users', targetUserId);
      
      await updateDoc(myRef, { friends: arrayRemove(targetUserId) });
      await updateDoc(theirRef, { friends: arrayRemove(loggedInProfile.uid) });
      setActionUserId(null);
      toast.success('تمت الإزالة من قائمة الأصدقاء');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${loggedInProfile.uid}`);
    }
  };

  const filteredUsers = users.filter(u => {
    const searchLower = search.toLowerCase();
    const matchesSearch = !search || (
      (u.displayName?.toLowerCase().includes(searchLower) ?? false) || 
      (u.subject?.toLowerCase().includes(searchLower) ?? false) ||
      (u.email?.toLowerCase().includes(searchLower) ?? false) ||
      (u.phoneNumber?.includes(search) ?? false)
    );
    
    const matchesWilaya = !wilayaFilter || (u.wilaya && (
      u.wilaya === wilayaFilter || 
      wilayaFilter.includes(u.wilaya) || 
      u.wilaya.includes(wilayaFilter.split('(')[0].trim()) || 
      u.wilaya.includes(wilayaFilter.split('(')[1]?.replace(')', '') || '')
    ));
    return matchesSearch && matchesWilaya;
  });

  const WILAYAS = [
  "01 - أدرار (Adrar)", "02 - الشلف (Chlef)", "03 - الأغواط (Laghouat)", "04 - أم البواقي (Oum El Bouaghi)", "05 - باتنة (Batna)", "06 - بجاية (Béjaïa)", "07 - بسكرة (Biskra)", "08 - بشار (Béchar)", "09 - البليدة (Blida)", "10 - البويرة (Bouira)",
  "11 - تمنراست (Tamanrasset)", "12 - تبسة (Tébessa)", "13 - تلمسان (Tlemcen)", "14 - تيارت (Tiaret)", "15 - تيزي وزو (Tizi Ouzou)", "16 - الجزائر (Alger)", "17 - الجلفة (Djelfa)", "18 - جيجل (Jijel)", "19 - سطيف (Sétif)", "20 - سعيدة (Saïda)",
  "21 - سكيكدة (Skikda)", "22 - سيدي بلعباس (Sidi Bel Abbès)", "23 - عنابة (Annaba)", "24 - قالمة (Guelma)", "25 - قسنطينة (Constantine)", "26 - المدية (Médéa)", "27 - مستغانم (Mostaganem)", "28 - المسيلة (M'Sila)", "29 - معسكر (Mascara)",
  "30 - ورقلة (Ouargla)", "31 - وهران (Oran)", "32 - البيض (El Bayadh)", "33 - إليزي (Illizi)", "34 - برج بوعريريج (Bordj Bou Arréridj)", "35 - بومرداس (Boumerdès)", "36 - الطارف (El Tarf)", "37 - تندوف (Tindouf)", "38 - تيسمسيلت (Tissemsilt)",
  "39 - الوادي (El Oued)", "40 - خنشلة (Khenchela)", "41 - سوق أهراس (Souk Ahras)", "42 - تيبازة (Tipaza)", "43 - ميلة (Mila)", "44 - عين الدفلى (Aïn Defla)", "45 - النعامة (Naâma)", "46 - عين تموشنت (Aïn Témouchent)", "47 - غرداية (Ghardaïa)", "48 - غليزان (Relizane)",
  "49 - المغير (El M'Ghair)", "50 - المنيعة (El Meniaa)", "51 - أولاد جلال (Ouled Djellal)", "52 - برج باجي مختار (Bordj Baji Mokhtar)", "53 - بني عباس (Béni Abbès)", "54 - تيميمون (Timimoun)", "55 - تقرت (Touggourt)", "56 - جانت (Djanet)", "57 - إن صالح (In Salah)", "58 - إن قزام (In Guezzam)"
  ];

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-xl min-h-[600px]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600/10 p-3 rounded-2xl">
              <Users className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">الزملاء - Colleagues</h2>
              <p className="text-sm text-slate-500 font-medium">Connect with teachers across Algeria</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search name or subject..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all font-bold"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select 
              className="px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none font-bold"
              value={wilayaFilter}
              onChange={(e) => setWilayaFilter(e.target.value)}
            >
              <option value="">All Wilayas</option>
              {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence>
              {filteredUsers.map((user, idx) => (
                <motion.div
                  key={user.uid}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50 hover:border-purple-500/30 transition-all group relative"
                >
                  <div className="absolute top-4 right-4 z-10">
                    <button 
                      onClick={() => setActionUserId(actionUserId === user.uid ? null : user.uid)}
                      className="p-1.5 text-slate-600 hover:text-white transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <AnimatePresence>
                      {actionUserId === user.uid && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -10 }}
                          className="absolute right-0 top-8 bg-slate-900 border border-slate-800 rounded-xl py-2 w-40 shadow-2xl z-20"
                        >
                          {loggedInProfile?.friends?.includes(user.uid) && (
                            <button 
                              onClick={() => handleRemoveFriend(user.uid)}
                              className="w-full px-4 py-2 text-right text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-between"
                            >
                              <span>حذف من الزملاء</span>
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button 
                            onClick={() => handleBlockUser(user.uid)}
                            className="w-full px-4 py-2 text-right text-xs font-bold text-red-500 hover:bg-red-500/10 flex items-center justify-between"
                          >
                            <span>{confirmBlockId === user.uid ? 'اضغط للتأكيد' : 'حظر المستخدم'}</span>
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex gap-4">
                    <img 
                      src={user.photoURL} 
                      className="w-16 h-16 rounded-xl object-cover ring-2 ring-purple-500/10 group-hover:ring-purple-500/30 transition-all"
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <Link to={`/profile/${user.uid}`} className="text-lg font-black text-white hover:text-purple-400 truncate block">
                        {user.displayName}
                      </Link>
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mt-1">
                        <GraduationCap className="w-3 h-3" />
                        <span>{user.subject || 'Education'} • {user.level || 'General'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mt-1">
                        <MapPin className="w-3 h-3" />
                        <span>{user.wilaya || 'Algeria'}</span>
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const inv = invitations.find((i) => i.participants?.includes(user.uid));
                    const isConnected = !!loggedInProfile?.friends?.includes(user.uid) || inv?.status === 'accepted';
                    const isPending = inv?.status === 'pending';
                    const isIncoming = isPending && inv?.senderId !== loggedInProfile?.uid;

                    return (
                      <div className="mt-4 flex gap-2">
                        <Link 
                          to={`/profile/${user.uid}`}
                          className="py-2 px-3 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black text-slate-400 hover:text-white hover:bg-slate-800 transition-all text-center"
                        >
                          الملف الشخصي
                        </Link>
                        {isConnected ? (
                          <span className="flex-1 py-2 px-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-black flex items-center justify-center gap-1">
                            <UserCheck className="w-3.5 h-3.5" />
                            صديق
                          </span>
                        ) : isIncoming ? (
                          <button
                            type="button"
                            onClick={() => handleAcceptFriendRequest(inv, user)}
                            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black flex items-center justify-center gap-1 transition-all"
                          >
                            <Check className="w-3.5 h-3.5" />
                            قبول الطلب
                          </button>
                        ) : isPending ? (
                          <span className="flex-1 py-2 px-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-[10px] font-black flex items-center justify-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            تم الإرسال
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendFriendRequest(user)}
                            className="flex-1 py-2 px-3 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 rounded-xl text-[10px] font-black flex items-center justify-center gap-1 transition-all"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            طلب محادثة
                          </button>
                        )}
                        <button 
                          onClick={() => window.dispatchEvent(new CustomEvent('show-chat', { detail: user }))}
                          className="p-2 bg-purple-600/10 text-purple-400 rounded-xl hover:bg-purple-600 hover:text-white transition-all shadow-lg shadow-purple-500/10"
                          title={isConnected ? 'فتح المحادثة' : 'إرسال دعوة رسالة'}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })()}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {!loading && filteredUsers.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="bg-slate-950 w-16 h-16 rounded-full flex items-center justify-center mx-auto border border-slate-800">
              <Users className="w-8 h-8 text-slate-700" />
            </div>
            <p className="text-slate-500 font-bold">No colleagues found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
