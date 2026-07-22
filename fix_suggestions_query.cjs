const fs = require('fs');
let code = fs.readFileSync('src/components/FriendSuggestions.tsx', 'utf8');

code = code.replace(/query\(collection\(db, 'users'\), orderBy\('createdAt', 'desc'\), limit\(100\)\)/g, "query(collection(db, 'users'), limit(500))");

fs.writeFileSync('src/components/FriendSuggestions.tsx', code);
console.log('Success suggestions query');
