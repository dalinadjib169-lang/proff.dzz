const fs = require('fs');
let code = fs.readFileSync('src/pages/Notifications.tsx', 'utf8');

const markAllLogic = `  useEffect(() => {
    // Automatically mark all as read when opening notifications
    if (notifications.length > 0 && notifications.some(n => !n.read)) {
      const timer = setTimeout(() => {
        markAllAsRead();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [notifications]);`;

if (!code.includes('// Automatically mark all as read')) {
  code = code.replace('  const markAsRead = async (id: string) => {', markAllLogic + '\n\n  const markAsRead = async (id: string) => {');
  fs.writeFileSync('src/pages/Notifications.tsx', code);
  console.log('Success markAllLogic');
}
