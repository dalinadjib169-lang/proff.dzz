const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

code = code.replace('{incomingCall && (', '{incomingCall && !isCalling && (');

fs.writeFileSync('src/components/ChatBubble.tsx', code);
console.log('Success incoming');
