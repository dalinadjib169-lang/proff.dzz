const fs = require('fs');
let code = fs.readFileSync('src/pages/Colleagues.tsx', 'utf8');

code = code.replace(/query\(collection\(db, 'users'\), orderBy\('lastSeen', 'desc'\), limit\(100\)\)/g, "query(collection(db, 'users'), limit(500))");

fs.writeFileSync('src/pages/Colleagues.tsx', code);
console.log('Success Colleagues');
