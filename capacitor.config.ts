import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ac.in.vignan.campuspulse',
  appName: 'CampusPulse',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
