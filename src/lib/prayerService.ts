import { format } from 'date-fns';
import { Coordinates, CalculationMethod, PrayerTimes as AdhanPrayerTimes } from 'adhan';

export interface PrayerTimes {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  [key: string]: string;
}

const WILAYA_COORDS: Record<string, { lat: number; lng: number }> = {
  'Adrar': { lat: 27.8742, lng: -0.2939 },
  'Chlef': { lat: 36.1648, lng: 1.3317 },
  'Laghouat': { lat: 33.8000, lng: 2.8651 },
  'Oum El Bouaghi': { lat: 35.8754, lng: 7.1135 },
  'Batna': { lat: 35.5550, lng: 6.1741 },
  'Bejaia': { lat: 36.7559, lng: 5.0843 },
  'Biskra': { lat: 34.8504, lng: 5.7280 },
  'Bechar': { lat: 31.6167, lng: -2.2167 },
  'Blida': { lat: 36.4700, lng: 2.8277 },
  'Bouira': { lat: 36.3749, lng: 3.9009 },
  'Tamanrasset': { lat: 22.7850, lng: 5.5228 },
  'Tebessa': { lat: 35.4042, lng: 8.1242 },
  'Tlemcen': { lat: 34.8828, lng: -1.3167 },
  'Tiaret': { lat: 35.3710, lng: 1.3169 },
  'Tizi Ouzou': { lat: 36.7118, lng: 4.0459 },
  'Algiers': { lat: 36.7525, lng: 3.0420 },
  'الجزائر': { lat: 36.7525, lng: 3.0420 },
  'Djelfa': { lat: 34.6728, lng: 3.2631 },
  'Jijel': { lat: 36.8117, lng: 5.7667 },
  'Setif': { lat: 36.1912, lng: 5.4093 },
  'Saida': { lat: 34.8303, lng: 0.1517 },
  'Skikda': { lat: 36.8781, lng: 6.9033 },
  'Sidi Bel Abbes': { lat: 35.1899, lng: -0.6308 },
  'Annaba': { lat: 36.9000, lng: 7.7667 },
  'Guelma': { lat: 36.4621, lng: 7.4261 },
  'Constantine': { lat: 36.3650, lng: 6.6147 },
  'Medea': { lat: 36.2642, lng: 2.7539 },
  'Mostaganem': { lat: 35.9333, lng: 0.0833 },
  'M\'Sila': { lat: 35.7058, lng: 4.5419 },
  'Mascara': { lat: 35.3992, lng: 0.1403 },
  'Ouargla': { lat: 31.9482, lng: 5.3250 },
  'Oran': { lat: 35.6971, lng: -0.6308 },
  'El Bayadh': { lat: 33.6803, lng: 1.0192 },
  'Illizi': { lat: 26.4833, lng: 8.4667 },
  'Bordj Bou Arreridj': { lat: 36.0733, lng: 4.7611 },
  'Boumerdes': { lat: 36.7597, lng: 3.4739 },
  'El Tarf': { lat: 36.7672, lng: 8.3136 },
  'Tindouf': { lat: 27.6711, lng: -8.1472 },
  'Tissemsilt': { lat: 35.6072, lng: 1.8106 },
  'El Oued': { lat: 33.3678, lng: 6.8529 },
  'Khenchela': { lat: 35.4350, lng: 7.1433 },
  'Souk Ahras': { lat: 36.2864, lng: 7.9511 },
  'Tipaza': { lat: 36.5894, lng: 2.4475 },
  'Mila': { lat: 36.4503, lng: 6.2644 },
  'Ain Defla': { lat: 36.2625, lng: 2.3703 },
  'Naama': { lat: 33.2667, lng: -0.3167 },
  'Ain Temouchent': { lat: 35.3044, lng: -1.1403 },
  'Ghardaia': { lat: 32.4909, lng: 3.6733 },
  'Relizane': { lat: 35.7372, lng: 0.5558 },
};

export const cleanWilayaName = (wilaya: string): string => {
  let city = wilaya;
  // Handle "XX - Name" format
  if (city.includes('-')) {
    const parts = city.split('-');
    city = (parts[1] || parts[0]).trim();
  }
  // Handle "Name (Other Name)" format
  if (city.includes('(') && city.includes(')')) {
    city = city.match(/\(([^)]+)\)/)?.[1] || city;
  }
  
  // Normalize common names
  const cityLower = city.toLowerCase();
  if (cityLower === 'alger' || cityLower === 'الجزائر') return 'Algiers';
  if (cityLower === 'oran' || cityLower === 'وهران') return 'Oran';
  if (cityLower === 'constantine' || cityLower === 'قسنطينة') return 'Constantine';
  if (cityLower === 'annaba' || cityLower === 'عنابة') return 'Annaba';
  
  return city;
};

export const fetchPrayerTimes = async (wilaya: string): Promise<PrayerTimes | null> => {
  const city = cleanWilayaName(wilaya);
  const country = 'Algeria';
  const method = 3; // Muslim World League
  
  // Try network first
  try {
    const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${country}&method=${method}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000) // 5s timeout for fast failure
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.code === 200 && data.data && data.data.timings) {
        return data.data.timings;
      }
    }
  } catch (error) {
    console.warn(`Network fetch failed for ${city}, falling back to local calculation`, error);
  }

  // Local calculation fallback using 'adhan' library
  try {
    const coords = WILAYA_COORDS[city] || WILAYA_COORDS['Algiers'];
    const coordinates = new Coordinates(coords.lat, coords.lng);
    const params = CalculationMethod.MuslimWorldLeague();
    const date = new Date();
    const adhanTimes = new AdhanPrayerTimes(coordinates, date, params);

    const formatTime = (time: Date) => format(time, 'HH:mm');

    return {
      Fajr: formatTime(adhanTimes.fajr),
      Sunrise: formatTime(adhanTimes.sunrise),
      Dhuhr: formatTime(adhanTimes.dhuhr),
      Asr: formatTime(adhanTimes.asr),
      Sunset: formatTime(adhanTimes.sunset),
      Maghrib: formatTime(adhanTimes.maghrib),
      Isha: formatTime(adhanTimes.isha),
    };
  } catch (err) {
    console.error("Local prayer calculation failed:", err);
    return null;
  }
};
