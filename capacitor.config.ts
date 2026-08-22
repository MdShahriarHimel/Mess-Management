import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.messmanagement.app',
  appName: 'Mess Management',
  webDir: 'dist',
  server: {
    url: 'https://mymessmanagement.onrender.com',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
