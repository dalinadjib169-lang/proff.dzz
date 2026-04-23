import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Moon, 
  Sun, 
  Cloud, 
  Droplets, 
  Bell, 
  BellOff, 
  Volume2, 
  VolumeX, 
  Clock,
  ChevronRight,
  ChevronLeft,
  Settings as SettingsIcon,
  Plus,
  Minus
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';

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
  
  const adhanAudio = useRef<HTMLAudioElement | null>(null);
  const waterAudio = useRef<HTMLAudioElement | null>(null);

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
      
      const tryFetch = async (cityName: string) => {
        const response = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(cityName)}&country=Algeria&method=3`);
        return await response.json();
      };

      let data = await tryFetch(city);
      
      // Fallback if city name failed
      if (data.code !== 200 && city === 'Algiers') {
        data = await tryFetch('Alger');
      }

      if (data.code === 200) {
        setPrayerTimes(data.data.timings);
      }
    } catch (error) {
      console.error("Error fetching prayer times:", error);
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
    if (!next) next = prayers[0]; // Next day's Fajr
    
    setNextPrayer(next);

    // Check if it's exactly prayer time for Adhan
    if (isAdhanEnabled && currentTime === next.time && (adhanAudio.current?.paused ?? true)) {
      playAdhan();
    }
  };

  const playAdhan = () => {
    if (!adhanAudio.current) {
      adhanAudio.current = new Audio(ADHAN_URL);
    }
    adhanAudio.current.play().catch(e => console.error("Error playing adhan:", e));
  };

  const playWaterSound = () => {
    if (!waterAudio.current) {
      waterAudio.current = new Audio(WATER_SOUND_URL);
    }
    waterAudio.current.play().catch(e => console.error("Error playing water sound:", e));
  };

  const toggleAdhan = async () => {
    const newState = !isAdhanEnabled;
    setIsAdhanEnabled(newState);
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

  return (
    <div className="w-full space-y-4 mb-6">
      {/* Prayer Times Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-xl border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-2xl">
            <Moon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">مواقيت الصلاة</h3>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{profile?.wilaya || 'الجزائر'}</p>
          </div>
        </div>

        <div className="flex items-center gap-6 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
          {prayerTimes && Object.entries(prayerTimes).filter(([name]) => ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].includes(name)).map(([name, time]) => (
            <div key={name} className={`flex flex-col items-center gap-1 min-w-[60px] ${nextPrayer?.name === name ? 'scale-110' : 'opacity-60'}`}>
              <span className="text-[10px] font-black text-slate-400 uppercase">{name}</span>
              <span className={`text-sm font-black ${nextPrayer?.name === name ? 'text-purple-600 dark:text-purple-400' : 'text-slate-700 dark:text-slate-200'}`}>{time}</span>
              {nextPrayer?.name === name && <div className="w-1 h-1 bg-purple-600 rounded-full mt-1"></div>}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={toggleAdhan}
            className={`p-3 rounded-2xl transition-all ${isAdhanEnabled ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
          >
            {isAdhanEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <div className="hidden sm:block h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase">الصلاة القادمة</p>
            <p className="text-sm font-black text-slate-900 dark:text-white">{nextPrayer?.name} - {nextPrayer?.time}</p>
          </div>
        </div>
      </motion.div>

      {/* Water Reminder Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-900 rounded-3xl p-4 shadow-xl border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-2xl">
            <Droplets className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">تذكير شرب الماء</h3>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">حافظ على رطوبة جسمك</p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center gap-4">
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-800">
            <button 
              onClick={decrementWater}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-500"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center min-w-[80px]">
              <span className="text-lg font-black text-slate-900 dark:text-white">{waterCount} / {waterGoal}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">كؤوس</span>
            </div>
            <button 
              onClick={incrementWater}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-500"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 max-w-[200px] h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((waterCount / waterGoal) * 100, 100)}%` }}
              className="h-full bg-gradient-to-r from-blue-400 to-blue-600 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={toggleWater}
            className={`p-3 rounded-2xl transition-all ${isWaterEnabled ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
          >
            {isWaterEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
