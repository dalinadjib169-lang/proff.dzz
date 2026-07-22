const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

code = code.replace(/drag=\{!isMobile\}/g, 'drag={false}');

fs.writeFileSync('src/components/ChatBubble.tsx', code);
console.log('Success drag all');
