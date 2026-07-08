const fs = require('fs');
const code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');
const lines = code.split('\n');
console.log(lines.slice(2575, 2660).join('\n'));
