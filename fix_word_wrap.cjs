const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

const target = `{msg.text && <p className="whitespace-pre-wrap select-text break-words" dir="auto">{msg.text}</p>}`;
const replacement = `{msg.text && <p className="whitespace-pre-wrap select-text" style={{ wordBreak: 'normal', overflowWrap: 'break-word' }} dir="auto">{msg.text}</p>}`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/ChatBubble.tsx', code);
  console.log('Success ChatBubble wrap');
} else {
  console.log('Target not found in ChatBubble!');
}

let discCode = fs.readFileSync('src/pages/Discussions.tsx', 'utf8');
const discTarget = `<p className="whitespace-pre-wrap leading-relaxed text-sm" dir="rtl">{msg.text}</p>`;
const discReplacement = `<p className="whitespace-pre-wrap leading-relaxed text-sm" style={{ wordBreak: 'normal', overflowWrap: 'break-word' }} dir="auto">{msg.text}</p>`;

if (discCode.includes(discTarget)) {
  discCode = discCode.replace(discTarget, discReplacement);
  fs.writeFileSync('src/pages/Discussions.tsx', discCode);
  console.log('Success Discussions wrap');
} else {
  console.log('Target not found in Discussions!');
}
