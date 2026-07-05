
import { useEffect, useState, useRef } from 'react';
import { Coordinates, CalculationMethod, PrayerTimes, Prayer } from 'adhan';
import { toast } from 'react-hot-toast';
import { useAuth } from './useAuth';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { requestNotificationPermission, displayNotification } from '../lib/notifications';

export function useBackgroundFeatures() {
  const { profile } = useAuth();
  const [isWaterEnabled, setIsWaterEnabled] = useState(profile?.reminders?.water ?? false);
  const [isAthanEnabled, setIsAthanEnabled] = useState(profile?.reminders?.prayer ?? false);
  const [waterReminderMinutes, setWaterReminderMinutes] = useState(profile?.settings?.waterReminderMinutes ?? 120);
  
  useEffect(() => {
    if (profile) {
      setIsWaterEnabled(profile.reminders?.water ?? false);
      setIsAthanEnabled(profile.reminders?.prayer ?? false);
      if (profile.settings) {
        setWaterReminderMinutes(profile.settings.waterReminderMinutes ?? 120);
      }
    }
  }, [profile]);

  const lastAthanPlayed = useRef<string | null>(null);
  const lastWaterPlayed = useRef<number | null>(null);
  const userCoords = useRef<Coordinates | null>(null);

  useEffect(() => {
    // Initial location fetch
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        userCoords.current = new Coordinates(pos.coords.latitude, pos.coords.longitude);
      }, (err) => console.warn('Geolocation error:', err));
    }
  }, []);

  // Sounds
  const athanSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2281/2281-preview.mp3'));
  const waterSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/1350/1350-preview.mp3'));

  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        console.log('SW Registered', reg);
      });
    }
    
    // Request Notification Permissions
    requestNotificationPermission();
  }, []);

  // Prayer Times Monitoring
  useEffect(() => {
    const checkPrayer = () => {
      if (!isAthanEnabled) return;

      if (!userCoords.current) {
        navigator.geolocation.getCurrentPosition((pos) => {
          userCoords.current = new Coordinates(pos.coords.latitude, pos.coords.longitude);
        });
        return;
      }

      const params = CalculationMethod.MuslimWorldLeague();
      const date = new Date();
      const prayerTimes = new PrayerTimes(userCoords.current, date, params);
      
      const nextP = prayerTimes.nextPrayer();
      const nextTime = prayerTimes.timeForPrayer(nextP);
      
      if (nextTime) {
        const diff = nextTime.getTime() - Date.now();
        // Trigger if less than 35 seconds to next prayer (since we check every 30s)
        if (diff > 0 && diff < 35000 && lastAthanPlayed.current !== nextP && nextP !== 'none') {
          playAthan(nextP);
          lastAthanPlayed.current = nextP;
        }
      }
    };

    const interval = setInterval(checkPrayer, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [isAthanEnabled]);

  // Water Reminder Monitoring
  useEffect(() => {
    const checkWater = () => {
      if (!isWaterEnabled) return;
      
      const now = Date.now();
      const intervalMs = waterReminderMinutes * 60 * 1000;
      
      if (!lastWaterPlayed.current || (now - lastWaterPlayed.current >= intervalMs)) {
        playWaterReminder();
        lastWaterPlayed.current = now;
      }
    };

    const interval = setInterval(checkWater, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isWaterEnabled, waterReminderMinutes]);

  const playAthan = (prayerName: string) => {
    const pNames: Record<string, string> = {
      fajr: 'الفجر',
      dhuhr: 'الظهر',
      asr: 'العصر',
      maghrib: 'المغرب',
      isha: 'العشاء'
    };
    
    const name = pNames[prayerName] || prayerName;
    
    // TTS voice notification
    try {
      const msg = new SpeechSynthesisUtterance(`حان موعد صلاة ${name} يا أستاذ`);
      msg.lang = 'ar-SA';
      window.speechSynthesis.speak(msg);
    } catch (e) {
      console.warn("TTS failed", e);
    }

    displayNotification(`حان الآن موعد أذان ${name}`, {
      body: 'اذكر الله وصل على النبي محمد صلى الله عليه وسلم',
      icon: '/logo.png'
    });
    
    athanSound.current.play().catch(e => console.log('Audio blocked', e));
    toast.success(`حان وقت الصلاة: ${name}`);
  };

  const playWaterReminder = () => {
    displayNotification('تذكير: اشرب الماء', {
      body: 'حافظ على رطوبة جسمك وصحتك، اشرب كوباً من الماء الآن.',
      icon: '/logo.png'
    });
    waterSound.current.play().catch(e => console.error('Audio blocked', e));
    toast('💦 حان وقت شرب الماء!', { icon: '🥛' });
  };

  useEffect(() => {
    const handleUpdateWater = (e: any) => {
      if (!profile?.uid) return;
      const amount = e.detail?.amount || 250;
      updateDoc(doc(db, 'users', profile.uid), {
        'reminders.waterCurrent': (profile?.reminders?.waterCurrent || 0) + amount,
        'reminders.waterGlassCount': (profile?.reminders?.waterGlassCount || 0) + 1
      });
    };
    window.addEventListener('update-water', handleUpdateWater);
    return () => window.removeEventListener('update-water', handleUpdateWater);
  }, [profile?.uid, profile?.reminders]);

  return {
    isWaterEnabled,
    setIsWaterEnabled,
    isAthanEnabled,
    setIsAthanEnabled,
    waterReminderMinutes,
    setWaterReminderMinutes
  };
}
