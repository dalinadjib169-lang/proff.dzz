const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

const targetStr = `                    {/* Avatar Container */}
                    <div className="relative w-12 h-12 rounded-2xl border-2 border-slate-900 overflow-hidden shadow-2xl bg-slate-900 ring-2 ring-purple-500/40 group-hover:ring-purple-500 transition-all duration-300 group-hover:scale-105 pointer-events-none">`;

const replacement = `                    {/* Message Preview Bubble */}
                    {(hasUnread || true) && (() => {
                      const conv = conversations.find(c => c.uid === head.uid);
                      const displayMsg = conv?.lastMessage;
                      if (!displayMsg) return null;
                      return (
                        <div className={\`absolute right-full mr-3 top-1/2 -translate-y-1/2 max-w-[150px] bg-slate-900/95 border border-slate-700/50 rounded-2xl rounded-tr-sm px-3 py-2 shadow-xl \${hasUnread ? 'opacity-100 scale-100' : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100'} transition-all duration-300 pointer-events-none z-[-1] backdrop-blur-sm\`}>
                          <p className={\`text-[10px] \${hasUnread ? 'font-black text-white' : 'font-bold text-slate-300'} line-clamp-2 leading-relaxed text-right dir-rtl\`}>
                            {displayMsg}
                          </p>
                        </div>
                      );
                    })()}

                    {/* Avatar Container */}
                    <div className="relative w-12 h-12 rounded-2xl border-2 border-slate-900 overflow-hidden shadow-2xl bg-slate-900 ring-2 ring-purple-500/40 group-hover:ring-purple-500 transition-all duration-300 group-hover:scale-105 pointer-events-none">`;

if (code.includes('                    {/* Avatar Container */}')) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('src/components/ChatBubble.tsx', code);
  console.log('Success adding message preview');
} else {
  console.log('Target not found');
}
