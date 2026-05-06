import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, Sparkles, BookOpen, Scroll, ShieldCheck } from 'lucide-react';

interface ContentItem {
  id: string;
  title: string;
  category: 'surah' | 'hadith' | 'athkar';
  text: string;
  benefit: string;
  source?: string;
}

const CONTENT_DATA: ContentItem[] = [
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
    benefit: 'من قرأها دبر كل صلاة لم يمنعه من دخول الجنة إلا أن يموت. وهي أعظم آية للحفظ من الجن والشياطين.',
    source: 'البقرة: 255'
  },
  {
    id: 'baqarah_last',
    title: 'خواتيم سورة البقرة',
    category: 'surah',
    text: 'آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِّن رُّسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ (285) لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ...',
    benefit: 'من قرأهما في ليلة كفتاه (كفتاه من كل سوء أو كفتاه لقيام الليل).',
    source: 'البقرة: 285-286'
  },
  {
    id: 'mulk',
    title: 'سورة الملك (المنجية)',
    category: 'surah',
    text: 'تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ (1) الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا وَهُوَ الْعَزِيزُ الْغَفُورُ...',
    benefit: 'سورة تشفع لصاحبها حتى يغفر له، وهي المنجية من عذاب القبر.',
    source: 'القرآن الكريم'
  },
  {
    id: 'ikhlas',
    title: 'سورة الإخلاص',
    category: 'surah',
    text: 'قُلْ هُوَ اللَّه أَحَدٌ (1) اللَّه الصَّمَدُ (2) لَمْ يَلِدْ وَلَمْ يُولَدْ (3) وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ (4)',
    benefit: 'تعدل ثلث القرآن، وحبها يوجب الجنة.',
    source: 'القرآن الكريم'
  },
  {
    id: 'mawadhat',
    title: 'المعوذتان (الفلق والناس)',
    category: 'surah',
    text: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ... قُلْ أَعُوذُ بِرَبِّ النَّاسِ...',
    benefit: 'ما تعوذ متعوذ بمثلهما، تكفي المرء من كل شر.',
    source: 'القرآن الكريم'
  },
  {
    id: 'hadith_mizan',
    title: 'كلمتان خفيفتان',
    category: 'hadith',
    text: 'كَلِمَتَانِ خَفِيفَتَانِ عَلَى اللِّسَانِ، ثَقِيلَتَانِ فِي الْمِيزَانِ، حَبِيبَتَانِ إِلَى الرَّحْمَنِ: سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
    benefit: 'غراس الجنة وثقل في ميزان العمل.',
    source: 'رواه البخاري ومسلم'
  },
  {
    id: 'hadith_kanz',
    title: 'كنز من كنوز الجنة',
    category: 'hadith',
    text: 'لا حَوْلَ وَلا قُوَّةَ إِلاَّ بِاللَّهِ',
    benefit: 'بوابة للفرج وكنز من كنوز تحت العرش.',
    source: 'رواه البخاري ومسلم'
  },
  {
    id: 'hadith_shafaa',
    title: 'دواء الهم والضيق',
    category: 'hadith',
    text: 'مَنْ لَزِمَ الِاسْتِغْفَارَ جَعَلَ اللَّهُ لَهُ مِنْ كُلِّ ضِيقٍ مَخْرَجًا، وَمِنْ كُلِّ هَمٍّ فَرَجًا، وَرَزَقَهُ مِنْ حَيْثُ لَا يَحْتَسِبُ',
    benefit: 'تفريج الكربات وسعة الأرزاق.',
    source: 'سنن أبي داود'
  },
  {
    id: 'hadith_salam',
    title: 'فضل الصلاة على النبي',
    category: 'hadith',
    text: 'مَنْ صَلَّى عَلَيَّ صَلَاةً صَلَّى اللَّهُ عَلَيْهِ بِهَا عَشْرًا',
    benefit: 'كفاية الهم وغفران الذنب.',
    source: 'رواه مسلم'
  },
  {
    id: 'hadith_tahleel',
    title: 'أفضل الذكر',
    category: 'hadith',
    text: 'لا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    benefit: 'من قالها مائة مرة كانت له عدل عشر رقاب وكتبت له مائة حسنة ومحيت عنه مائة سيئة.',
    source: 'رواه البخاري'
  },
  {
    id: 'athkar_morning',
    title: 'سيد الاستغفار',
    category: 'athkar',
    text: 'اللَّهُمَّ أَنْتَ رَبِّي لا إِلَهَ إِلا أَنْتَ ، خَلقتَنِي وَأَنَا عَبْدُكَ ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا استَطَعْتُ ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ ، وَأَبُوءُ لَكَ بِذَنْبِي فَاغْفِرْ لِي ، فَإِنَّهُ لا يَغْفِرُ الذُّنُوبَ إِلا أَنْتَ',
    benefit: 'من قالها موقنا بها فمات دخل الجنة.',
    source: 'رواه البخاري'
  },
  {
    id: 'athkar_kurb',
    title: 'دعاء ذي النون',
    category: 'athkar',
    text: 'لا إِلَهَ إِلا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ',
    benefit: 'ما دعا بها مكروب إلا فرج الله كربه.',
    source: 'رواه الترمذي'
  },
  {
    id: 'athkar_ruqya',
    title: 'الرقية النبوية الشافية',
    category: 'athkar',
    text: 'أذهب البأس رب الناس، اشف وأنت الشافي، لا شفاء إلا شفاؤك، شفاء لا يغادر سقما',
    benefit: 'طلب الشفاء من الله الذي بيده كل شيء.',
    source: 'رواه البخاري ومسلم'
  },
  {
    id: 'athkar_protection',
    title: 'بسم الله الذي لا يضر',
    category: 'athkar',
    text: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
    benefit: 'تحصين تام من فجاءة البلاء ومن كل ضرر.',
    source: 'رواه أبو داود والترمذي'
  },
  {
    id: 'surah_rahman',
    title: 'من سورة الرحمن',
    category: 'surah',
    text: 'فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ',
    benefit: 'التذكير بنعم الله وتخفيف الهموم بالامتنان.',
    source: 'سورة الرحمن'
  },
  {
    id: 'hadith_rahma',
    title: 'سعة رحمة الله',
    category: 'hadith',
    text: 'قال الله تعالى: يَا ابْنَ آدَمَ إِنَّكَ مَا دَعَوْتَنِي وَرَجَوْتَنِي غَفَرْتُ لَكَ عَلَى مَا كَانَ فِيكَ وَلَا أُبَالِي',
    benefit: 'بث الأمل والرجاء في قلب المؤمن وفتح باب التوبة.',
    source: 'حديث قدسي'
  },
  {
    id: 'athkar_travel',
    title: 'دعاء التحصين اليومي',
    category: 'athkar',
    text: 'أعوذ بكلمات الله التامات التي لا يجاوزهن بر ولا فاجر من شر ما خلق وذرأ وبرأ',
    benefit: 'حماية شاملة من شرور الإنس والجن وكل دابة.',
    source: 'رواه أحمد'
  }
];

export const SoulMedicine: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'surah' | 'hadith' | 'athkar'>('surah');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden shadow-emerald-500/10"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative h-48 sm:h-56 bg-gradient-to-br from-emerald-600 via-teal-700 to-indigo-900 p-8 flex flex-col justify-end">
              <div className="absolute top-6 right-6">
                <button 
                  onClick={onClose}
                  className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all border border-white/20"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <Heart className="w-6 h-6 text-emerald-300 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white font-amiri tracking-wider">دواء الروح</h2>
                  <p className="text-emerald-200/80 text-sm font-bold">نور للقلوب وطمأنينة للنفوس</p>
                </div>
              </div>
              
              {/* Tabs */}
              <div className="flex gap-2 mt-6 overflow-x-auto no-scrollbar" dir="rtl">
                {[
                  { id: 'surah', label: 'سور وآيات', icon: BookOpen },
                  { id: 'hadith', label: 'أحاديث نبوية', icon: Scroll },
                  { id: 'athkar', label: 'أذكار وعلاجات', icon: ShieldCheck }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-black transition-all whitespace-nowrap ${
                      activeTab === tab.id 
                        ? 'bg-white text-emerald-950 shadow-xl scale-105' 
                        : 'bg-black/20 text-white/70 hover:bg-black/30'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content List */}
            <div className="p-4 sm:p-8 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-6" dir="rtl">
              {CONTENT_DATA.filter(item => item.category === activeTab).map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-2 h-8 bg-emerald-500 rounded-full group-hover:scale-y-125 transition-transform" />
                    <h3 className="text-xl font-black text-white font-amiri">{item.title}</h3>
                    <div className="flex-1 border-b border-white/5" />
                  </div>
                  
                  <div className="bg-white/5 rounded-3xl p-6 border border-white/10 group-hover:border-emerald-500/30 transition-all">
                    <p className="text-2xl font-amiri text-emerald-50 leading-relaxed mb-6 text-center select-none tracking-wide drop-shadow-sm">
                      {item.text}
                    </p>
                    
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Sparkles className="w-4 h-4 shrink-0" />
                        <span className="text-xs font-black tracking-tight uppercase">الفضل والأثر:</span>
                      </div>
                      <p className="text-slate-400 text-sm font-bold leading-relaxed pr-6">
                        {item.benefit}
                      </p>
                      
                      {item.source && (
                        <div className="flex justify-end mt-2">
                          <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-500/60 px-3 py-1 rounded-full border border-emerald-500/20 italic">
                            {item.source}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {/* Footer Quote */}
              <div className="pt-8 text-center opacity-30">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                  ألَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
