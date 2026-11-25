import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDocs, deleteDoc, addDoc, serverTimestamp, writeBatch, arrayUnion, limit, Timestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import type { Notification as AppNotification } from '../types';
import { Heart, MessageCircle, UserPlus, Bell, Check, GraduationCap, X, UserCheck, ShoppingBag, BellRing, Volume2, Users, Mail, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { playSound, unlockAudio } from '../lib/sounds';
import { clearSystemNotifications, subscribeToPushNotifications, displayNotification, playTestNotificationSound, sendRemotePushNotification } from '../lib/notifications';

export default function Notifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'default'
  );
  const [enablingPush, setEnablingPush] = useState(false);

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', profile.uid),
      orderBy('createdAt', 'desc'),
      limit(40)
    );

    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          ...data,
          id: doc.id, 
          createdAt: data.createdAt || Timestamp.now(),
          clientCreatedAt: data.clientCreatedAt || Date.now()
        };
      }) as any as AppNotification[];
      
      // Secondary sort for instant local appearance
      notificationsData.sort((a, b) => {
        const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : a.createdAt;
        const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : b.createdAt;
        return timeB - timeA; // Descending
      });
      
      setNotifications(notificationsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });

    return unsubscribe;
  }, [profile]);

  useEffect(() => {
    // Automatically mark all as read when opening notifications
    if (notifications.length > 0 && notifications.some(n => !n.read)) {
      const timer = setTimeout(() => {
        markAllAsRead();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
      clearSystemNotifications();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    
    try {
      const batch = writeBatch(db);
      unread.forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
      clearSystemNotifications();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  };

  const handleAcceptConnection = async (notification: AppNotification) => {
    if (!profile?.uid || !notification.senderId) return;
    try {
      const q = query(
        collection(db, 'invitations'),
        where('recipientId', '==', profile.uid),
        where('senderId', '==', notification.senderId),
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      
      if (snapshot.docs.length > 0) {
        const invDoc = snapshot.docs[0];
        // Update invitation status
        batch.update(doc(db, 'invitations', invDoc.id), { 
          status: 'accepted',
          updatedAt: serverTimestamp()
        });
      }
      
      // Update both users' friends and followers
      const myRef = doc(db, 'users', profile.uid);
      const theirRef = doc(db, 'users', notification.senderId);
      
      batch.update(myRef, {
        friends: arrayUnion(notification.senderId),
        followers: arrayUnion(notification.senderId),
        following: arrayUnion(notification.senderId)
      });
      
      batch.update(theirRef, {
        friends: arrayUnion(profile.uid),
        followers: arrayUnion(profile.uid),
        following: arrayUnion(profile.uid)
      });
      
      // Mark notification as read
      batch.update(doc(db, 'notifications', notification.id), { read: true });
      
      await addDoc(collection(db, 'notifications'), {
        recipientId: notification.senderId,
        senderId: profile.uid,
        senderName: profile.displayName,
        type: 'friend_request_accepted',
        read: false,
        createdAt: serverTimestamp(),
      });

      await batch.commit();
      sendRemotePushNotification({
        recipientId: notification.senderId,
        title: `تم قبول طلب المراسلة ✅`,
        body: `وافق ${profile.displayName} على طلب التواصل، يمكنكما التحدث الآن!`,
        icon: profile.photoURL || '/prof_dali_logo.png',
        tag: `accepted-${profile.uid}`,
        url: '/',
        type: 'notification',
      });
      playSound('notification');
      toast.success(`تم قبول صداقة ${notification.senderName || ''}`);
    } catch (error) {
      console.error("Error accepting connection:", error);
      handleFirestoreError(error, OperationType.UPDATE, 'invitations');
    }
  };

  const handleDeclineConnection = async (notification: AppNotification) => {
    if (!profile?.uid || !notification.senderId) return;
    try {
      const q = query(
        collection(db, 'invitations'),
        where('recipientId', '==', profile.uid),
        where('senderId', '==', notification.senderId),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      if (snapshot.docs.length > 0) {
        batch.delete(doc(db, 'invitations', snapshot.docs[0].id));
      }
      batch.update(doc(db, 'notifications', notification.id), { read: true });
      await batch.commit();
      toast.success('تم رفض طلب الصداقة');
    } catch (error) {
      console.error("Error declining connection:", error);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-5 h-5 text-red-500 fill-red-500" />;
      case 'comment': return <MessageCircle className="w-5 h-5 text-purple-500 fill-purple-500" />;
      case 'follow': return <UserPlus className="w-5 h-5 text-blue-500 fill-blue-500" />;
      case 'message_invite': return <Mail className="w-5 h-5 text-amber-400" />;
      case 'friend_request_accepted': return <UserCheck className="w-5 h-5 text-green-500 fill-green-500" />;
      case 'friend_request_declined': return <X className="w-5 h-5 text-red-500" />;
      case 'market_interest': return <ShoppingBag className="w-5 h-5 text-orange-500" />;
      case 'group_addition': return <Users className="w-5 h-5 text-blue-400" />;
      case 'group_removed':
      case 'group_disbanded': return <ShieldAlert className="w-5 h-5 text-red-400" />;
      default: return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  const handleActivatePush = async () => {
    if (!profile?.uid) return;
    setEnablingPush(true);
    try {
      unlockAudio();
      const ok = await subscribeToPushNotifications(profile.uid);
      const perm = typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'default';
      setNotifPermission(perm);
      if (ok || perm === 'granted') {
        await updateDoc(doc(db, 'users', profile.uid), {
          'settings.isPushNotificationsEnabled': true,
          'settings.isNotificationSoundEnabled': true
        }).catch(() => {});
        playTestNotificationSound();
        await displayNotification('تم تفعيل الإشعارات بنجاح', {
          body: 'ستصلك الإشعارات الصوتية والكتابية حتى عند إغلاق التطبيق أو في الخلفية.',
          soundType: 'notification',
          url: '/notifications'
        });
        toast.success('تم تفعيل إشعارات الخلفية بنجاح');
      } else {
        toast.error('يرجى السماح بالإشعارات من إعدادات المتصفح');
      }
    } finally {
      setEnablingPush(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-6 rounded-3xl shadow-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 p-2 rounded-xl shadow-lg shadow-purple-500/20">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">الإشعارات والتنبيهات</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              unlockAudio();
              playTestNotificationSound();
              displayNotification('إشعار تجريبي - TeachDZ', {
                body: 'التنبيه الصوتي والكتابي يعمل بنجاح حتى في الخلفية.',
                soundType: 'message',
                url: '/notifications'
              });
              toast.success('تم تشغيل صوت وإشعار تجريبي');
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl font-bold text-xs transition-all border border-slate-700"
          >
            <Volume2 className="w-4 h-4" />
            تجربة الصوت
          </button>
          <button 
            onClick={markAllAsRead}
            className="flex items-center gap-2 px-4 py-2 text-purple-400 hover:bg-purple-500/10 rounded-xl font-bold text-sm transition-all"
          >
            <Check className="w-4 h-4" />
            تحديد الكل كمقروء
          </button>
        </div>
      </div>

      {notifPermission !== 'granted' && (
        <div className="bg-gradient-to-l from-indigo-900/60 to-purple-900/60 border border-indigo-500/30 p-5 rounded-3xl flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <BellRing className="w-6 h-6 text-indigo-300 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">تفعيل إشعارات الخلفية وقفل الشاشة (مثل فيسبوك)</h3>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                احصل على تنبيهات صوتية وكتابية فورية عند وصول رسالة أو تعليق حتى لو كان التطبيق مغلقاً.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleActivatePush}
            disabled={enablingPush}
            className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs rounded-2xl shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-60"
          >
            {enablingPush ? 'جاري التفعيل...' : 'تفعيل الإشعارات الآن'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(e, { offset, velocity }) => {
                const swipe = Math.abs(offset.x) * velocity.x;
                if (swipe < -1000 || swipe > 1000 || Math.abs(offset.x) > 100) {
                  handleDeleteNotification(n.id);
                }
              }}
              className={`group relative flex items-center gap-4 p-5 rounded-3xl border transition-all ${
                n.read ? 'bg-slate-900 border-slate-800' : 'bg-purple-500/5 border-purple-500/20 shadow-lg shadow-purple-500/5'
              }`}
              onClick={() => !n.read && markAsRead(n.id)}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-slate-900 p-1 rounded-lg shadow-sm border border-slate-800">
                  {getIcon(n.type)}
                </div>
              </div>

              <div className="flex-1">
                <p className="text-slate-300 font-medium">
                  <span className="font-black text-white">{n.senderName}</span>{' '}
                  {n.type === 'like' && 'أعجب بمنشورك'}
                  {n.type === 'comment' && 'علّق على منشورك'}
                  {n.type === 'follow' && 'أرسل لك طلب صداقة ومراسلة'}
                  {n.type === 'message_invite' && `أرسل لك دعوة محادثة: "${n.message || 'يريد التحدث معك'}"`}
                  {n.type === 'market_interest' && (n.message || 'مهتم بمنتجك في السوق')}
                  {n.type === 'friend_request_accepted' && 'قام بقبول طلب المراسلة الخاص بك'}
                  {n.type === 'friend_request_declined' && 'قام برفض طلب المراسلة الخاص بك'}
                  {n.type === 'group_addition' && `أضافك إلى مجموعة: ${(n as any).groupName || 'مجموعة محادثة'}`}
                  {n.type === 'group_removed' && `أزالك من مجموعة: ${(n as any).groupName || 'مجموعة محادثة'}`}
                  {n.type === 'group_disbanded' && `قام بتفكيك مجموعة: ${(n as any).groupName || 'مجموعة محادثة'}`}
                </p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
                  {n.createdAt ? formatDistanceToNow(n.createdAt.toDate()) + ' ago' : 'Just now'}
                </p>
                
                {(n.type === 'follow' || n.type === 'message_invite') && !n.read && (
                  <div className="flex gap-2 mt-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleAcceptConnection(n); }}
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />قبول</button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeclineConnection(n); }}
                      className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-black rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />رفض</button>
                  </div>
                )}
              </div>

              {n.postId && (
                <Link 
                  to={`/`} 
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-all opacity-0 group-hover:opacity-100 border border-slate-700"
                >
                  View Post
                </Link>
              )}

              {!n.read && (
                <div className="w-2 h-2 bg-purple-500 rounded-full shadow-lg shadow-purple-500/50"></div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {notifications.length === 0 && (
          <div className="text-center py-20 bg-slate-900 rounded-3xl border border-dashed border-slate-800">
            <div className="bg-slate-950 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-slate-700" />
            </div>
            <h3 className="text-slate-100 font-black text-lg mb-1">All caught up!</h3>
            <p className="text-slate-500 font-medium text-sm">No new notifications at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
