import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, BookOpen, Sparkles, AlertCircle, Heart } from 'lucide-react';

interface AcademicLoaderProps {
  progress: number;
}

const ATHKAR = [
  "اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ ﷺ",
  "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ",
  "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
  "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ",
  "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ",
  "سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ",
  "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",
  "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ",
  "يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ أَصْلِحْ لِي شَأْنِي كُلَّهُ وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ"
];

export default function AcademicLoader({ progress }: AcademicLoaderProps) {
  const [loadingText, setLoadingText] = useState('جاري الدخول...');
  const [activeThikrIndex, setActiveThikrIndex] = useState(0);
  const [tasbeehCount, setTasbeehCount] = useState(0);

  // Dynamic status text in Arabic based on progress
  useEffect(() => {
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
  }, [progress]);

  // Rotate Islamic Athkar every 4 seconds automatically
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveThikrIndex((prev) => (prev + 1) % ATHKAR.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleTasbeeh = () => {
    setTasbeehCount(prev => prev + 1);
    // Visual or audio haptic triggers can go here (using audio helper if available)
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#07080e] p-4 text-white relative overflow-hidden">
      {/* Immersive spatial neon ambient lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-purple-600/10 blur-[130px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[250px] h-[250px] bg-fuchsia-500/5 blur-[110px] rounded-full pointer-events-none" />

      {/* Grid pattern overlay to look extremely tech-forward & neat */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Main Container */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] relative overflow-hidden text-center flex flex-col items-center gap-6"
      >
        {/* Decorative top gold-purple glowing ray */}
        <div className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-purple-600 via-amber-400 to-fuchsia-500 opacity-90" />

        {/* Header Badges */}
        <div className="w-full flex justify-between items-center px-1">
          <div className="flex items-center gap-1.5 text-amber-400 font-sans text-[10px] uppercase tracking-wider font-bold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
            <span>البوابة الرقمية • دواء الروح</span>
          </div>
          <div className="px-2.5 py-0.5 rounded-full border border-purple-500/20 bg-purple-500/10 text-[9px] font-mono text-purple-300 font-extrabold uppercase">
            TeachDZ Platform
          </div>
        </div>

        {/* High-Fidelity TeachDZ Glowing Image Logo representation */}
        <div className="relative mt-2">
          {/* Neon circular aura behind the logo */}
          <div className="absolute inset-0 bg-purple-500/30 blur-2xl rounded-3xl scale-110"></div>
          
          <motion.div
            animate={{ 
              y: [0, -6, 0],
            }}
            transition={{ 
              repeat: Infinity, 
              duration: 3, 
              ease: "easeInOut" 
            }}
            className="w-48 h-48 bg-gradient-to-b from-[#141522] to-[#0a0b12] rounded-[2rem] border border-white/10 flex flex-col items-center justify-center shadow-[0_15px_30px_rgba(0,0,0,0.5)] relative z-10 p-1 overflow-hidden group border-purple-500/40"
          >
            <img 
              src="/user_uploads/input_file_0.png" 
              onError={(e) => {
                // Fallback to the old logo if the uploaded image path fails
                e.currentTarget.src = "/prof_dali_logo.png";
              }}
              alt="TeachDZ Logo" 
              className="w-full h-full object-cover rounded-[1.8rem]"
            />
          </motion.div>
        </div>

        {/* Text Display Title */}
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-300 to-amber-300">TeachDZ</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-serif leading-none tracking-widest font-black uppercase">
            المنصة التعليمية الشاملة للأستاذ دالي
          </p>
        </div>

        {/* Subtitle / Loading State bar & text */}
        <div className="w-full space-y-4 mt-6">
          <motion.div
            key={loadingText}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-5 flex items-center justify-center"
          >
            <p className="text-[13px] font-bold text-white tracking-wide">
              {loadingText}
            </p>
          </motion.div>

          {/* Loading percentage in Golden/Indigo styling */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-slate-300 px-1 font-bold">
              <span>التقدم</span>
              <span className="text-amber-400 font-extrabold text-sm">{progress}%</span>
            </div>
            <div className="h-4 bg-slate-950 rounded-full overflow-hidden border border-purple-500/30 p-[3px] relative shadow-inner">
              <motion.div 
                className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-amber-400 rounded-full transition-all duration-100 ease-out shadow-[0_0_10px_rgba(168,85,247,0.5)]"
                style={{ width: `${progress}%` }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[size:15px_15px] animate-[pulse_2s_infinite] pointer-events-none rounded-full" />
            </div>
          </div>
        </div>

        {/* Spiritual Athkar Card (ذكر الله، التسبيح، والصلاة على الرسول محمد ﷺ) */}
        <div className="w-full bg-[#0a0c14]/90 border border-purple-500/10 rounded-2xl p-4 relative overflow-hidden shadow-inner">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 blur-lg rounded-full pointer-events-none" />
          
          <div className="flex items-center justify-center gap-1.5 text-purple-400 font-bold text-[10px] mb-2 uppercase tracking-wide">
            <BookOpen className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>نور القلوب • أذكار الانتظار</span>
          </div>

          {/* Animate change in Athkar */}
          <div className="min-h-[56px] flex items-center justify-center px-2">
            <AnimatePresence mode="wait">
              <motion.p
                key={activeThikrIndex}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.4 }}
                className="text-sm font-bold text-amber-200/90 leading-relaxed font-serif text-center drop-shadow-sm select-none"
              >
                {ATHKAR[activeThikrIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Interactive Digital Tasbeeh Clicker to engage user in worship during compiling */}
        <div className="flex flex-col items-center gap-1.5 w-full">
          <p className="text-[10px] text-slate-400 font-bold select-none">
            أنقر على النجمة لتحتسب لك تسبيحة وتنال الأجر بالانتظار:
          </p>
          
          <div className="flex items-center gap-4 justify-center">
            {/* Tasbeeh Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleTasbeeh}
              className="w-12 h-12 bg-gradient-to-tr from-purple-600 to-fuchsia-600 rounded-full border border-purple-400/30 flex items-center justify-center shadow-lg hover:shadow-purple-500/35 relative group cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
              <div className="absolute inset-0 rounded-full bg-purple-500 animate-ping opacity-10 group-hover:opacity-20 pointer-events-none"></div>
            </motion.button>

            {/* Tasbeeh Counter Badge */}
            <div className="flex flex-col items-start text-right">
              <span className="text-[9px] text-slate-400 font-bold">عداد التسبيح</span>
              <motion.span 
                key={tasbeehCount}
                initial={{ scale: 1.2, color: '#e9d5ff' }}
                animate={{ scale: 1, color: '#f59e0b' }}
                className="text-lg font-black font-mono leading-none text-amber-400"
              >
                {tasbeehCount}
              </motion.span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Footer Quran Citation or spiritual quote */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 1 }}
        className="mt-6 text-[10px] text-center font-serif max-w-sm text-slate-500 leading-normal font-black tracking-wide"
      >
        "الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ"
      </motion.p>
    </div>
  );
}
