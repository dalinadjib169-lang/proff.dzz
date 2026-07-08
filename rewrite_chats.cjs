const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

// We need to see if we can insert a state for the view
// const [chatView, setChatView] = useState<'main' | 'requests'>('main');

const index = code.indexOf('const [searchTerm, setSearchTerm] = useState(');
const insertCode = `  const [chatView, setChatView] = useState<'main' | 'requests'>('main');\n  const [searchTerm, setSearchTerm] = useState(`;
if (!code.includes('const [chatView, setChatView]')) {
    code = code.replace('const [searchTerm, setSearchTerm] = useState(', insertCode);
}
fs.writeFileSync('src/components/ChatBubble.tsx', code);
