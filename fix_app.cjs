const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes("import { PrayerWaterBar }")) {
  code = code.replace("import { FriendSuggestions } from './components/FriendSuggestions';", "import { FriendSuggestions } from './components/FriendSuggestions';\nimport { PrayerWaterBar } from './components/PrayerWaterBar';");
}

code = code.replace(
  '<div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8">',
  '{user && profile?.isProfileComplete && <div className="mb-6"><PrayerWaterBar /></div>}\n                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8">'
);

fs.writeFileSync('src/App.tsx', code);
