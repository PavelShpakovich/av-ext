import type { BadgeAppearance, UserSettings } from './types';

export const DEFAULT_CACHE_TTL_MS = 15 * 60_000;
export const MYFIN_CITY_SLUG = 'minsk';
export const INJECTED_BADGE_CLASS = 'avby-currency-helper-badge';
export const INJECTED_STYLE_ID = 'avby-currency-helper-style';

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

export const DEFAULT_SETTINGS: UserSettings = {
  enabled: true,
  selectedRateSourceType: 'nbrb',
  selectedBankAlias: null,
  cacheTtlMs: DEFAULT_CACHE_TTL_MS,
  roundToWholeByn: true,
  badgeAppearance: DEFAULT_BADGE_APPEARANCE,
  bannerAppearance: DEFAULT_BANNER_APPEARANCE,
};
