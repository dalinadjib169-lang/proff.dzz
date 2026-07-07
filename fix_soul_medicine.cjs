const fs = require('fs');
let code = fs.readFileSync('src/components/SoulMedicine.tsx', 'utf8');

// 1. Update ContentItem interface
code = code.replace(
  "category: 'surah' | 'hadith' | 'athkar' | 'ruqya' | 'barakah' | 'targhib' | 'friday' | 'shifa';",
  "category: 'surah' | 'hadith' | 'athkar' | 'ruqya' | 'barakah' | 'targhib' | 'friday' | 'shifa' | 'maghfirah' | 'rahmah' | 'sadaqah' | 'nawafil';"
);

// 2. Update imports to include new icons
code = code.replace(
  "from 'lucide-react';",
  ", Droplets, Gift, Feather, Flame } from 'lucide-react';"
);

// 3. Update THEMES
const newThemes = `const THEMES = [
  { id: 'emerald', name: 'زمردي', bg: 'from-emerald-600 via-teal-700 to-indigo-900', secondary: 'bg-emerald-500', text: 'text-emerald-300' },
  { id: 'indigo', name: 'كحلي', bg: 'from-indigo-900 via-slate-900 to-purple-900', secondary: 'bg-indigo-500', text: 'text-indigo-300' },
  { id: 'rose', name: 'وردة', bg: 'from-rose-900 via-pink-900 to-slate-950', secondary: 'bg-rose-500', text: 'text-rose-300' },
  { id: 'gold', name: 'ذهبي', bg: 'from-amber-700 via-yellow-900 to-slate-950', secondary: 'bg-amber-500', text: 'text-amber-300' },
  { id: 'ocean', name: 'محيطي', bg: 'from-cyan-700 via-blue-900 to-slate-950', secondary: 'bg-cyan-500', text: 'text-cyan-300' },
  { id: 'sunset', name: 'غروب', bg: 'from-orange-600 via-rose-800 to-purple-950', secondary: 'bg-orange-500', text: 'text-orange-300' },
  { id: 'royal', name: 'ملكي', bg: 'from-purple-700 via-fuchsia-900 to-slate-950', secondary: 'bg-purple-500', text: 'text-purple-300' },
];`;
code = code.replace(/const THEMES = \[[\s\S]*?\];/, newThemes);

// 4. Inject theme selector
const themeSelectorCode = `              <AnimatePresence>
                {isThemeSelectorOpen && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, y: -20 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -20 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-2 pt-2 pb-6 px-1" dir="rtl">
                      {THEMES.map(theme => (
                        <button
                          key={theme.id}
                          onClick={() => {
                            setSelectedTheme(theme);
                            setIsThemeSelectorOpen(false);
                            localStorage.setItem('soul_theme', theme.id);
                          }}
                          className={\`px-4 py-2 rounded-xl text-xs font-bold transition-all \${
                            selectedTheme.id === theme.id
                              ? 'bg-white text-slate-900 shadow-xl scale-110 border-2 border-white'
                              : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                          }\`}
                        >
                          {theme.name}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>`;
code = code.replace("{/* Themes... (unchanged) */}", themeSelectorCode);

// 5. Update Navigation logic
const navigationOriginal = `[
                  ...(isFriday ? [{ id: 'friday', label: 'باب الجمعة', icon: Star, color: 'bg-amber-500 text-white' }] : []),
                  { id: 'surah', label: 'باب السور والآيات', icon: BookOpen },
                  { id: 'ruqya', label: 'باب الرقية الشرعية', icon: ShieldCheck },
                  { id: 'shifa', label: 'باب الشفاء التام', icon: Moon },
                  { id: 'barakah', label: 'باب البركة والرزق', icon: Coffee },
                  { id: 'targhib', label: 'باب كنوز الجنة', icon: Flower },
                  { id: 'hadith', label: 'باب السنة النبوية', icon: Scroll },
                  { id: 'athkar', label: 'باب تفريج الكروب', icon: Sun }
                ]`;

const navigationNew = `[
                  ...(isFriday ? [{ id: 'friday', label: 'باب الجمعة', icon: Star, color: 'bg-amber-500 text-white' }] : []),
                  { id: 'maghfirah', label: 'باب المغفرة', icon: Feather },
                  { id: 'rahmah', label: 'باب الرحمة', icon: Droplets },
                  { id: 'sadaqah', label: 'باب الصدقات', icon: Gift },
                  { id: 'nawafil', label: 'باب النوافل', icon: Flame },
                  { id: 'surah', label: 'باب السور والآيات', icon: BookOpen },
                  { id: 'ruqya', label: 'باب الرقية الشرعية', icon: ShieldCheck },
                  { id: 'shifa', label: 'باب الشفاء التام', icon: Moon },
                  { id: 'barakah', label: 'باب البركة والرزق', icon: Coffee },
                  { id: 'targhib', label: 'باب كنوز الجنة', icon: Flower },
                  { id: 'hadith', label: 'باب السنة النبوية', icon: Scroll },
                  { id: 'athkar', label: 'باب تفريج الكروب', icon: Sun }
                ]`;
code = code.replace(navigationOriginal, navigationNew);


// 6. Update Content Data (Appending to CONTENT_DATA before it ends)
const newContent = `
  // --- MAGHFIRAH ---
  {
    id: 'maghfirah_1',
    title: 'لا تقنطوا من رحمة الله',
    category: 'maghfirah',
    text: 'قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ ۚ إِنَّ اللَّهَ يَغْفِرُ الذُّنُوبَ جَمِيعًا ۚ إِنَّهُ هُوَ الْغَفُورُ الرَّحِيمُ',
    benefit: 'الأجر: لا ييأس المؤمن من رحمة الله، فباب التوبة والمغفرة مفتوح مهما عظمت الذنوب، وفيه طمأنينة كبرى للقلب.',
    source: 'الزمر: 53'
  },
  {
    id: 'maghfirah_2',
    title: 'تكفير الذنوب',
    category: 'maghfirah',
    text: 'مَن قالَ: سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، في يَومٍ مِئَةَ مَرَّةٍ، حُطَّتْ خَطَايَاهُ، وإنْ كَانَتْ مِثْلَ زَبَدِ البَحْرِ.',
    benefit: 'الأجر: محو السيئات وتكفير الذنوب بكلمات يسيرة، تمنح الروح خفة وراحة من أثقال الخطايا.',
    source: 'رواه البخاري ومسلم'
  },
  
  // --- RAHMAH ---
  {
    id: 'rahmah_1',
    title: 'رحمة الله الواسعة',
    category: 'rahmah',
    text: 'وَرَحْمَتِي وَسِعَتْ كُلَّ شَيْءٍ',
    benefit: 'الأجر: استشعار سعة رحمة الله التي تشمل كل خلقه، مما يورث الرجاء ويطرد القنوط.',
    source: 'الأعراف: 156'
  },
  {
    id: 'rahmah_2',
    title: 'رحمتي سبقت غضبي',
    category: 'rahmah',
    text: 'إنَّ اللَّهَ لَمَّا قَضَى الخَلْقَ، كَتَبَ عِنْدَهُ فَوْقَ عَرْشِهِ: إنَّ رَحْمَتي سَبَقَتْ غَضَبِي.',
    benefit: 'الأجر: الاطمئنان إلى أن رحمة الله غالبة وعظيمة، فتسكن النفوس وتأمن من عقابه إن تابت.',
    source: 'رواه البخاري ومسلم'
  },

  // --- SADAQAH ---
  {
    id: 'sadaqah_1',
    title: 'مضاعفة الأجر',
    category: 'sadaqah',
    text: 'مَّثَلُ الَّذِينَ يُنفِقُونَ أَمْوَالَهُمْ فِي سَبِيلِ اللَّهِ كَمَثَلِ حَبَّةٍ أَنبَتَتْ سَبْعَ سَنَابِلَ فِي كُلِّ سُنبُلَةٍ مِّائَةُ حَبَّةٍ ۗ وَاللَّهُ يُضَاعِفُ لِمَن يَشَاءُ',
    benefit: 'الأجر: مضاعفة الأجر والثواب للمتصدق أضعافاً كثيرة، وهو استثمار أخروي مضمون.',
    source: 'البقرة: 261'
  },
  {
    id: 'sadaqah_2',
    title: 'البركة في المال',
    category: 'sadaqah',
    text: 'ما نَقَصَتْ صَدَقَةٌ مِن مالٍ',
    benefit: 'الأجر: البركة في المال والزيادة فيه، فالصدقة دواء للشح وتزكية للروح والنفس.',
    source: 'رواه مسلم'
  },
  {
    id: 'sadaqah_3',
    title: 'صدقة السر',
    category: 'sadaqah',
    text: 'صدقة السر تطفئ غضب الرب',
    benefit: 'الأجر: نيل رضا الله وإطفاء غضبه، ودفع مصارع السوء، وفيها إخلاص عظيم.',
    source: 'حديث صحيح'
  },

  // --- NAWAFIL ---
  {
    id: 'nawafil_1',
    title: 'محبة الله وتوفيقه',
    category: 'nawafil',
    text: 'ما يَزالُ عَبْدِي يَتَقَرَّبُ إلَيَّ بالنَّوافِلِ حتَّى أُحِبَّهُ، فإذا أحْبَبْتُهُ: كُنْتُ سَمْعَهُ الذي يَسْمَعُ به، وبَصَرَهُ الذي يُبْصِرُ به...',
    benefit: 'الأجر: نيل محبة الله وتوفيقه وحفظه في كل الجوارح، وتسديد خطى العبد في حياته.',
    source: 'رواه البخاري'
  },
  {
    id: 'nawafil_2',
    title: 'بيت في الجنة',
    category: 'nawafil',
    text: 'مَن صَلَّى اثْنَتَيْ عَشْرَةَ رَكْعَةً في يَومٍ ولَيْلَةٍ، بُنِيَ له بهِنَّ بَيْتٌ في الجَنَّةِ',
    benefit: 'الأجر: بناء قصر في الجنة لمن داوم على السنن الرواتب، وهي السنن القبلية والبعدية للفرائض.',
    source: 'رواه مسلم'
  }
`;

const contentDataStart = 'const CONTENT_DATA: ContentItem[] = [';
code = code.replace(contentDataStart, contentDataStart + newContent);

fs.writeFileSync('src/components/SoulMedicine.tsx', code);
