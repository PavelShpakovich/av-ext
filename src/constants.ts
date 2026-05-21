import type { BadgeAppearance, EnabledSites, SiteAppearanceMap, SupportedSite, UserSettings } from './types';

export const DEFAULT_CACHE_TTL_MS = 15 * 60_000;
export const MYFIN_CITY_SLUG = 'minsk';
export const INJECTED_BADGE_CLASS = 'marketplace-currency-helper-badge';
export const INJECTED_STYLE_ID = 'marketplace-currency-helper-style';

export const SITE_LABELS: Record<SupportedSite, string> = {
  avby: 'av.by',
  kufar: 'kufar.by',
};

export const SITE_MATCH_PATTERNS: Record<SupportedSite, string[]> = {
  avby: ['https://cars.av.by/*', 'https://av.by/*', 'https://*.av.by/*'],
  kufar: ['https://kufar.by/*', 'https://*.kufar.by/*'],
};

export const ALL_SITE_TAB_PATTERNS = Object.values(SITE_MATCH_PATTERNS).flat();

export const DEFAULT_ENABLED_SITES: EnabledSites = {
  avby: true,
  kufar: true,
};

export const DEFAULT_BADGE_APPEARANCE: BadgeAppearance = {
  mode: 'badge',
  light: { textColor: '#2d4a10', backgroundColor: '#5d8f2e' },
  dark: { textColor: '#d4f0a0', backgroundColor: '#3c6414' },
};

export const DEFAULT_BANNER_APPEARANCE: BadgeAppearance = {
  mode: 'badge',
  light: { textColor: '#ffffff', backgroundColor: '#ffffff' },
  dark: { textColor: '#ffffff', backgroundColor: '#ffffff' },
};

export const DEFAULT_SITE_APPEARANCES: SiteAppearanceMap = {
  avby: {
    badgeAppearance: DEFAULT_BADGE_APPEARANCE,
    bannerAppearance: DEFAULT_BANNER_APPEARANCE,
  },
  kufar: {
    badgeAppearance: {
      mode: 'badge',
      light: { textColor: '#5f2d00', backgroundColor: '#f5a65b' },
      dark: { textColor: '#ffe2bf', backgroundColor: '#a75810' },
    },
    bannerAppearance: {
      mode: 'badge',
      light: { textColor: '#ffffff', backgroundColor: '#f29b38' },
      dark: { textColor: '#fff4e8', backgroundColor: '#8a4b12' },
    },
  },
};

export const DEFAULT_SETTINGS: UserSettings = {
  enabledSites: DEFAULT_ENABLED_SITES,
  selectedRateSourceType: 'nbrb',
  selectedBankAlias: null,
  cacheTtlMs: DEFAULT_CACHE_TTL_MS,
  roundToWholeByn: true,
  siteAppearances: DEFAULT_SITE_APPEARANCES,
};
