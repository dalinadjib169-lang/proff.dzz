const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

code = code.replace(/query\(collection\(db, 'users'\), orderBy\('createdAt', 'desc'\), limit\(40\)\)/g, "query(collection(db, 'users'), limit(500))");

fs.writeFileSync('src/components/Sidebar.tsx', code);
console.log('Success Sidebar query');
