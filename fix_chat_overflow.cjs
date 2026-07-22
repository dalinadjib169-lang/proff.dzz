const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

code = code.replace('className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar overscroll-contain"', 'className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 custom-scrollbar overscroll-contain w-full"');

fs.writeFileSync('src/components/ChatBubble.tsx', code);
console.log('Success overflow');
