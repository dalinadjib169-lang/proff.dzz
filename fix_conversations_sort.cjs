const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

const target = `      setConversations(Array.from(convosMap.values()));`;

const replacement = `      const convos = Array.from(convosMap.values());
      convos.sort((a, b) => {
        const timeA = a.lastTime?.toMillis ? a.lastTime.toMillis() : 0;
        const timeB = b.lastTime?.toMillis ? b.lastTime.toMillis() : 0;
        return timeB - timeA;
      });
      setConversations(convos);`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/ChatBubble.tsx', code);
  console.log('Success conversations sort');
} else {
  console.log('Target not found!');
}
