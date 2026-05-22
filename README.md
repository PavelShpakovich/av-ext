# AV.BY | Kufar: цены в USD

Browser extension for Chrome that shows approximate USD prices next to BYN amounts on Kufar and av.by listings and item pages using the official NBRB rate, the BVFB trading rate, or selected bank sell rates.

## Features

- shows approximate USD values next to BYN prices on av.by and kufar.by
- supports official NBRB rate, BVFB trading rate, or a selected bank from Myfin
- caches rates in extension storage and falls back gracefully when Myfin is unavailable
- updates prices on dynamic page navigation via MutationObserver
- skips price blocks that already show a USD price on the page

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Load the unpacked extension from `build/chrome-mv3/`.

## Limitations

- first version targets Chrome and Edge only
- Myfin parsing depends on current HTML structure
- marketplace DOM selectors may need updates if page markup changes
