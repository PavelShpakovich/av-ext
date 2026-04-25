import { DEFAULT_SETTINGS } from './constants';
import type { RateSnapshot, UserSettings } from './types';

const SETTINGS_KEY = 'avbyCurrencySettings';
const SNAPSHOT_KEY = 'avbyRateSnapshot';

export class Storage {
  static async getSettings(): Promise<UserSettings> {
    const result = (await browser.storage.local.get(SETTINGS_KEY)) as Record<string, UserSettings | undefined>;
    return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] ?? {}) };
  }

  static async saveSettings(settings: UserSettings): Promise<void> {
    await browser.storage.local.set({ [SETTINGS_KEY]: settings });
  }

  static async getRateSnapshot(): Promise<RateSnapshot | null> {
    const result = (await browser.storage.local.get(SNAPSHOT_KEY)) as Record<string, RateSnapshot | undefined>;
    return result[SNAPSHOT_KEY] ?? null;
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
