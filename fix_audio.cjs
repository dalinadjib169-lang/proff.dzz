const fs = require('fs');
let code = fs.readFileSync('src/hooks/useBackgroundFeatures.ts', 'utf8');

const target1 = `  // Sounds
  const athanSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/2281/2281-preview.mp3'));
  const waterSound = useRef(new Audio('https://assets.mixkit.co/active_storage/sfx/1350/1350-preview.mp3'));`;

const replace1 = `  // Sounds
  const athanSound = useRef<HTMLAudioElement | null>(null);
  const waterSound = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    try {
      athanSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2281/2281-preview.mp3');
      waterSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1350/1350-preview.mp3');
    } catch(e) {
      console.warn("Audio init failed", e);
    }
  }, []);`;

code = code.replace(target1, replace1);

const target2 = `athanSound.current.play().catch(e => console.log('Audio blocked', e));`;
const replace2 = `athanSound.current?.play().catch(e => console.log('Audio blocked', e));`;
code = code.replace(target2, replace2);

const target3 = `waterSound.current.play().catch(e => console.error('Audio blocked', e));`;
const replace3 = `waterSound.current?.play().catch(e => console.error('Audio blocked', e));`;
code = code.replace(target3, replace3);

fs.writeFileSync('src/hooks/useBackgroundFeatures.ts', code);
console.log('Success fix audio');
