const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

const target = `    const qMessages = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', profile.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );`;

const replacement = `    const qMessages = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', profile.uid),
      orderBy('createdAt', 'desc'),
      limit(200)
    );`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/ChatBubble.tsx', code);
  console.log('Success limit');
} else {
  console.log('Target not found!');
}
