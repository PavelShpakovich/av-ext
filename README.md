# AV.BY Currency Helper

Browser extension for Chrome that adds BYN prices next to USD prices on av.by listings and car detail pages.

## Features

- shows converted BYN next to USD prices on av.by
- supports official NBRB rate or a selected bank from Myfin
- caches rates in extension storage and falls back gracefully when Myfin is unavailable
- updates prices on dynamic page navigation via MutationObserver

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
- av.by DOM selectors may need updates if page markup changes
