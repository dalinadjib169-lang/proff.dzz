const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

const target = `  // Check friendship status for activeChat
  useEffect(() => {
    setLocalIsFriendOverride(false); // Reset override on chat change
    if (!profile?.uid || !activeChat?.uid || activeChat.uid === 'global') {
      setIsFriend(true); 
      setFriendRequest(null);
      return;
    }

    const q = query(
      collection(db, 'invitations'),
      where('participants', 'array-contains', profile.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const invs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      setAllInvitations(invs);
      const inv = invs.find(i => i.participants.includes(activeChat.uid));
      
      if (inv) {
        setFriendRequest(inv);
        setIsFriend(inv.status === 'accepted');
      } else {
        setFriendRequest(null);
        setIsFriend(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'invitations');
    });

    return unsubscribe;
  }, [profile?.uid, activeChat?.uid]);`;

const replacement = `  // Check friendship status for activeChat
  useEffect(() => {
    setLocalIsFriendOverride(false); // Reset override on chat change
    if (!profile?.uid || !activeChat?.uid || activeChat.uid === 'global') {
      setIsFriend(true); 
      setFriendRequest(null);
      return;
    }

    const isAlreadyFriend = !!(profile.friends?.includes(activeChat.uid) || profile.followers?.includes(activeChat.uid) || profile.following?.includes(activeChat.uid));

    const q = query(
      collection(db, 'invitations'),
      where('participants', 'array-contains', profile.uid)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const invs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      setAllInvitations(invs);
      const inv = invs.find(i => i.participants.includes(activeChat.uid));
      
      if (inv) {
        setFriendRequest(inv);
        setIsFriend(inv.status === 'accepted' || isAlreadyFriend);
      } else {
        setFriendRequest(null);
        setIsFriend(isAlreadyFriend);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'invitations');
    });

    return unsubscribe;
  }, [profile, activeChat?.uid]);`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/ChatBubble.tsx', code);
  console.log('Success isFriend logic');
} else {
  console.log('Target not found!');
}
