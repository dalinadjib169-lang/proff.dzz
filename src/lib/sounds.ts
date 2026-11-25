/**
 * Sound utility for Teac DZ with Web Audio API Facebook-style chime fallback
 */

const SOUND_URLS = {
  message: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
  like: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
  comment: 'https://assets.mixkit.co/active_storage/sfx/2360/2360-preview.mp3',
  post: 'https://assets.mixkit.co/active_storage/sfx/2359/2359-preview.mp3',
  notification: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  call: 'https://assets.mixkit.co/active_storage/sfx/2361/2361-preview.mp3',
  ringtone: 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3',
  adhan: 'https://www.islamcan.com/audio/adhan/azan1.mp3',
  adhan2: 'https://www.islamcan.com/audio/adhan/azan2.mp3',
  adhan3: 'https://www.islamcan.com/audio/adhan/azan3.mp3',
  water: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
  success: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  error: 'https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3',
  'button-click': 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
};

export type SoundType = keyof typeof SOUND_URLS;

const audioCache: Partial<Record<SoundType, HTMLAudioElement>> = {};
let sharedAudioCtx: AudioContext | null = null;
let soundEnabled = true;

export const setNotificationSoundEnabled = (enabled: boolean) => {
  soundEnabled = enabled;
  try {
    localStorage.setItem('teachdz_sound_enabled', enabled ? 'true' : 'false');
  } catch {}
};

export const isNotificationSoundEnabled = () => {
  try {
    const saved = localStorage.getItem('teachdz_sound_enabled');
    if (saved !== null) return saved !== 'false';
  } catch {}
  return soundEnabled;
};

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export const unlockAudio = () => {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
};

// Unlock audio on first user gesture so background chimes can play reliably
if (typeof window !== 'undefined') {
  const handleUnlock = () => {
    unlockAudio();
  };
  window.addEventListener('pointerdown', handleUnlock, { once: true, passive: true });
  window.addEventListener('keydown', handleUnlock, { once: true, passive: true });
}

// Synthesize crisp Facebook-style notification pop/ding via Web Audio API
export const playSynthesizedChime = (type: SoundType = 'message') => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'message' || type === 'comment') {
      // Classic bright 2-tone Messenger "ding-pop"
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(660, now);
      osc1.frequency.setValueAtTime(880, now + 0.08);
      osc2.frequency.setValueAtTime(990, now);
      osc2.frequency.setValueAtTime(1320, now + 0.08);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.33);
      osc2.stop(now + 0.33);
    } else if (type === 'notification' || type === 'like' || type === 'success') {
      // Crisp 3-note Facebook alert chime
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.setValueAtTime(659.25, now + 0.07); // E5
      osc1.frequency.setValueAtTime(783.99, now + 0.14); // G5
      osc2.frequency.setValueAtTime(1046.5, now + 0.14);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.42);
      osc2.stop(now + 0.42);
    } else {
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.23);
      osc2.stop(now + 0.23);
    }
  } catch (e) {
    console.warn('Synthesized chime failed:', e);
  }
};

export const preloadSounds = () => {
  if (typeof window === 'undefined') return;
  (Object.keys(SOUND_URLS) as SoundType[]).forEach(key => {
    const audio = new Audio(SOUND_URLS[key]);
    audio.preload = 'auto';
    audioCache[key] = audio;
  });
};

// Start preloading immediately in the background
preloadSounds();

export const playSound = (type: SoundType, loop = false) => {
  if (!isNotificationSoundEnabled() && type !== 'ringtone' && type !== 'adhan' && type !== 'adhan2' && type !== 'adhan3') {
    return null;
  }

  try {
    if (!audioCache[type]) {
      audioCache[type] = new Audio(SOUND_URLS[type]);
    }
    const audio = audioCache[type]?.cloneNode() as HTMLAudioElement;
    if (audio) {
      audio.volume = 0.65;
      audio.loop = loop;
      audio.play().catch(() => {
        if (!loop) playSynthesizedChime(type);
      });
      return audio;
    }
    if (!loop) playSynthesizedChime(type);
    return null;
  } catch (err) {
    if (!loop) playSynthesizedChime(type);
    return null;
  }
};
