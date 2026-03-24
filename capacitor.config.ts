import { APP_METADATA } from './src/app/appMeta';

const config = {
  appId: APP_METADATA.packageId,
  appName: APP_METADATA.title,
  webDir: APP_METADATA.webDir,
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https'
  }
};

export default config;
