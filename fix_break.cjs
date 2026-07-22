const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

code = code.replace('<p className="whitespace-pre-wrap select-text">', '<p className="whitespace-pre-wrap select-text break-words w-full overflow-hidden">');

fs.writeFileSync('src/components/ChatBubble.tsx', code);
console.log('Success break words');
