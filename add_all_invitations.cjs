const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

const stateInsert = "  const [allInvitations, setAllInvitations] = useState<any[]>([]);\n";
code = code.replace('const [friendRequest, setFriendRequest] = useState<any>(null);', 'const [friendRequest, setFriendRequest] = useState<any>(null);\n' + stateInsert);

const listenerReplace = `    const unsubscribe = onSnapshot(q, (snap) => {
      const invs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      setAllInvitations(invs);
      const inv = invs.find(i => i.participants.includes(activeChat.uid));`;

const originalListener = `    const unsubscribe = onSnapshot(q, (snap) => {
      const invs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const inv = invs.find(i => i.participants.includes(activeChat.uid));`;

if (code.includes(originalListener)) {
  code = code.replace(originalListener, listenerReplace);
  fs.writeFileSync('src/components/ChatBubble.tsx', code);
  console.log('Success state insert');
} else {
  console.log('Listener not found');
}
