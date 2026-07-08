const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

code = code.replace("import { PrayerWaterBar } from '../components/PrayerWaterBar';\n", "");
code = code.replace("      <PrayerWaterBar />\n", "");

fs.writeFileSync('src/pages/Home.tsx', code);
