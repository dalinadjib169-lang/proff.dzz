const fs = require('fs');
let code = fs.readFileSync('src/pages/Notifications.tsx', 'utf8');

const targetStr = `                  {n.type === 'like' && 'liked your post'}
                  {n.type === 'comment' && 'commented on your post'}
                  {n.type === 'follow' && 'أرسل لك طلب صداقة'}
                  {n.type === 'market_interest' && (n.message || 'is interested in your product')}
                </p>`;

const replacement = `                  {n.type === 'like' && 'liked your post'}
                  {n.type === 'comment' && 'commented on your post'}
                  {n.type === 'follow' && 'أرسل لك طلب صداقة'}
                  {n.type === 'market_interest' && (n.message || 'is interested in your product')}
                  {n.type === 'friend_request_accepted' && 'قام بقبول طلب المراسلة الخاص بك'}
                  {n.type === 'friend_request_declined' && 'قام برفض طلب المراسلة الخاص بك'}
                </p>`;

if (code.includes('liked your post')) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('src/pages/Notifications.tsx', code);
  console.log('Success texts');
} else {
  console.log('Not found');
}
