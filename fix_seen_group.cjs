const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

const target = `    const roomId = [profile.uid, activeChat.uid].sort().join('_');`;
const replacement = `    const roomId = activeChat.isGroup ? activeChat.uid : [profile.uid, activeChat.uid].sort().join('_');`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/ChatBubble.tsx', code);
  console.log('Success group seen');
} else {
  console.log('Target not found!');
}
