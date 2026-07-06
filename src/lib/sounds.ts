/**
 * Sound utility for Teac DZ
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
  try {
    if (!audioCache[type]) {
      audioCache[type] = new Audio(SOUND_URLS[type]);
    }
    // Clone the audio node to allow overlapping sounds without delay
    const audio = audioCache[type]?.cloneNode() as HTMLAudioElement;
    if (audio) {
      audio.volume = 0.5;
      audio.loop = loop;
      audio.play().catch(err => console.warn('Sound playback failed:', err));
      return audio;
    }
    return null;
  } catch (err) {
    console.warn('Error playing sound:', err);
    return null;
  }
};
