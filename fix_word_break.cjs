const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

const target = `<p className="whitespace-pre-wrap select-text min-w-fit" dir="auto" style={{ overflowWrap: "anywhere" }}>{msg.text}</p>`;
const replacement = `<p className="whitespace-pre-wrap select-text break-words" dir="auto">{msg.text}</p>`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/ChatBubble.tsx', code);
  console.log('Success word break');
} else {
  console.log('Target not found!');
}
