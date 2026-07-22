const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

const target = `<p className="whitespace-pre-wrap select-text" dir="auto" style={{ wordBreak: "break-word" }}>{msg.text}</p>`;
const replacement = `<p className="whitespace-pre-wrap select-text break-words" dir="auto">{msg.text}</p>`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/ChatBubble.tsx', code);
  console.log('Success word break 3');
} else {
  console.log('Target not found!');
}
