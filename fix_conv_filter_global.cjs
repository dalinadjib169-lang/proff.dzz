const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

const target = /const inv = allInvitations\.find\(i => i\.participants\.includes\(c\.uid\)\);\s*return inv && inv\.status === 'accepted';/g;

const replacement = `const isAlreadyFriend = !!(profile.friends?.includes(c.uid) || profile.followers?.includes(c.uid) || profile.following?.includes(c.uid));
                              const inv = allInvitations.find(i => i.participants.includes(c.uid));
                              return isAlreadyFriend || (inv && inv.status === 'accepted');`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/ChatBubble.tsx', code);
console.log('Success conv filter global');
