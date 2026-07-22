const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

code = code.replace(/drag="y"/g, 'drag');
code = code.replace(/dragConstraints=\{\{ top: 0, bottom: 0 \}\}/g, 'dragConstraints={{ left: -300, right: 0, top: -600, bottom: 0 }}');

fs.writeFileSync('src/components/ChatBubble.tsx', code);
console.log('Success drag');
