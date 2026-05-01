/**
 * Sound utility for Teac DZ
 */

const SOUND_URLS = {
  message: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
  like: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
  comment: 'https://assets.mixkit.co/active_storage/sfx/2360/2360-preview.mp3',
  post: 'https://assets.mixkit.co/active_storage/sfx/2359/2359-preview.mp3',
  notification: 'https://assets.mixkit.co/active_storage/sfx/2357/2357-preview.mp3',
  call: 'https://assets.mixkit.co/active_storage/sfx/2361/2361-preview.mp3',
  ringtone: 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3',
  adhan: 'https://www.islamcan.com/audio/adhan/azan1.mp3',
  adhan2: 'https://www.islamcan.com/audio/adhan/azan2.mp3',
  adhan3: 'https://www.islamcan.com/audio/adhan/azan3.mp3',
  water: 'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
};

export type SoundType = keyof typeof SOUND_URLS;

export const playSound = (type: SoundType, loop = false) => {
  try {
    const audio = new Audio(SOUND_URLS[type]);
    audio.volume = 0.5;
    audio.loop = loop;
    audio.play().catch(err => console.warn('Sound playback failed:', err));
    return audio;
  } catch (err) {
    console.warn('Error playing sound:', err);
    return null;
  }
};
