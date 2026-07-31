const fs = require('fs');
let code = fs.readFileSync('src/components/AcademicLoader.tsx', 'utf8');

const target = `  useEffect(() => {
    if (progress < 20) {
      setLoadingText('جاري الاتصال بقاعدة البيانات الآمنة...');
    } else if (progress < 45) {
      setLoadingText('تهيئة قاعة الفكر والمنبر الدراسي...');
    } else if (progress < 70) {
      setLoadingText('تحميل المحاور والمراجع الروحية الكبرى...');
    } else if (progress < 90) {
      setLoadingText('حضور السادة العلماء والأساتذة لتلقي طلباتكم...');
    } else {
      setLoadingText('فتح بوابة TeachDZ العلمية... أهلاً ومرحباً بكم!');
    }
  }, [progress]);`;

const replacement = `  useEffect(() => {
    if (progress < 30) {
      setLoadingText('جاري الاتصال...');
    } else if (progress < 60) {
      setLoadingText('جاري تحميل الأدوات...');
    } else if (progress < 90) {
      setLoadingText('جاري تحميل عناصر التطبيق...');
    } else {
      setLoadingText('مرحباً بك أستاذي الكريم');
    }
  }, [progress]);`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/AcademicLoader.tsx', code);
  console.log('Success loading text');
} else {
  console.log('Target not found!');
}
