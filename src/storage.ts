import { DEFAULT_ENABLED_SITES, DEFAULT_SETTINGS, DEFAULT_SITE_APPEARANCES } from './constants';
import type {
  BadgeAppearance,
  EnabledSites,
  RateSnapshot,
  SiteAppearanceMap,
  SiteAppearanceSettings,
  UserSettings,
} from './types';

const SETTINGS_KEY = 'marketplaceCurrencySettings';
const LEGACY_SETTINGS_KEY = 'avbyCurrencySettings';
const SNAPSHOT_KEY = 'marketplaceRateSnapshot';
const LEGACY_SNAPSHOT_KEY = 'avbyRateSnapshot';

type StoredSettings = Partial<UserSettings> & {
  enabled?: boolean;
  badgeAppearance?: Partial<BadgeAppearance>;
  bannerAppearance?: Partial<BadgeAppearance>;
};

type PartialSiteAppearanceSettings = {
  badgeAppearance?: Partial<BadgeAppearance>;
  bannerAppearance?: Partial<BadgeAppearance>;
};

function mergeAppearance(defaults: BadgeAppearance, value?: Partial<BadgeAppearance>): BadgeAppearance {
  return {
    ...defaults,
    ...value,
    light: {
      ...defaults.light,
      ...(value?.light ?? {}),
    },
    dark: {
      ...defaults.dark,
      ...(value?.dark ?? {}),
    },
  };
}

function getEnabledSites(value?: StoredSettings): EnabledSites {
  if (value?.enabledSites) {
    return {
      ...DEFAULT_ENABLED_SITES,
      ...value.enabledSites,
    };
  }

  if (typeof value?.enabled === 'boolean') {
    return {
      avby: value.enabled,
      kufar: value.enabled,
    };
  }

  return DEFAULT_ENABLED_SITES;
}

function mergeSiteAppearance(
  defaults: SiteAppearanceSettings,
  value?: PartialSiteAppearanceSettings,
): SiteAppearanceSettings {
  return {
    badgeAppearance: mergeAppearance(defaults.badgeAppearance, value?.badgeAppearance),
    bannerAppearance: mergeAppearance(defaults.bannerAppearance, value?.bannerAppearance),
  };
}

function getSiteAppearances(value?: StoredSettings): SiteAppearanceMap {
  const legacyAppearance =
    value?.badgeAppearance || value?.bannerAppearance
      ? {
          badgeAppearance: value.badgeAppearance,
          bannerAppearance: value.bannerAppearance,
        }
      : undefined;

  return {
    avby: mergeSiteAppearance(DEFAULT_SITE_APPEARANCES.avby, value?.siteAppearances?.avby ?? legacyAppearance),
    kufar: mergeSiteAppearance(DEFAULT_SITE_APPEARANCES.kufar, value?.siteAppearances?.kufar),
  };
}

function normalizeSettings(value?: StoredSettings): UserSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...value,
    enabledSites: getEnabledSites(value),
    siteAppearances: getSiteAppearances(value),
  };
}

export class Storage {
  static async getSettings(): Promise<UserSettings> {
    const currentResult = (await browser.storage.local.get(SETTINGS_KEY)) as Record<string, StoredSettings | undefined>;
    if (currentResult[SETTINGS_KEY]) {
      return normalizeSettings(currentResult[SETTINGS_KEY]);
    }

    const legacyResult = (await browser.storage.local.get(LEGACY_SETTINGS_KEY)) as Record<
      string,
      StoredSettings | undefined
    >;
    return normalizeSettings(legacyResult[LEGACY_SETTINGS_KEY]);
  }

  static async saveSettings(settings: UserSettings): Promise<void> {
    await browser.storage.local.set({ [SETTINGS_KEY]: settings });
  }

  static async getRateSnapshot(): Promise<RateSnapshot | null> {
    const currentResult = (await browser.storage.local.get(SNAPSHOT_KEY)) as Record<string, RateSnapshot | undefined>;
    if (currentResult[SNAPSHOT_KEY]) {
      return currentResult[SNAPSHOT_KEY] ?? null;
    }

    const legacyResult = (await browser.storage.local.get(LEGACY_SNAPSHOT_KEY)) as Record<
      string,
      RateSnapshot | undefined
    >;
    return legacyResult[LEGACY_SNAPSHOT_KEY] ?? null;
  }

  static async saveRateSnapshot(snapshot: RateSnapshot): Promise<void> {
    await browser.storage.local.set({ [SNAPSHOT_KEY]: snapshot });
  }

  static async clearRateSnapshot(): Promise<void> {
    await browser.storage.local.remove(SNAPSHOT_KEY);
  }

  static isSnapshotFresh(snapshot: RateSnapshot | null, now = Date.now()): boolean {
    return Boolean(snapshot && snapshot.expiresAt > now);
  }
}
