const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

const oldButton = `<button className="w-full mt-6 py-3 bg-slate-950 border border-slate-800 hover:border-primary/50 text-slate-300 hover:text-primary font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 group">
          <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
          Invite Colleague
        </button>`;

const newLink = `<Link to="/colleagues" className="w-full mt-6 py-3 bg-slate-950 border border-slate-800 hover:border-primary/50 text-slate-300 hover:text-primary font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2 group">
          <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
          عرض كل الزملاء (All Colleagues)
        </Link>`;

if (code.includes(oldButton)) {
  code = code.replace(oldButton, newLink);
  fs.writeFileSync('src/components/Sidebar.tsx', code);
  console.log('Success sidebar');
} else {
  console.log('Old button not found!');
}
