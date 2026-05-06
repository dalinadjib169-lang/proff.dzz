import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Sparkles, BookOpen, Scroll, ShieldCheck, HeartCrack, Palette, Star, Coffee, Moon, Sun, Flower } from 'lucide-react';

interface ContentItem {
  id: string;
  title: string;
  category: 'surah' | 'hadith' | 'athkar' | 'ruqya' | 'barakah' | 'targhib' | 'friday';
  text: string;
  benefit: string;
  source?: string;
}

const THEMES = [
  { id: 'emerald', name: 'زمردي', bg: 'from-emerald-600 via-teal-700 to-indigo-900', secondary: 'bg-emerald-500', text: 'text-emerald-300' },
  { id: 'indigo', name: 'كحلي', bg: 'from-indigo-900 via-slate-900 to-purple-900', secondary: 'bg-indigo-500', text: 'text-indigo-300' },
  { id: 'rose', name: 'وردة', bg: 'from-rose-900 via-pink-900 to-slate-950', secondary: 'bg-rose-500', text: 'text-rose-300' },
  { id: 'gold', name: 'ذهبي', bg: 'from-amber-700 via-yellow-900 to-slate-950', secondary: 'bg-amber-500', text: 'text-amber-300' },
];

const CONTENT_DATA: ContentItem[] = [
  // --- FRIDAY SPECIAL ---
  {
    id: 'kahf',
    title: 'سورة الكهف (نور الأسبوع)',
    category: 'friday',
    text: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ. الْحَمْدُ لِلَّهِ الَّذِي أَنْزَلَ عَلَى عَبْدِهِ الْكِتَابَ وَلَمْ يَجْعَلْ لَهُ عِوَجًا... (إلى آخر السورة)',
    benefit: 'من قرأ سورة الكهف في يوم الجمعة أضاء له من النور ما بين الجمعتين.',
    source: 'القرآن الكريم'
  },
  {
    id: 'friday_dua',
    title: 'الصلاة الإبراهيمية',
    category: 'friday',
    text: 'اللهم صلِّ على محمد وعلى آل محمد كما صليت على إبراهيم وعلى آل إبراهيم إنك حميد مجيد، اللهم بارك على محمد وعلى آل محمد كما باركت على إبراهيم وعلى آل إبراهيم إنك حميد مجيد.',
    benefit: 'أفضل صيغ الصلاة على النبي، وهي سبب لإجابة الدعاء ونيل الشفاعة.',
    source: 'متفق عليه'
  },
  {
    id: 'friday_salawat',
    title: 'ألف صلاة ونور',
    category: 'friday',
    text: 'اللهم صلِّ وسلم وبارك على نبينا محمد',
    benefit: 'البطولة في كسب الحسنات يوم الجمعة تبدأ بالصلاة على الحبيب المصطفى.',
    source: 'سنن أبي داود'
  },

  // --- SURAHS ---
  {
    id: 'fatiha',
    title: 'سورة الفاتحة (الشافية)',
    category: 'surah',
    text: 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ (1) الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ (2) الرَّحْمَنِ الرَّحِيمِ (3) مَالِكِ يَوْمِ الدِّينِ (4) إِيَّاكَ نَعْبُدُ وإِيَّاكَ نَسْتَعِينُ (5) اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ (6) صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ (7)',
    benefit: 'أعظم سورة في القرآن، وهي الحافظة والشافية والرقية الكافية بإذن الله.',
    source: 'القرآن الكريم'
  },
  {
    id: 'kursi',
    title: 'آية الكرسي (سيدة آي القرآن)',
    category: 'surah',
    text: 'اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ وَلَا يُحيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ وَلَا يَئُودُهُ حِفْظُهُمَا وَهُوَ الْعَلِيُّ الْعَظِيمُ',
    benefit: 'من قرأها دبر كل صلاة لم يمنعه من دخول الجنة إلا أن يموت.',
    source: 'البقرة: 255'
  },
  {
    id: 'yaseen',
    title: 'سورة يس (قلب القرآن)',
    category: 'surah',
    text: 'يس (1) وَالْقُرْآنِ الْحَكِيمِ (2) إِنَّكَ لَمِنَ الْمُرْسَلِينَ (3) عَلَى صِرَاطٍ مُسْتَقِيمٍ (4)...',
    benefit: 'لقضاء الحاجات وتخفيف سكرات الهموم، وهي قلب القرآن الكريم.',
    source: 'القرآن الكريم'
  },

  // --- RUQYA ---
  {
    id: 'ruqya_1',
    title: 'رقية العين والحسد',
    category: 'ruqya',
    text: 'أعوذ بكلمات الله التامة من كل شيطان وهامة ومن كل عين لامة.',
    benefit: 'تحصين نبوي شامل من شر الأعين والحاسدين.',
    source: 'رواه البخاري'
  },
  {
    id: 'ruqya_2',
    title: 'باسم الله أرقيك',
    category: 'ruqya',
    text: 'باسم الله أرقيك، من كل شيء يؤذيك، من شر كل نفس أو عين حاسد، الله يشفيك، باسم الله أرقيك.',
    benefit: 'رقية جبريل عليه السلام للنبي صلى الله عليه وسلم.',
    source: 'رواه مسلم'
  },

  // --- BARAKAH ---
  {
    id: 'barakah_1',
    title: 'بركة الرزق والبيت',
    category: 'barakah',
    text: 'اللَّهُمَّ بَارِكْ لِي فِي رِزْقِي، وَوَسِّعْ لِي فِي دَارِي، وَبَارِكْ لِي فِي مَا خَلَقْتَ.',
    benefit: 'طلب البركة في الرزق والمسكن.',
    source: 'أدعية مأثورة'
  },
  {
    id: 'barakah_2',
    title: 'دعاء البركة في الوقت',
    category: 'barakah',
    text: 'اللهم بارك لأمتي في بكورها',
    benefit: 'الصباح الباكر هو مدخل الرزق والبركة في العلم والعمل.',
    source: 'سنن الترمذي'
  },

  // --- TARGHIB ---
  {
    id: 'targhib_1',
    title: 'كنز من كنوز الجنة',
    category: 'targhib',
    text: 'لا حول ولا قوة إلا بالله العلي العظيم',
    benefit: 'دواء لـ 99 داء أيسرها الهم.',
    source: 'رواه الطبراني'
  },
  {
    id: 'targhib_2',
    title: 'غراس الجنة',
    category: 'targhib',
    text: 'سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ',
    benefit: 'أحب الكلام إلى الله، غراس مبارك في الجنان.',
    source: 'رواه مسلم'
  },

  {
    id: 'hadith_mizan',
    title: 'كلمتان خفيفتان',
    category: 'hadith',
    text: 'كَلِمَتَانِ خَفِيفَتَانِ عَلَى اللِّسَانِ، ثَقِيلَتَانِ فِي الْمِيزَانِ، حَبِيبَتَانِ إِلَى الرَّحْمَنِ: سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
    benefit: 'ثقل في الميزان ومحبة من الرحمن.',
    source: 'رواه البخاري'
  },
  {
    id: 'athkar_kurb',
    title: 'دعاء ذي النون',
    category: 'athkar',
    text: 'لا إِلَهَ إِلا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ',
    benefit: 'ما دعا بها مكروب إلا فرج الله عنه.',
    source: 'رواه الترمذي'
  }
];

export const SoulMedicine: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<ContentItem['category']>('surah');
  const [soulHealth, setSoulHealth] = useState(0);
  const [lastReadTime, setLastReadTime] = useState<number>(Date.now());
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);
  const [readItems, setReadItems] = useState<Set<string>>(new Set());

  const isFriday = useMemo(() => new Date().getDay() === 5, []);

  useEffect(() => {
    const savedHealth = localStorage.getItem('soul_health');
    const savedTime = localStorage.getItem('soul_last_read');
    const savedTheme = localStorage.getItem('soul_theme');
    
    if (savedHealth) setSoulHealth(parseInt(savedHealth));
    if (savedTime) setLastReadTime(parseInt(savedTime));
    if (savedTheme) {
      const theme = THEMES.find(t => t.id === savedTheme);
      if (theme) setSelectedTheme(theme);
    }
  }, []);

  const isHeartBroken = useMemo(() => {
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return (Date.now() - lastReadTime) > twentyFourHours;
  }, [lastReadTime]);

  const handleRead = (itemId: string) => {
    if (readItems.has(itemId)) return;

    setReadItems(prev => {
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });

    setSoulHealth(prev => {
      const next = Math.min(prev + 5, 100);
      localStorage.setItem('soul_health', next.toString());
      return next;
    });

    const now = Date.now();
    setLastReadTime(now);
    localStorage.setItem('soul_last_read', now.toString());
  };

  const currentTheme = selectedTheme;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className={`w-full max-w-2xl bg-slate-950 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-${currentTheme.id}-500/10`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header Section */}
            <div className={`relative h-56 sm:h-64 bg-gradient-to-br ${currentTheme.bg} p-6 sm:p-8 flex flex-col justify-end transition-all duration-700`}>
              
              {/* Dynamic Heart Status */}
              <div className="absolute top-6 left-6 flex flex-col items-center gap-2">
                <motion.div 
                  initial={false}
                  animate={{ 
                    scale: isHeartBroken ? [1, 1.1, 1] : 1,
                    rotate: isHeartBroken ? [0, -5, 5, 0] : 0 
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="relative group cursor-help"
                >
                  <div className="relative z-10 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl overflow-hidden">
                    <div 
                      className={`absolute bottom-0 left-0 right-0 ${currentTheme.secondary} transition-all duration-1000 ease-out opacity-20`}
                      style={{ height: `${soulHealth}%` }}
                    />
                    {isHeartBroken ? (
                      <HeartCrack className="w-8 h-8 text-red-400 drop-shadow-lg" />
                    ) : (
                      <Heart 
                        className={`w-8 h-8 ${currentTheme.text} drop-shadow-lg transition-all`} 
                        fill={soulHealth > 20 ? "currentColor" : "none"}
                        style={{ fillOpacity: soulHealth / 100 }}
                      />
                    )}
                  </div>
                  
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 backdrop-blur-md text-[9px] font-black text-white px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity border border-white/10">
                    {isHeartBroken ? "القلب منكسر! اقرأ لترميمه" : `صحة الروح: ${soulHealth}%`}
                  </div>
                </motion.div>
                <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                   <div className={`h-full ${currentTheme.secondary} transition-all duration-500`} style={{ width: `${soulHealth}%` }} />
                </div>
              </div>

              {/* Controls */}
              <div className="absolute top-6 right-6 flex flex-col gap-3">
                <button 
                  onClick={onClose}
                  className="p-3 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all border border-white/20 backdrop-blur-md"
                >
                  <X className="w-6 h-6" />
                </button>
                
                <button 
                  onClick={() => setIsThemeSelectorOpen(!isThemeSelectorOpen)}
                  className={`p-3 rounded-2xl transition-all border backdrop-blur-md ${isThemeSelectorOpen ? 'bg-white text-slate-900 border-white' : 'bg-white/10 text-white border-white/20'}`}
                >
                  <Palette className="w-5 h-5" />
                </button>
              </div>

              {/* Theme Popover */}
              <AnimatePresence>
                {isThemeSelectorOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="absolute top-6 right-20 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl p-3 flex flex-col gap-2 z-50 shadow-2xl"
                  >
                    {THEMES.map(theme => (
                      <button
                        key={theme.id}
                        onClick={() => {
                          setSelectedTheme(theme);
                          localStorage.setItem('soul_theme', theme.id);
                        }}
                        className={`flex items-center gap-3 px-4 py-2 rounded-2xl transition-all ${selectedTheme.id === theme.id ? 'bg-white/20 border border-white/20' : 'hover:bg-white/5'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${theme.bg}`} />
                        <span className="text-xs font-black text-white">{theme.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Branding */}
              <div className="flex items-center gap-4 mb-2" dir="rtl">
                <div className="w-14 h-14 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/20">
                  {isHeartBroken ? <HeartCrack className="w-8 h-8 text-red-300" /> : <Sparkles className={`w-8 h-8 ${currentTheme.text} animate-pulse`} />}
                </div>
                <div>
                  <h2 className="text-4xl font-black text-white font-amiri tracking-wider drop-shadow-md">دواء الروح</h2>
                  <p className={`${currentTheme.text} text-xs font-bold opacity-80 uppercase tracking-tighter`}>نور للقلوب وطمأنينة للنفوس المستكينة</p>
                </div>
              </div>
              
              {/* Navigation */}
              <div className="flex gap-2 mt-6 overflow-x-auto no-scrollbar scroll-smooth p-1" dir="rtl">
                {[
                  ...(isFriday ? [{ id: 'friday', label: 'يوم الجمعة', icon: Star, color: 'bg-amber-500 text-white' }] : []),
                  { id: 'surah', label: 'سور وآيات', icon: BookOpen },
                  { id: 'hadith', label: 'أحاديث نبوية', icon: Scroll },
                  { id: 'ruqya', label: 'الرقية الشرعية', icon: ShieldCheck },
                  { id: 'barakah', label: 'البركة والرزق', icon: Coffee },
                  { id: 'targhib', label: 'كنوز الجنة', icon: Flower },
                  { id: 'athkar', label: 'أذكار وعلاجات', icon: Sun }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[11px] font-black transition-all whitespace-nowrap active:scale-95 ${
                      activeTab === tab.id 
                        ? (tab.id === 'friday' ? 'bg-amber-500 text-white shadow-xl shadow-amber-500/20' : 'bg-white text-slate-950 shadow-xl scale-105')
                        : 'bg-black/20 text-white/70 hover:bg-black/30 backdrop-blur-md border border-white/5'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 space-y-8" dir="rtl">
              {CONTENT_DATA.filter(item => item.category === activeTab).map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="group"
                  onViewportEnter={() => handleRead(item.id)}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-2.5 h-10 ${currentTheme.secondary} rounded-full group-hover:scale-y-110 transition-transform shadow-lg shadow-emerald-500/20`} />
                    <h3 className="text-2xl font-black text-white font-amiri group-hover:text-emerald-300 transition-colors uppercase tracking-tight">{item.title}</h3>
                    <div className="flex-1 border-b-2 border-white/5 border-dashed" />
                  </div>
                  
                  <div className="bg-white/5 rounded-[2.5rem] p-8 border border-white/10 group-hover:border-white/20 group-hover:bg-white/[0.07] transition-all relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${currentTheme.bg} blur-3xl opacity-0 group-hover:opacity-10 transition-opacity`} />
                    
                    <p className="text-2xl sm:text-3xl font-amiri text-white leading-[1.8] mb-8 text-center select-none tracking-wide drop-shadow-lg">
                      {item.text}
                    </p>
                    
                    <div className="flex flex-col gap-4 relative z-10">
                      <div className="flex items-center gap-3 text-emerald-400">
                        <div className={`p-1.5 rounded-lg ${currentTheme.secondary}/20`}>
                          <Sparkles className="w-4 h-4 shrink-0" />
                        </div>
                        <span className="text-[10px] font-black tracking-widest uppercase text-white/50">الفضل والأثر الروحي:</span>
                      </div>
                      <p className="text-slate-300 text-sm font-bold leading-relaxed pr-8 border-r-2 border-white/5">
                        {item.benefit}
                      </p>
                      
                      {item.source && (
                        <div className="flex justify-end mt-4">
                          <span className={`text-[10px] font-black ${currentTheme.text}/80 bg-white/5 px-4 py-1.5 rounded-xl border border-white/10 italic`}>
                             المصدر: {item.source}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              <div className="py-12 text-center">
                <motion.div 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 0.4 }}
                  className="flex flex-col items-center gap-4"
                >
                  <Heart className={`w-8 h-8 ${currentTheme.text}`} />
                  <p className="text-xs font-black uppercase text-slate-500 tracking-[0.4em] font-amiri">
                    ألَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ
                  </p>
                  <p className="text-[9px] text-slate-600 font-bold max-w-xs leading-relaxed">
                    استمر في القراءة لملء قلبك بالنور. تذكر أن القلب يضعف بترك الذكر لأكثر من يوم.
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
