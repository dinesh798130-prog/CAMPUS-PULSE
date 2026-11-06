import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.campuspulse.app',
  appName: 'CAMPUS PULSE',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
