const fs = require('fs');
let code = fs.readFileSync('src/components/ChatBubble.tsx', 'utf8');

const target = `{/* Floating unread message alert (Sender name & avatar alert) */}
      {!isOpen && unreadSender && (
        <motion.div
          initial={{ opacity: 0, x: 20, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          className="absolute right-24 bottom-2 sm:bottom-4 bg-slate-950/95 border border-purple-500/50 backdrop-blur-md text-white px-3 py-2 rounded-2xl shadow-xl flex items-center gap-2.5 w-48 z-30"
          style={{ direction: 'rtl' }}
        >
          <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 ring-2 ring-purple-500/30">
            <img src={unreadSender.photoURL || '/prof_dali_logo.png'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className="text-[11px] font-black text-purple-400 truncate">{unreadSender.displayName}</p>
            <p className="text-[9px] text-slate-300 truncate">أرسل رسالة جديدة 💬</p>
          </div>
        </motion.div>
      )}`;

if (code.includes(target)) {
  code = code.replace(target, '');
  fs.writeFileSync('src/components/ChatBubble.tsx', code);
  console.log('Success floating alert');
} else {
  console.log('Target not found!');
}
