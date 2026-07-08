const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes("import { PrayerWaterBar }")) {
  code = code.replace("import FriendSuggestions from './components/FriendSuggestions';", "import FriendSuggestions from './components/FriendSuggestions';\nimport { PrayerWaterBar } from './components/PrayerWaterBar';");
}
fs.writeFileSync('src/App.tsx', code);
