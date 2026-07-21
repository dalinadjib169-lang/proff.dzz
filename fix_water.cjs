const fs = require('fs');
let bgCode = fs.readFileSync('src/hooks/useBackgroundFeatures.ts', 'utf8');

const targetStr = `      const now = Date.now();
      const intervalMs = waterReminderMinutes * 60 * 1000;
      
      if (!lastWaterPlayed.current || (now - lastWaterPlayed.current >= intervalMs)) {
        playWaterReminder();
        lastWaterPlayed.current = now;
      }`;

const replacement = `      const now = Date.now();
      const intervalMs = waterReminderMinutes * 60 * 1000;
      
      if (!lastWaterPlayed.current) {
        // Initialize to prevent immediate playback on load
        lastWaterPlayed.current = now;
        return;
      }
      
      if (now - lastWaterPlayed.current >= intervalMs) {
        playWaterReminder();
        lastWaterPlayed.current = now;
      }`;

if (bgCode.includes('if (!lastWaterPlayed.current || (now - lastWaterPlayed.current >= intervalMs)) {')) {
  bgCode = bgCode.replace(targetStr, replacement);
  fs.writeFileSync('src/hooks/useBackgroundFeatures.ts', bgCode);
  console.log('Success fix useBackgroundFeatures water');
} else {
  console.log('Not found in useBackgroundFeatures');
}

let pbCode = fs.readFileSync('src/components/PrayerWaterBar.tsx', 'utf8');

const pbTarget = `  useEffect(() => {
    let waterInterval: NodeJS.Timeout;
    if (isWaterEnabled) {
      waterInterval = setInterval(() => {
        playWaterSound();
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("تذكير بشرب الماء", {
            body: "حان وقت شرب كوب من الماء للحفاظ على صحتك!",
            icon: "/favicon.ico",
                silent: true
          });
        }
      }, 7200000);
    }
    return () => {
      if (waterInterval) clearInterval(waterInterval);
    };
  }, [isWaterEnabled]);`;

if (pbCode.includes('let waterInterval: NodeJS.Timeout;')) {
  pbCode = pbCode.replace(pbTarget, '');
  fs.writeFileSync('src/components/PrayerWaterBar.tsx', pbCode);
  console.log('Success remove duplicate water');
} else {
  console.log('Not found duplicate water');
}
