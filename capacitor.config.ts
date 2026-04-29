import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.teachdz.app',
  appName: 'TeachDZ',
  webDir: 'dist',
  server: {
    url: 'https://proff-dzz.vercel.app/',
    allowNavigation: ['proff-dzz.vercel.app'],
    cleartext: true
  }
};

export default config;
