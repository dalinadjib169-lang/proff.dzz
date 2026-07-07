const fs = require('fs');
let code = fs.readFileSync('src/components/SoulMedicine.tsx', 'utf8');
code = code.replace("    source: 'رواه مسلم'\n  }\n  // --- FRIDAY SPECIAL ---", "    source: 'رواه مسلم'\n  },\n  // --- FRIDAY SPECIAL ---");
fs.writeFileSync('src/components/SoulMedicine.tsx', code);
