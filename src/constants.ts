import type { UserSettings } from './types';

export const DEFAULT_CACHE_TTL_MS = 15 * 60_000;
export const MYFIN_CITY_SLUG = 'minsk';
export const INJECTED_BADGE_CLASS = 'avby-currency-helper-badge';
export const INJECTED_STYLE_ID = 'avby-currency-helper-style';

export const DEFAULT_SETTINGS: UserSettings = {
  enabled: true,
  selectedRateSourceType: 'nbrb',
  selectedBankAlias: null,
  cacheTtlMs: DEFAULT_CACHE_TTL_MS,
  roundToWholeByn: true,
};
