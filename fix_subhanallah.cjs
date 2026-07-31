const fs = require('fs');
let code = fs.readFileSync('src/components/PrayerWaterBar.tsx', 'utf8');

code = code.replace("صبحان الله وبحمده: عدد خلقه، ورضا نفسه،", "سبحان الله وبحمده: عدد خلقه، ورضا نفسه،");

fs.writeFileSync('src/components/PrayerWaterBar.tsx', code);
console.log('Success subhanallah');
