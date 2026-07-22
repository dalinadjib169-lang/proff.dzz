const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

code = code.replace(/window\.onerror = function[\s\S]*?return false;\s*};\s*/, '');
code = code.replace(/window\.addEventListener\('unhandledrejection'[\s\S]*?\}\);\s*/, '');

fs.writeFileSync('index.html', code);
console.log('Success index.html');
