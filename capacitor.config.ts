import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.valryde.operator',
  appName: 'Valryde Operator',
  webDir: 'dist/valryde-operator/browser',
  server: {
    androidScheme: 'https',
  },
};

export default config;
