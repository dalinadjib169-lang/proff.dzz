const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

const targetStr = `      // Delete invitation
      await deleteDoc(doc(db, 'invitations', friendRequest.id));
      
      setActiveChat(null);`;

const replacement = `      // Delete invitation
      await deleteDoc(doc(db, 'invitations', friendRequest.id));
      
      await addDoc(collection(db, 'notifications'), {
        recipientId: activeChat!.uid,
        senderId: profile.uid,
        senderName: profile.displayName,
        type: 'friend_request_declined',
        read: false,
        createdAt: serverTimestamp()
      });
      
      setActiveChat(null);`;

code = code.replace(targetStr, replacement);
fs.writeFileSync('src/components/ChatBubble.tsx', code);
