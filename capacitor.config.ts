import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.40cda9366ca546df94c3ea9e51eec6f1',
  appName: 'Xtrim',
  webDir: 'dist',
  server: {
    url: 'https://40cda936-6ca5-46df-94c3-ea9e51eec6f1.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Filesystem: {
      requestPermissions: true
    }
  }
};

export default config;
