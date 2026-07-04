import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, ArrowLeft, Mail, Info, FileText, Lock, Eye, Trash2, Globe } from 'lucide-react';
import { motion } from 'motion/react';

export default function Privacy() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Navigation / Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 pb-6 border-b border-slate-800/60">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition-all text-sm font-bold"
          >
            {lang === 'ar' ? (
              <>
                <ArrowRight className="w-4 h-4" />
                العودة
              </>
            ) : (
              <>
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </>
            )}
          </button>

          <div className="flex items-center gap-3 bg-slate-900 p-1.5 rounded-2xl border border-slate-850/60">
            <button
              onClick={() => setLang('ar')}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-1.5 ${
                lang === 'ar'
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-4 h-4" />
              العربية
            </button>
            <button
              onClick={() => setLang('en')}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-1.5 ${
                lang === 'en'
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-4 h-4" />
              English
            </button>
          </div>
        </div>

        {/* Brand Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-600/10 border border-purple-500/20 mb-4 shadow-xl">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-white via-purple-300 to-indigo-300 bg-clip-text text-transparent tracking-tight mb-2">
            {lang === 'ar' ? 'سياسة الخصوصية لـ TeachDZ' : 'Privacy Policy for TeachDZ'}
          </h1>
          <p className="text-slate-400 text-sm">
            {lang === 'ar'
              ? 'تاريخ آخر تحديث: 4 يوليو 2026'
              : 'Last updated: July 4, 2026'}
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-slate-900/40 backdrop-blur-3xl rounded-3xl p-6 sm:p-10 border border-slate-800/40 shadow-2xl space-y-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          {lang === 'ar' ? (
            <>
              {/* Introduction - Arabic */}
              <section className="space-y-3">
                <h2 className="text-xl font-black text-white flex items-center gap-2 border-r-4 border-primary pr-3">
                  <Info className="w-5 h-5 text-primary" />
                  مقدمة عامة
                </h2>
                <p className="text-slate-300 leading-relaxed text-sm">
                  مرحباً بك في منصة <strong>TeachDZ</strong> (المشار إليها بـ "التطبيق" أو "المنصة")، وهي شبكة تواصل تعليمية واجتماعية مخصصة للأساتذة والمعلمين الجزائريين. نحن نلتزم التزاماً كاملاً بحماية خصوصية بياناتك الشخصية وخصوصية طلابك وزملائك. توضح سياسة الخصوصية هذه كيفية جمع بياناتك، واستخدامها، وحمايتها عند استخدام تطبيقنا.
                </p>
                <p className="text-slate-300 leading-relaxed text-sm">
                  بمجرد استخدامك لتطبيق TeachDZ، فإنك توافق على جمع واستخدام المعلومات وفقاً لهذه السياسة.
                </p>
              </section>

              {/* Information Collection - Arabic */}
              <section className="space-y-3">
                <h2 className="text-xl font-black text-white flex items-center gap-2 border-r-4 border-primary pr-3">
                  <FileText className="w-5 h-5 text-primary" />
                  المعلومات التي نجمعها وكيفية جمعها
                </h2>
                <p className="text-slate-300 leading-relaxed text-sm">
                  نقوم بجمع أنواع مختلفة من المعلومات لتقديم خدماتنا التعليمية والاجتماعية وتحسينها باستمرار:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50">
                    <h3 className="font-bold text-white mb-1.5 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full" />
                      البيانات الشخصية والملف الشخصي
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      عند إنشاء حساب، نطلب معلومات مثل الاسم، البريد الإلكتروني، التخصص الأكاديمي، الولاية، والمستوى التعليمي الذي تدرسه لتخصيص تجربتك وعرض زملائك المناسبين.
                    </p>
                  </div>
                  <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50">
                    <h3 className="font-bold text-white mb-1.5 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full" />
                      المحتوى المرفوع والمنشورات
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      نقوم بحفظ المنشورات، التعليقات، المناهج الدراسية، القصص (Stories)، والصور المرفوعة عبر خدمات سحابية آمنة ليتم عرضها لزملائك المسجلين في التطبيق.
                    </p>
                  </div>
                  <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50">
                    <h3 className="font-bold text-white mb-1.5 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full" />
                      المحادثات والرسائل الفورية
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      يتم تخزين رسائل الدردشة الخاصة بينك وبين زملائك أو داخل المجموعات التعليمية بشكل آمن في قاعدة بياناتنا المشفرة لضمان استمرارية الاتصال ووصول الرسائل.
                    </p>
                  </div>
                  <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50">
                    <h3 className="font-bold text-white mb-1.5 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full" />
                      المنتجات في سوق الأساتذة
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      عند عرض أدوات تعليمية أو كتب في سوق المنصة، نحتفظ ببيانات المنتج وصوره وسعره لتسهيل التواصل والطلب بين الأساتذة المهتمين.
                    </p>
                  </div>
                </div>
              </section>

              {/* Data Usage - Arabic */}
              <section className="space-y-3">
                <h2 className="text-xl font-black text-white flex items-center gap-2 border-r-4 border-primary pr-3">
                  <Eye className="w-5 h-5 text-primary" />
                  كيفية استخدام البيانات
                </h2>
                <p className="text-slate-300 leading-relaxed text-sm">
                  نستخدم البيانات التي نجمعها للأغراض التالية:
                </p>
                <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 pr-2">
                  <li>تشغيل المنصة وتوفير ميزاتها مثل النشر، التعليق، الدردشة، وإعدادات الملف الشخصي.</li>
                  <li>تقديم اقتراحات مخصصة لمتابعة زملائك من نفس الولاية أو التخصص الأكاديمي.</li>
                  <li>إرسال الإشعارات الفورية داخل التطبيق لإعلامك بالتفاعلات الجديدة، طلبات الصداقة، والرسائل.</li>
                  <li>حماية المنصة من الاستخدام المسيء وتوفير بيئة تعليمية آمنة ومحترمة تليق بالأساتذة والتربية والتعليم.</li>
                </ul>
              </section>

              {/* Data Sharing & Storage - Arabic */}
              <section className="space-y-3">
                <h2 className="text-xl font-black text-white flex items-center gap-2 border-r-4 border-primary pr-3">
                  <Lock className="w-5 h-5 text-primary" />
                  تخزين وحماية ومشاركة البيانات
                </h2>
                <p className="text-slate-300 leading-relaxed text-sm font-bold">
                  نحن لا نبيع أو نؤجر أو نشارك بياناتك الشخصية مع أي جهات خارجية لأغراض تسويقية على الإطلاق.
                </p>
                <p className="text-slate-300 leading-relaxed text-sm">
                  يتم تخزين بياناتك بشكل آمن عبر البنى التحتية السحابية لشركة <strong>Google Firebase</strong> (بما في ذلك خدمات المصادقة وقواعد البيانات Firestore) بالإضافة إلى خدمة <strong>Cloudinary</strong> لإدارة وتخزين الصور والملفات المرفوعة بأعلى معايير الأمان المتبعة عالمياً.
                </p>
              </section>

              {/* Security and Recovery - Arabic */}
              <section className="space-y-3 bg-slate-950/50 p-6 rounded-2xl border border-orange-500/20">
                <h2 className="text-xl font-black text-white flex items-center gap-2 border-r-4 border-orange-500 pr-3">
                  <Shield className="w-5 h-5 text-orange-400" />
                  حماية المنصة من الاختراقات وقفل واسترجاع الحسابات
                </h2>
                <p className="text-slate-300 leading-relaxed text-sm">
                  لحماية حسابك ومنع أي تدخلات خارجية، هجمات الاختراق (XSS, SQL Injection)، أو برمجيات خبيثة:
                </p>
                <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 pr-2">
                  <li><strong>فحص التهديدات بالذكاء الاصطناعي:</strong> نقوم بفحص المنشورات والتعليقات والطلبات المرفوعة بشكل فوري وتلقائي باستخدام نماذج الذكاء الاصطناعي المتقدمة (AI Security Shields) لرصد ومنع أي محاولات اختراق أو حقن برمجيات خبيثة.</li>
                  <li><strong>قفل الحساب التلقائي واليدوي:</strong> في حال رصد أي هجوم أو نشاط مشبوه، يقوم النظام بقفل الحساب فوراً لحماية بيانات المستخدم. كما يمكن للمستخدم قفل حسابه يدوياً في أي وقت من الإعدادات كإجراء وقائي.</li>
                  <li><strong>استرجاع الحساب الآمن:</strong> يمكن للمستخدم استرجاع حسابه المقفل أو المحمي من خلال تأكيد ملكيته عبر البريد الإلكتروني الخاص به أو رقم الهاتف المسجل بكل أمان وسهولة.</li>
                </ul>
              </section>

              {/* Rights & Data Deletion - Arabic (CRITICAL PLAY STORE REQUIREMENT) */}
              <section className="space-y-3 bg-slate-950/50 p-6 rounded-2xl border border-primary/20">
                <h2 className="text-xl font-black text-white flex items-center gap-2 border-r-4 border-primary pr-3">
                  <Trash2 className="w-5 h-5 text-red-400" />
                  حقوق المستخدم وحذف الحساب والبيانات
                </h2>
                <p className="text-slate-300 leading-relaxed text-sm">
                  كجزء من الشفافية والتزامنا الصارم بسياسات Google Play ومطوري البرامج:
                </p>
                <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 pr-2">
                  <li><strong>تعديل البيانات:</strong> يمكنك تحديث معلومات ملفك الشخصي وصورتك وإعداداتك في أي وقت مباشرة من صفحة الإعدادات بالتطبيق.</li>
                  <li><strong>حذف البيانات والحساب بالكامل:</strong> يمكنك طلب حذف حسابك نهائياً من قاعدة بياناتنا في أي وقت. لحذف حسابك وكل منشوراتك ورسائلك وصورك بشكل فوري، يرجى الانتقال إلى الإعدادات والنقر على خيار "حذف الحساب نهائياً"، أو مراسلتنا مباشرة على البريد الإلكتروني المذكور أدناه، وسنقوم بحذف كافة بياناتك في غضون 48 ساعة كحد أقصى.</li>
                </ul>
              </section>

              {/* Contact Us - Arabic */}
              <section className="space-y-3">
                <h2 className="text-xl font-black text-white flex items-center gap-2 border-r-4 border-primary pr-3">
                  <Mail className="w-5 h-5 text-primary" />
                  اتصل بنا
                </h2>
                <p className="text-slate-300 leading-relaxed text-sm">
                  إذا كان لديك أي أسئلة، استفسارات، أو طلبات تتعلق بخصوصية بياناتك أو رغبة في حذف حسابك، فلا تتردد في الاتصال بنا عبر:
                </p>
                <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800/50 flex items-center gap-3 w-fit">
                  <Mail className="w-5 h-5 text-purple-400" />
                  <span className="text-sm font-mono text-white select-all">dalinadjib1990@gmail.com</span>
                </div>
              </section>
            </>
          ) : (
            <>
              {/* Introduction - English */}
              <section className="space-y-3">
                <h2 className="text-xl font-black text-white flex items-center gap-2 border-l-4 border-primary pl-3">
                  <Info className="w-5 h-5 text-primary" />
                  Introduction
                </h2>
                <p className="text-slate-300 leading-relaxed text-sm">
                  Welcome to <strong>TeachDZ</strong> (referred to as the "App" or "Platform"), an educational and social networking platform dedicated to Algerian teachers and educators. We are fully committed to protecting your personal privacy, as well as the privacy of your students and colleagues. This Privacy Policy explains how we collect, use, and protect your data when using our application.
                </p>
                <p className="text-slate-300 leading-relaxed text-sm">
                  By using the TeachDZ app, you agree to the collection and use of information in accordance with this policy.
                </p>
              </section>

              {/* Information Collection - English */}
              <section className="space-y-3">
                <h2 className="text-xl font-black text-white flex items-center gap-2 border-l-4 border-primary pl-3">
                  <FileText className="w-5 h-5 text-primary" />
                  Information We Collect and How We Collect It
                </h2>
                <p className="text-slate-300 leading-relaxed text-sm">
                  We collect various types of information to provide and continuously improve our educational and social services:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50">
                    <h3 className="font-bold text-white mb-1.5 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full" />
                      Personal Profile Data
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      When creating an account, we request information such as name, email, academic specialization, state, and teaching level to personalize your experience and show you relevant colleagues.
                    </p>
                  </div>
                  <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50">
                    <h3 className="font-bold text-white mb-1.5 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full" />
                      Uploaded Content & Posts
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      We store your posts, comments, educational files, curriculum documents, stories, and uploaded images through secure cloud services to present them to registered educators.
                    </p>
                  </div>
                  <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50">
                    <h3 className="font-bold text-white mb-1.5 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full" />
                      Chats & Direct Messages
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Private chat messages between you and your colleagues or within educational groups are stored securely in our encrypted database to ensure connection persistence and prompt delivery.
                    </p>
                  </div>
                  <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/50">
                    <h3 className="font-bold text-white mb-1.5 text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-purple-500 rounded-full" />
                      Teachers' Marketplace items
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      When displaying educational tools, books, or material in the marketplace, we keep details, images, and prices of items to facilitate smooth communication and ordering between teachers.
                    </p>
                  </div>
                </div>
              </section>

              {/* Data Usage - English */}
              <section className="space-y-3">
                <h2 className="text-xl font-black text-white flex items-center gap-2 border-l-4 border-primary pl-3">
                  <Eye className="w-5 h-5 text-primary" />
                  How We Use Your Information
                </h2>
                <p className="text-slate-300 leading-relaxed text-sm">
                  We use the collected data for the following purposes:
                </p>
                <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 pl-2">
                  <li>Operating the platform and providing its features (posting, commenting, chatting, and settings).</li>
                  <li>Offering customized suggestions to follow colleagues from the same state or academic specialization.</li>
                  <li>Sending instant in-app and push notifications for new interactions, connection requests, and messages.</li>
                  <li>Securing the platform from misuse and maintaining a safe, respectful educational workspace for educators.</li>
                </ul>
              </section>

              {/* Data Sharing & Storage - English */}
              <section className="space-y-3">
                <h2 className="text-xl font-black text-white flex items-center gap-2 border-l-4 border-primary pl-3">
                  <Lock className="w-5 h-5 text-primary" />
                  Data Storage, Security, and Sharing
                </h2>
                <p className="text-slate-300 leading-relaxed text-sm font-bold">
                  We strictly never sell, rent, or share your personal data with third parties for marketing purposes.
                </p>
                <p className="text-slate-300 leading-relaxed text-sm">
                  Your data is securely stored using <strong>Google Firebase</strong> cloud infrastructure (including Firebase Authentication and Firestore databases) and <strong>Cloudinary</strong> for robust storage and delivery of images and files using state-of-the-art global industry security standards.
                </p>
              </section>

              {/* Security and Recovery - English */}
              <section className="space-y-3 bg-slate-950/50 p-6 rounded-2xl border border-orange-500/20">
                <h2 className="text-xl font-black text-white flex items-center gap-2 border-l-4 border-orange-500 pl-3">
                  <Shield className="w-5 h-5 text-orange-400" />
                  Platform Cyber Security, Account Locking & Recovery
                </h2>
                <p className="text-slate-300 leading-relaxed text-sm">
                  To secure your account and prevent any external cyber threats, hacking attacks (XSS, SQL Injection), or malicious malware:
                </p>
                <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 pl-2">
                  <li><strong>AI-Powered Security Scanning:</strong> We scan posts, comments, and requests in real time using advanced artificial intelligence models (AI Security Shields) to identify and block hacking payloads or unauthorized exploits instantly.</li>
                  <li><strong>Automated & Manual Account Locking:</strong> If any malicious exploit attempt is intercepted, the system automatically freezes and locks the source account to preserve user data. Users can also lock their accounts manually from the settings menu at any time.</li>
                  <li><strong>Secure Account Recovery:</strong> Users can securely unlock and recover locked accounts by confirming ownership via their registered email address or phone number, ensuring safe, hassle-free restoration.</li>
                </ul>
              </section>

              {/* Rights & Data Deletion - English (CRITICAL PLAY STORE REQUIREMENT) */}
              <section className="space-y-3 bg-slate-950/50 p-6 rounded-2xl border border-primary/20">
                <h2 className="text-xl font-black text-white flex items-center gap-2 border-l-4 border-primary pl-3">
                  <Trash2 className="w-5 h-5 text-red-400" />
                  User Rights and Complete Account/Data Deletion
                </h2>
                <p className="text-slate-300 leading-relaxed text-sm">
                  To ensure complete transparency and full compliance with Google Play Developer Policies:
                </p>
                <ul className="list-disc list-inside text-sm text-slate-300 space-y-2 pl-2">
                  <li><strong>Modifying Data:</strong> You can update your profile details, photo, and settings at any time directly through the Settings page in the application.</li>
                  <li><strong>Complete Data & Account Deletion:</strong> You have the right to request the permanent deletion of your account and all associated data at any time. To instantly delete your profile, posts, messages, and uploaded files, navigate to Settings and tap "Delete Account Permanently", or contact us via email, and we will wipe all your data from our servers within a maximum of 48 hours.</li>
                </ul>
              </section>

              {/* Contact Us - English */}
              <section className="space-y-3">
                <h2 className="text-xl font-black text-white flex items-center gap-2 border-l-4 border-primary pl-3">
                  <Mail className="w-5 h-5 text-primary" />
                  Contact Us
                </h2>
                <p className="text-slate-300 leading-relaxed text-sm">
                  If you have any questions, concerns, or requests regarding this Privacy Policy or account deletion, feel free to contact us:
                </p>
                <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800/50 flex items-center gap-3 w-fit">
                  <Mail className="w-5 h-5 text-purple-400" />
                  <span className="text-sm font-mono text-white select-all">dalinadjib1990@gmail.com</span>
                </div>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-xs text-slate-500">
          <p>© 2026 TeachDZ. {lang === 'ar' ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}</p>
        </div>
      </div>
    </div>
  );
}
