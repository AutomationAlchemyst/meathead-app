import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.workflowguys.meathead',
  appName: 'MeatHead',
  webDir: 'out',
  server: {
    url: 'https://meathead-app.vercel.app',
    cleartext: false
  }
};

export default config;
