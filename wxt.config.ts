import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  outDir: 'build',
  manifestVersion: 3,
  manifest: {
    name: 'AV.BY | Kufar: цены в USD',
    description: 'Показывает цены в USD на av.by и kufar.by по курсу НБРБ, БВФБ или банка.',
    version: '1.1.0',
    permissions: ['storage', 'tabs', 'alarms'],
    host_permissions: [
      'https://av.by/*',
      'https://*.av.by/*',
      'https://kufar.by/*',
      'https://*.kufar.by/*',
      'https://api.nbrb.by/*',
      'https://myfin.by/*',
    ],
    icons: {
      16: 'icon-16.png',
      32: 'icon-32.png',
      48: 'icon-48.png',
      128: 'icon-128.png',
    },
    action: {
      default_title: 'AV.BY | Kufar: цены в USD',
      default_popup: 'popup.html',
      default_icon: {
        16: 'icon-16.png',
        32: 'icon-32.png',
        48: 'icon-48.png',
        128: 'icon-128.png',
      },
    },
  },
  vite: () => ({
    build: {
      target: 'esnext',
    },
  }),
});
