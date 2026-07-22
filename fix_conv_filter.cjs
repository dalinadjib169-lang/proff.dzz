const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

const target = `const inv = allInvitations.find(i => i.participants.includes(c.uid));
                              return inv && inv.status === 'accepted';`;

const replacement = `const isAlreadyFriend = !!(profile.friends?.includes(c.uid) || profile.followers?.includes(c.uid) || profile.following?.includes(c.uid));
                              const inv = allInvitations.find(i => i.participants.includes(c.uid));
                              return isAlreadyFriend || (inv && inv.status === 'accepted');`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  code = code.replace(`const inv = allInvitations.find(i => i.participants.includes(c.uid));
                          return inv && inv.status === 'accepted';`, replacement);
  fs.writeFileSync('src/components/ChatBubble.tsx', code);
  console.log('Success conv filter');
} else {
  console.log('Target not found!');
}
