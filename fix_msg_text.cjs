const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

code = code.replace('<p className="whitespace-pre-wrap select-text break-words w-full overflow-hidden">{msg.text}</p>', '<p className="whitespace-pre-wrap select-text break-words" dir="auto">{msg.text}</p>');

fs.writeFileSync('src/components/ChatBubble.tsx', code);
console.log('Success msg text');
