const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

const targetStr = `type: 'like' | 'comment' | 'follow' | 'market_interest' | 'group_invite' | 'group_request' | 'group_accepted' | 'group_rejected';`;

const replacement = `type: 'like' | 'comment' | 'follow' | 'market_interest' | 'group_invite' | 'group_request' | 'group_accepted' | 'group_rejected' | 'friend_request_accepted' | 'friend_request_declined' | 'group_addition';`;

code = code.replace(targetStr, replacement);
fs.writeFileSync('src/types.ts', code);
console.log('Success replace');
