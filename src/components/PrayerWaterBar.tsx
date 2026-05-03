import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Moon, 
  Sun, 
  Sunrise,
  Sunset,
  Droplets, 
  Volume2, 
  VolumeX, 
  Plus,
  Minus,
  GlassWater,
  Bell,
  BellOff
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { doc, updateDoc } from 'firebase/firestore';
import { db, isFirestoreConnected } from '../firebase';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { playSound } from '../lib/sounds';

interface PrayerTimes {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

const ADHAN_URL = "https://www.islamcan.com/audio/adhan/azan1.mp3";
const WATER_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3"; // Water splash/pour sound

export const PrayerWaterBar: React.FC = () => {
  const { profile } = useAuth();
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string } | null>(null);
  const [isAdhanEnabled, setIsAdhanEnabled] = useState(profile?.reminders?.prayer ?? false);
  const [isWaterEnabled, setIsWaterEnabled] = useState(profile?.reminders?.water ?? false);
  const [waterCount, setWaterCount] = useState(profile?.reminders?.waterGlassCount ?? 0);
  const [waterGoal, setWaterGoal] = useState(profile?.reminders?.waterGoal ?? 8);
  const [adhanVoice, setAdhanVoice] = useState<'adhan' | 'adhan2' | 'adhan3'>('adhan');
  const [isBarVisible, setIsBarVisible] = useState(true);
  
  const adhanAudio = useRef<HTMLAudioElement | null>(null);
  const waterAudio = useRef<HTMLAudioElement | null>(null);

  const stopAdhan = () => {
    if (adhanAudio.current) {
      adhanAudio.current.pause();
      adhanAudio.current.currentTime = 0;
    }
  };

  const handleVoiceChange = (v: 'adhan' | 'adhan2' | 'adhan3') => {
    stopAdhan();
    setAdhanVoice(v);
    adhanAudio.current = playSound(v);
  };

  useEffect(() => {
    fetchPrayerTimes(profile?.wilaya || 'Alger');
  }, [profile?.wilaya]);

  useEffect(() => {
    if (prayerTimes) {
      calculateNextPrayer();
    }
    const interval = setInterval(() => {
      if (prayerTimes) calculateNextPrayer();
    }, 60000);
    return () => clearInterval(interval);
  }, [prayerTimes]);

  const fetchPrayerTimes = async (wilaya: string) => {
    try {
      // Clean wilaya name for API
      let city = wilaya;
      if (city.includes('(') && city.includes(')')) {
        city = city.match(/\(([^)]+)\)/)?.[1] || city;
      } else if (city.includes('-')) {
        city = city.split('-')[1].trim();
      }
      
      // Normalize common names
      if (city.toLowerCase() === 'alger') city = 'Algiers';
      if (city.toLowerCase() === 'oran') city = 'Oran';
      if (city.toLowerCase() === 'constantine') city = 'Constantine';
      
      const tryFetch = async (cityName: string) => {
        const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(cityName)}&country=Algeria&method=3`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      };

      let data = await tryFetch(city);
      
      // Fallback if city name failed or returned error
      if (data.code !== 200) {
        console.warn(`Fetch for ${city} failed, trying Algiers fallback`);
        data = await tryFetch('Algiers');
      }

      if (data.code === 200) {
        setPrayerTimes(data.data.timings);
      }
    } catch (error) {
      console.error("Error fetching prayer times:", error);
      // Last resort fallback to Algiers if everything fails
      try {
        const response = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=Algiers&country=Algeria&method=3`);
        const data = await response.json();
        if (data.code === 200) setPrayerTimes(data.data.timings);
      } catch (e) {
        console.error("Last resort fetch failed:", e);
      }
    }
  };

  const calculateNextPrayer = () => {
    if (!prayerTimes) return;
    const now = new Date();
    const currentTime = format(now, 'HH:mm');
    
    const prayers = [
      { name: 'Fajr', time: prayerTimes.Fajr },
      { name: 'Dhuhr', time: prayerTimes.Dhuhr },
      { name: 'Asr', time: prayerTimes.Asr },
      { name: 'Maghrib', time: prayerTimes.Maghrib },
      { name: 'Isha', time: prayerTimes.Isha },
    ];

    let next = prayers.find(p => p.time > currentTime);
    if (!next) next = prayers[0];
    
    setNextPrayer(next);

    // Adhan check - check against all prayer times
    if (isAdhanEnabled) {
      const currentPrayer = prayers.find(p => p.time === currentTime);
      if (currentPrayer && (!adhanAudio.current || adhanAudio.current.paused)) {
        console.log(`Playing Adhan for ${currentPrayer.name} at ${currentTime}`);
        adhanAudio.current = playSound(adhanVoice);
      }
    }
  };

  const playWaterSound = () => {
    if (isWaterEnabled) {
      playSound('water');
    }
  };

  const toggleAdhan = async () => {
    const newState = !isAdhanEnabled;
    setIsAdhanEnabled(newState);
    if (!newState) {
      stopAdhan();
    }
    if (profile) {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        'reminders.prayer': newState
      });
    }
  };

  const toggleWater = async () => {
    const newState = !isWaterEnabled;
    setIsWaterEnabled(newState);
    if (profile) {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        'reminders.water': newState
      });
    }
  };

  const incrementWater = async () => {
    const newCount = waterCount + 1;
    setWaterCount(newCount);
    playWaterSound();
    if (profile) {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        'reminders.waterGlassCount': newCount,
        'reminders.waterCurrent': newCount * 250 // Assuming 250ml per glass
      });
    }
  };

  const decrementWater = async () => {
    if (waterCount === 0) return;
    const newCount = waterCount - 1;
    setWaterCount(newCount);
    if (profile) {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        'reminders.waterGlassCount': newCount,
        'reminders.waterCurrent': newCount * 250
      });
    }
  };

  const getPrayerIcon = (name: string) => {
    switch (name) {
      case 'Fajr': return <Sunrise className="w-3.5 h-3.5" />;
      case 'Dhuhr': return <Sun className="w-3.5 h-3.5" />;
      case 'Asr': return <Sun className="w-3.5 h-3.5" />;
      case 'Maghrib': return <Sunset className="w-3.5 h-3.5" />;
      case 'Isha': return <Moon className="w-3.5 h-3.5" />;
      default: return <Sun className="w-3.5 h-3.5" />;
    }
  };

  const PRAYER_NAMES: Record<string, string> = {
    Fajr: 'الفجر',
    Dhuhr: 'الظهر',
    Asr: 'العصر',
    Maghrib: 'المغرب',
    Isha: 'العشاء'
  };

  const getAzkar = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) {
      return [
        { text: "☀️ أذكار الصباح: ", type: 'title' },
        { text: "أصبحنا وأصبح الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له له الملك وله الحمد وهو على كل شيء قدير", type: 'zekr' },
        { text: "اللهم بك أصبحنا، وبك أمسينا، وبك نحيا، وبك نموت، وإليك النشور", type: 'dua' },
        { text: "آية الكرسي: اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ", type: 'surah' },
        { text: "اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك، وأنا على عهدك ووعدك ما استطعت، أعوذ بك من شر ما صنعت (سيد الاستغفار)", type: 'zekr' },
        { text: "رضيت بالله رباً، وبالإسلام ديناً، وبمحمد ﷺ نبياً (3 مرات)", type: 'zekr' },
        { text: "اللهم إني أسألك العافية في الدنيا والآخرة، اللهم إني أسألك العفو والعافية في ديني ودنياي وأهلي ومالي", type: 'dua' },
        { text: "سورة الإخلاص: قُلْ هُوَ اللَّهُ أَحَدٌ | سورة الفلق: قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ | سورة الناس: قُلْ أَعُوذُ بِرَبِّ النَّاسِ (3 مرات لكل سورة)", type: 'surah' },
        { text: "صبحان الله وبحمده: عدد خلقه، ورضا نفسه، وزنة عرشه، ومداد كلماته (3 مرات)", type: 'zekr' },
        { text: "بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم (3 مرات)", type: 'zekr' },
        { text: "حسبي الله لا إله إلا هو عليه توكلت وهو رب العرش العظيم (7 مرات)", type: 'zekr' }
      ];
    } else if (hour >= 16 && hour < 20) {
      return [
        { text: "🌙 أذكار المساء: ", type: 'title' },
        { text: "أمسينا وأمسى الملك لله، والحمد لله، لا إله إلا الله وحده لا شريك له له الملك وله الحمد وهو على كل شيء قدير", type: 'zekr' },
        { text: "آية الكرسي: اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ", type: 'surah' },
        { text: "اللهم بك أمسينا، وبك أصبحنا، وبك نحيا، وبك نموت، وإليك المصير", type: 'dua' },
        { text: "أعوذ بكلمات الله التامات من شر ما خلق (3 مرات)", type: 'dua' },
        { text: "بسم الله الذي لا يضر مع اسمه شيء في الأرض ولا في السماء وهو السميع العليم (3 مرات)", type: 'zekr' },
        { text: "اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك، وأنا على عهدك ووعدك ما استطعت (سيد الاستغفار)", type: 'zekr' },
        { text: "يا حي يا قيوم برحمتك أستغيث أصلح لي شأني كله ولا تكلني إلى نفسي طرفة عين", type: 'dua' },
        { text: "سورة الإخلاص والمعوذتين (3 مرات لكل واحدة)", type: 'surah' },
        { text: "اللهم صل وسلم وبارك على نبينا محمد (10 مرات)", type: 'dua' }
      ];
    } else if (hour >= 21 || hour < 5) {
      return [
        { text: "💤 أذكار النوم: ", type: 'title' },
        { text: "باسمك ربي وضعت جنبي، وبك أرفعه، فإن أمسكت نفسي فارحمها، وإن أرسلتها فاحفظها بما تحفظ به عبادك الصالحين", type: 'dua' },
        { text: "سورة الملك: المنجية من عذاب القبر (تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ...)", type: 'surah' },
        { text: "اللهم قني عذابك يوم تبعث عبادك (3 مرات)", type: 'dua' },
        { text: "باسمك اللهم أموت وأحيا", type: 'zekr' },
        { text: "سبحان الله (33) | الحمد لله (33) | الله أكبر (34)", type: 'zekr' },
        { text: "آية الكرسي وخواتيم سورة البقرة", type: 'surah' },
        { text: "سورة الإخلاص والمعوذتين (النفث في الكفين والمسح على الجسد)", type: 'surah' }
      ];
    }
    return [
      { text: "✨ أذكار نبوية منوعة: ", type: 'title' },
      { text: "سورة الفاتحة: الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ (أعظم سورة في القرآن)", type: 'surah' },
      { text: "سبحان الله وبحمده، سبحان الله العظيم (خفيفتان على اللسان ثقيلتان في الميزان)", type: 'zekr' },
      { text: "الحمد لله حمداً كثيراً طيباً مباركاً فيه", type: 'zekr' },
      { text: "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير (100 مرة)", type: 'zekr' },
      { text: "اللهم صل وسلم وبارك على نبينا محمد وعلى آله وصحبه أجمعين", type: 'dua' },
      { text: "استغفر الله الذي لا إله إلا هو الحي القيوم وأتوب إليه (100 مرة)", type: 'dua' },
      { text: "لاحول ولا قوة إلا بالله العلي العظيم (كنز من كنوز الجنة)", type: 'zekr' },
      { text: "سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر (أحب الكلام إلى الله)", type: 'zekr' }
    ];
  };

  if (!isBarVisible) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        {!isFirestoreConnected && (
          <div className="absolute -top-6 right-0 text-[8px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full animate-pulse whitespace-nowrap">
            مشكلة في الاتصال
          </div>
        )}
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsBarVisible(true)}
          className="flex items-center gap-3 px-4 py-2 bg-slate-900 border border-amber-500/30 rounded-full text-amber-500 shadow-2xl backdrop-blur-md"
        >
          <div className="flex flex-col -space-y-1 text-right">
            <span className="text-[8px] font-black uppercase opacity-70">الصلاة القادمة</span>
            <span className="text-[10px] font-black text-white">
              {nextPrayer ? `${PRAYER_NAMES[nextPrayer.name]} ${nextPrayer.time}` : '...'}
            </span>
          </div>
          <div className="w-px h-4 bg-slate-700" />
          <Sun className="w-4 h-4 animate-pulse" />
        </motion.button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2 mb-4 px-2 relative">
      {!isFirestoreConnected && (
        <div className="absolute -top-6 right-2 text-[8px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full animate-pulse z-30">
          مشكلة في الاتصال بقاعدة البيانات - قد لا يتم حفظ بياناتك
        </div>
      )}
      <button 
        onClick={() => setIsBarVisible(false)}
        className="absolute -top-1 -right-1 z-20 p-1 bg-slate-800 rounded-full text-slate-500 hover:text-white border border-slate-700 shadow-sm"
        title="إخفاء الشريط"
      >
        <Minus className="w-2.5 h-2.5" />
      </button>

      {/* Prayer Bar */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="relative overflow-hidden bg-slate-900 border border-amber-500/30 rounded-full py-1.5 px-4 flex flex-wrap items-center gap-4 shadow-lg shadow-amber-500/5 group"
      >
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent animate-pulse" />
        
        {/* Adhan Controls */}
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleAdhan}
            className={`p-1.5 rounded-full transition-all ${isAdhanEnabled ? 'text-amber-400 bg-amber-400/10 border border-amber-400/20 shadow-lg shadow-amber-500/20' : 'text-slate-600 bg-slate-800/50'}`}
            title={isAdhanEnabled ? "تعطيل الأذان" : "تفعيل الأذان"}
          >
            {isAdhanEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          
          <div className="flex gap-1" title="اختر صوت المؤذن">
            {(['adhan', 'adhan2', 'adhan3'] as const).map((v, i) => (
              <button
                key={v}
                onClick={() => handleVoiceChange(v)}
                className={`w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center transition-all ${adhanVoice === v ? 'bg-amber-500 text-slate-950 scale-110 shadow-sm' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="h-4 w-px bg-slate-700 hidden sm:block" />

        {/* Next Prayer - Prominent */}
        {nextPrayer && (
          <div className="flex items-center gap-2 bg-amber-500/5 px-3 py-0.5 rounded-full border border-amber-500/10">
            <div className="flex flex-col -space-y-1">
              <span className="text-[7px] font-black text-amber-500 uppercase">الصلاة القادمة</span>
              <span className="text-[11px] font-black text-white">{PRAYER_NAMES[nextPrayer.name]}</span>
            </div>
            <div className="text-[12px] font-black text-amber-400">{nextPrayer.time}</div>
          </div>
        )}

        <div className="h-4 w-px bg-slate-700 hidden md:block" />

        {/* All Prayer Times */}
        <div className="flex-1 flex items-center justify-between overflow-x-auto no-scrollbar gap-4 py-0.5">
          {prayerTimes && Object.entries(prayerTimes)
            .filter(([name]) => ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].includes(name))
            .map(([name, time]) => (
              <div key={name} className={`flex items-center gap-1.5 transition-all flex-shrink-0 ${nextPrayer?.name === name ? 'text-amber-400' : 'text-slate-500 opacity-70'}`}>
                {getPrayerIcon(name)}
                <div className="flex flex-col -space-y-1">
                  <span className="text-[8px] font-bold">{PRAYER_NAMES[name]}</span>
                  <span className="text-[10px] font-black">{time}</span>
                </div>
              </div>
            ))
          }
        </div>
      </motion.div>


      {/* Water Bar */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="relative overflow-hidden bg-slate-900 border border-blue-500/30 rounded-full py-1 px-4 flex items-center gap-3 shadow-lg shadow-blue-500/5 group"
      >
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent animate-pulse" />

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="p-1 px-2 bg-blue-500/20 rounded-full border border-blue-500/30 flex items-center gap-1">
            <GlassWater className="w-4 h-4 text-blue-400" />
          </div>
          <button 
            onClick={toggleWater}
            className={`p-1 rounded-full transition-all ${isWaterEnabled ? 'text-blue-400' : 'text-slate-600'}`}
          >
            {isWaterEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex-1 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button onClick={decrementWater} className="p-1 text-slate-600 hover:text-white transition-colors"><Minus className="w-3 h-3" /></button>
            <span className="text-[11px] font-black text-blue-300 min-w-[30px] text-center">{waterCount}/{waterGoal}</span>
            <button onClick={incrementWater} className="p-1 text-blue-500 hover:text-blue-300 transition-colors"><Plus className="w-3 h-3" /></button>
          </div>
          
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((waterCount / waterGoal) * 100, 100)}%` }}
              className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
            />
          </div>
        </div>

        <p className="text-[10px] font-black text-blue-500/60 uppercase tracking-tighter">ماء</p>
      </motion.div>

      {/* Azkar Marquee */}
      <div className="w-full bg-slate-900 border border-white/20 rounded-full h-10 flex items-center overflow-hidden relative" dir="ltr">
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-slate-900 via-slate-900/80 to-transparent z-10 pointer-events-none" />
        
        <motion.div 
          animate={{ x: ["0%", "-50%"] }}
          transition={{ 
            repeat: Infinity, 
            duration: 80, 
            ease: "linear"
          }}
          className="flex whitespace-nowrap py-1 items-center"
        >
          {[1, 2].map((group) => (
            <div key={group} className="flex gap-24 text-[19px] font-black px-12 font-amiri tracking-wider items-center" dir="rtl">
              {getAzkar().map((item, i) => (
                <span 
                  key={`${group}-${i}`} 
                  className={cn(
                    "transition-all flex-shrink-0 flex items-center gap-4",
                    item.type === 'surah' ? 'text-green-400' : 
                    item.type === 'dua' ? 'text-amber-300' : 
                    item.type === 'zekr' ? 'text-rose-400' : 
                    'text-white'
                  )}
                >
                  <span className="opacity-40 text-[11px] font-sans">{i + 1}</span>
                  {item.text}
                  <div className="w-2 h-2 rounded-full bg-white/20 mx-4" />
                </span>
              ))}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

