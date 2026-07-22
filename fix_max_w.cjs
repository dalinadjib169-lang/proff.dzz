const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

const target1 = `                        <div className="group relative">
                          <div 
                            className={\`max-w-[85%] p-3 rounded-2xl`;

const replacement1 = `                        <div className="group relative max-w-[85%]">
                          <div 
                            className={\`p-3 rounded-2xl`;

if (code.includes(target1)) {
  code = code.replace(target1, replacement1);
  fs.writeFileSync('src/components/ChatBubble.tsx', code);
  console.log('Success max-w');
} else {
  console.log('Target not found!');
}
