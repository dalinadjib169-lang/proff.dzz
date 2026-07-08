const fs = require('fs');
let code = fs.readFileSync('src/pages/Notifications.tsx', 'utf8');

if (!code.includes('react-hot-toast')) {
  code = code.replace("import { Link } from 'react-router-dom';", "import { Link } from 'react-router-dom';\nimport toast from 'react-hot-toast';");
}

const handleAcceptRegex = /const handleAcceptConnection = async \(notification: Notification\) => \{[\s\S]*?catch \(error\) \{[\s\S]*?\}\n  \};/;

const newHandleAccept = `const handleAcceptConnection = async (notification: Notification) => {
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
      
      await batch.commit();
      playSound('notification');
      toast.success(\`تم قبول صداقة \${notification.senderName || ''}\`);
    } catch (error) {
      console.error("Error accepting connection:", error);
      handleFirestoreError(error, OperationType.UPDATE, 'invitations');
    }
  };`;

code = code.replace(handleAcceptRegex, newHandleAccept);

const handleDeclineRegex = /const handleDeclineConnection = async \(notification: Notification\) => \{[\s\S]*?catch \(error\) \{[\s\S]*?\}\n  \};/;

const newHandleDecline = `const handleDeclineConnection = async (notification: Notification) => {
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
  };`;

code = code.replace(handleDeclineRegex, newHandleDecline);

code = code.replace(/>\s*Accept\s*<\/button>/g, '>قبول</button>');
code = code.replace(/>\s*Decline\s*<\/button>/g, '>رفض</button>');
code = code.replace(/'sent you a connection request'/g, "'أرسل لك طلب صداقة'");

fs.writeFileSync('src/pages/Notifications.tsx', code);
