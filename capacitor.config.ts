import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor Configuration for "Amar Mess" Mobile App
 * 
 * Supports: Android (APK/AAB) & iOS (IPA/Xcode)
 * Package ID: com.amarmess.app
 * Cloud Backend: https://mymessmanagement.onrender.com
 */
const config: CapacitorConfig = {
  appId: 'com.amarmess.app',
  appName: 'Amar Mess',
  webDir: 'dist',
  server: {
    // Points the native mobile container directly to your live production cloud backend.
    // Any change you push to your backend or website instantly updates on users' mobile phones!
    url: 'https://mymessmanagement.onrender.com',
    cleartext: false,
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#020617',
      showSpinner: true,
      spinnerColor: '#06b6d4',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#020617'
    }
  }
};

export default config;
