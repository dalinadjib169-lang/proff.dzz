const fs = require('fs');
let code = fs.readFileSync('src/pages/Discussions.tsx', 'utf8');
code = code.replace("import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, limit, doc, getDoc, updateDoc, increment, Timestamp } from 'firebase/firestore';", "import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, limit, doc, getDoc, updateDoc, increment, Timestamp, deleteDoc } from 'firebase/firestore';");
fs.writeFileSync('src/pages/Discussions.tsx', code);
console.log('Success imports fixed');
