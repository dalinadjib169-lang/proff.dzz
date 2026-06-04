import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, BookOpen, Sparkles, PenTool, ClipboardCheck } from 'lucide-react';

interface AcademicLoaderProps {
  progress: number;
}

export default function AcademicLoader({ progress }: AcademicLoaderProps) {
  const [loadingText, setLoadingText] = useState('جاري الدخول...');

  useEffect(() => {
    if (progress < 25) {
      setLoadingText('جاري تحضير المحبرة والأقلام الكلاسيكية...');
    } else if (progress < 50) {
      setLoadingText('ترتيب منصة الاستماع وعرض عنوان الحصة الروحية...');
    } else if (progress < 75) {
      setLoadingText('تصفيف الدفاتر والمراجع والكتب الروحية...');
    } else if (progress < 95) {
      setLoadingText('حضور الأستاذ المحاضر وتهيئة قاعة الفكر...');
    } else {
      setLoadingText('فتح بوابة دواء الروح... أهلاً بك!');
    }
  }, [progress]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#090b11] p-6 text-white relative">
      {/* Visual background ambient lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-violet-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[250px] h-[250px] bg-amber-500/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Main Board Container representing a highly polished academic layout */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-lg bg-slate-900/80 backdrop-blur-2xl border-2 border-slate-700/50 rounded-3xl p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] relative overflow-hidden"
      >
        {/* Decorative inner gold-purple border */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-violet-600 via-amber-400 to-fuchsia-600 opacity-80" />

        {/* Header Ribbon / Class Info */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[10px] uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-bold">المجلس العلمي • دواء الروح</span>
          </div>
          <div className="px-2.5 py-0.5 rounded-full border border-violet-500/20 bg-violet-500/10 text-[9px] font-mono text-violet-300">
            أستاذ فلسفة ونور
          </div>
        </div>

        {/* Center Illustration: Bouncing Cap and Academic details */}
        <div className="flex flex-col items-center justify-center my-8 relative">
          {/* Main animated professor icon */}
          <div className="relative">
            <motion.div
              animate={{ 
                y: [0, -12, 0],
                rotate: [0, 3, -3, 0]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 2.5, 
                ease: "easeInOut" 
              }}
              className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-950 rounded-2xl border border-white/10 flex items-center justify-center shadow-xl relative"
            >
              <GraduationCap className="w-12 h-12 text-amber-400" />
            </motion.div>
            
            {/* Inkpen orbiting */}
            <motion.div
              animate={{ 
                rotate: 360,
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 4, 
                ease: "linear" 
              }}
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-slate-950 border border-amber-500/30 flex items-center justify-center shadow-md animate-pulse"
            >
              <PenTool className="w-4 h-4 text-amber-400" />
            </motion.div>
          </div>

          {/* Dynamic educational icons floating around */}
          <div className="absolute top-0 left-8">
            <motion.div animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }} transition={{ repeat: Infinity, duration: 3, delay: 0.5 }}>
              <BookOpen className="w-5 h-5 text-violet-400/40" />
            </motion.div>
          </div>
          <div className="absolute bottom-4 right-8">
            <motion.div animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }} transition={{ repeat: Infinity, duration: 3, delay: 1.2 }}>
              <ClipboardCheck className="w-5 h-5 text-amber-400/40" />
            </motion.div>
          </div>
        </div>

        {/* Text Area */}
        <div className="text-center space-y-3 px-4">
          <motion.div
            key={loadingText}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="min-h-[48px] flex items-center justify-center"
          >
            <p className="text-sm font-bold text-slate-100 font-serif leading-relaxed">
              {loadingText}
            </p>
          </motion.div>

          {/* Golden/Indigo styling linear progress bar */}
          <div className="space-y-1.5 pt-4">
            <div className="flex justify-between text-[11px] font-mono text-slate-400 px-1">
              <span>تحضير الدروس الرقمية</span>
              <span className="text-amber-400 font-bold">{progress}%</span>
            </div>
            <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5 p-[2px]">
              <div 
                className="h-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-400 rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quote citation details typical of academic lectures */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 1 }}
        className="mt-6 text-[10px] text-center font-mono max-w-sm text-slate-500 leading-normal font-bold"
      >
        "طلب العلم فريضة على كل مسلم ومسلمة. يستعد الأستاذ لمشاركتكم نفحات النور."
      </motion.p>
    </div>
  );
}
