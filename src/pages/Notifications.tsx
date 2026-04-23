import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDocs, deleteDoc, addDoc, serverTimestamp, writeBatch, arrayUnion, limit, Timestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Notification } from '../types';
import { Heart, MessageCircle, UserPlus, Bell, Check, GraduationCap, X, UserCheck, ShoppingBag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { playSound } from '../lib/sounds';

export default function Notifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!profile?.uid) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', profile.uid),
      orderBy('createdAt', 'desc')
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
      }) as any as Notification[];
      
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

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
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
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'notifications');
    }
  };

  const handleAcceptConnection = async (notification: Notification) => {
    if (!profile?.uid || !notification.senderId) return;
    try {
      const q = query(
        collection(db, 'invitations'),
        where('recipientId', '==', profile.uid),
        where('senderId', '==', notification.senderId),
        where('status', '==', 'pending'),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const invDoc = snapshot.docs[0];
        const batch = writeBatch(db);
        
        // Update invitation status
        batch.update(doc(db, 'invitations', invDoc.id), { 
          status: 'accepted',
          updatedAt: serverTimestamp()
        });
        
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
        
        await batch.commit();
        playSound('notification');
      } else {
        console.warn("No pending invitation found for this notification.");
        // Fallback: just mark notification as read
        await updateDoc(doc(db, 'notifications', notification.id), { read: true });
      }
    } catch (error) {
      console.error("Error accepting connection:", error);
      handleFirestoreError(error, OperationType.UPDATE, 'invitations');
    }
  };

  const handleDeclineConnection = async (notification: Notification) => {
    if (!profile?.uid || !notification.senderId) return;
    try {
      const q = query(
        collection(db, 'invitations'),
        where('recipientId', '==', profile.uid),
        where('senderId', '==', notification.senderId),
        where('status', '==', 'pending'),
        limit(1)
      );
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      if (!snapshot.empty) {
        batch.delete(doc(db, 'invitations', snapshot.docs[0].id));
      }
      batch.update(doc(db, 'notifications', notification.id), { read: true });
      await batch.commit();
    } catch (error) {
      console.error("Error declining connection:", error);
      handleFirestoreError(error, OperationType.DELETE, 'invitations');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="w-5 h-5 text-red-500 fill-red-500" />;
      case 'comment': return <MessageCircle className="w-5 h-5 text-purple-500 fill-purple-500" />;
      case 'follow': return <UserPlus className="w-5 h-5 text-blue-500 fill-blue-500" />;
      case 'market_interest': return <ShoppingBag className="w-5 h-5 text-orange-500" />;
      default: return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-slate-900 p-6 rounded-3xl shadow-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 p-2 rounded-xl shadow-lg shadow-purple-500/20">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Notifications</h1>
        </div>
        <button 
          onClick={markAllAsRead}
          className="flex items-center gap-2 px-4 py-2 text-purple-400 hover:bg-purple-500/10 rounded-xl font-bold text-sm transition-all"
        >
          <Check className="w-4 h-4" />
          Mark all as read
        </button>
      </div>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
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
                  {n.type === 'like' && 'liked your post'}
                  {n.type === 'comment' && 'commented on your post'}
                  {n.type === 'follow' && 'sent you a connection request'}
                  {n.type === 'market_interest' && (n.message || 'is interested in your product')}
                </p>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
                  {n.createdAt ? formatDistanceToNow(n.createdAt.toDate()) + ' ago' : 'Just now'}
                </p>
                
                {n.type === 'follow' && !n.read && (
                  <div className="flex gap-2 mt-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleAcceptConnection(n); }}
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Accept
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeclineConnection(n); }}
                      className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-black rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      Decline
                    </button>
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
