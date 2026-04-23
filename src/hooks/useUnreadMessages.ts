import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from './useAuth';

export function useUnreadMessages() {
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile?.uid) {
      setUnreadCount(0);
      return;
    }

    // Query for all messages where user is a participant and seen is false
    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', profile.uid),
      where('seen', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Filter out messages sent by the user themselves
      const unread = snapshot.docs.filter(doc => doc.data().senderId !== profile.uid);
      setUnreadCount(unread.length);
    }, (error) => {
      console.warn("Error listening to unread messages:", error);
    });

    return unsubscribe;
  }, [profile?.uid]);

  return unreadCount;
}
