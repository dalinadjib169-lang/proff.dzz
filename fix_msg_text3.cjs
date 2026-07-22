const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

code = code.replace('<p className="whitespace-pre-wrap select-text" dir="auto" style={{ wordBreak: "break-word" }}>{msg.text}</p>', '<p className="whitespace-pre-wrap select-text" dir="auto" style={{ overflowWrap: "anywhere" }}>{msg.text}</p>');

fs.writeFileSync('src/components/ChatBubble.tsx', code);
console.log('Success msg text 3');
