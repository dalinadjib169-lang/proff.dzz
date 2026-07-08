const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

const targetStr = '<div className="p-4 bg-slate-900/40 border-t border-slate-800 flex flex-col gap-3">';
if (code.includes(targetStr)) {
  const replacement = '{(!friendRequest || isFriend || localIsFriendOverride || activeChat.uid === \'global\') && (\n                  ' + targetStr;
  
  // Need to also close the conditional rendering
  // The div closes right before `</>` which closes the fragment around line 3254
  
  const closingStr = '                  </div>\n                </>\n              )}\n            </div>';
  const newClosingStr = '                  </div>\n                )}\n                </>\n              )}\n            </div>';

  code = code.replace(targetStr, replacement);
  code = code.replace(closingStr, newClosingStr);
  
  fs.writeFileSync('src/components/ChatBubble.tsx', code);
  console.log('Success');
} else {
  console.log('Not found');
}
