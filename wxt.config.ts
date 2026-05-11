import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  outDir: 'build',
  manifestVersion: 3,
  manifest: {
    name: 'AV.BY Цены в долларах',
    description: 'Показывает цены в долларах рядом с суммами в BYN на av.by по курсу НБРБ или выбранного банка.',
    version: '0.2.4',
    permissions: ['storage', 'tabs', 'alarms'],
    host_permissions: ['https://*.av.by/*', 'https://api.nbrb.by/*', 'https://myfin.by/*'],
    icons: {
      16: 'icon-16.png',
      32: 'icon-32.png',
      48: 'icon-48.png',
      128: 'icon-128.png',
    },
    action: {
      default_title: 'AV.BY Цены в долларах',
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
