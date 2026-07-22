const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

code = code.replace('className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-xs transition-all animate-bounce"', 'className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-xs transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)]"');

fs.writeFileSync('src/components/ChatBubble.tsx', code);
console.log('Success bounce');
