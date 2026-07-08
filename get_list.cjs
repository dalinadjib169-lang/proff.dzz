const fs = require('fs');
const code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');
const startIndex = code.indexOf('{/* Recent Conversations */}');
const endIndex = code.indexOf('{activeChat.uid === \'global\' ? (', startIndex);
console.log(code.substring(startIndex - 50, startIndex + 500));
