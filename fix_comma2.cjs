const fs = require('fs');
let code = fs.readFileSync('src/components/SoulMedicine.tsx', 'utf8');
code = code.replace("  }\n\n  // --- FRIDAY SPECIAL ---", "  },\n\n  // --- FRIDAY SPECIAL ---");
fs.writeFileSync('src/components/SoulMedicine.tsx', code);
