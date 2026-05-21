import { ALL_SITE_TAB_PATTERNS, DEFAULT_SETTINGS } from './constants';
import { Storage } from './storage';
import { fetchRateSnapshot, getActiveRate } from './lib/rates/service';
import { MessageActionType } from './types';
import type { ActiveRate, BankRate, MessageAction, MessageResponse, RateSnapshot, UserSettings } from './types';

type BrowserLike = typeof browser;

type StorageLike = typeof Storage;

type ControllerDeps = {
  browserApi?: BrowserLike;
  storage?: StorageLike;
  fetchImpl?: typeof fetch;
};

function hasEnabledSites(settings: UserSettings): boolean {
  return Object.values(settings.enabledSites).some(Boolean);
}

export function createBackgroundController(deps: ControllerDeps = {}) {
  const browserApi = deps.browserApi ?? browser;
  const storage = deps.storage ?? Storage;
  const fetchImpl = deps.fetchImpl ?? fetch;
  let settings: UserSettings = DEFAULT_SETTINGS;

  async function initialize(): Promise<void> {
    settings = await storage.getSettings();
    await updateBadge();
    await refreshRates(true);
  }

  async function updateBadge(): Promise<void> {
    const enabled = hasEnabledSites(settings);
    await browserApi.action.setBadgeText({ text: enabled ? 'BYN' : '' });
    if (enabled) {
      await browserApi.action.setBadgeBackgroundColor({ color: '#5d8f2e' });
    }
  }

  async function getSnapshot(force = false): Promise<RateSnapshot> {
    const cached = await storage.getRateSnapshot();

    if (!force && storage.isSnapshotFresh(cached)) {
      return cached as RateSnapshot;
    }

    try {
      const fresh = await fetchRateSnapshot(fetchImpl, settings.cacheTtlMs);
      await storage.saveRateSnapshot(fresh);
      return fresh;
    } catch (error) {
      if (cached) {
        return cached;
      }

      throw error;
    }
  }

  async function getBanks(force = false): Promise<BankRate[]> {
    const snapshot = await getSnapshot(force);
    return snapshot.banks;
  }

  async function getSelectedRate(force = false): Promise<ActiveRate | null> {
    const snapshot = await getSnapshot(force);
    return getActiveRate(settings, snapshot);
  }

  async function saveSettings(partial: Partial<UserSettings>): Promise<UserSettings> {
    settings = {
      ...settings,
      ...partial,
      enabledSites: {
        ...settings.enabledSites,
        ...(partial.enabledSites ?? {}),
      },
    };

    if (settings.selectedRateSourceType === 'nbrb') {
      settings.selectedBankAlias = null;
    }

    await storage.saveSettings(settings);
    await updateBadge();
    await notifyTabs();
    return settings;
  }

  async function notifyTabs(): Promise<void> {
    const tabs = await browserApi.tabs.query({ url: ALL_SITE_TAB_PATTERNS });

    await Promise.allSettled(
      tabs
        .filter((tab) => typeof tab.id === 'number')
        .map((tab) => browserApi.tabs.sendMessage(tab.id as number, { action: MessageActionType.ContentRefresh })),
    );
  }

  async function refreshRates(silent = false): Promise<ActiveRate | null> {
    try {
      await getSnapshot(true);
      await notifyTabs();
      return await getSelectedRate();
    } catch (error) {
      if (silent) {
        console.warn('[BYN to USD Marketplace Helper] Rate refresh failed', error);
        return null;
      }

      throw error;
    }
  }

  async function handleMessage(message: MessageAction): Promise<MessageResponse> {
    switch (message.action) {
      case MessageActionType.GetSettings:
        return { success: true, data: settings };
      case MessageActionType.GetBanks:
        return { success: true, data: await getBanks() };
      case MessageActionType.GetActiveRate:
        return { success: true, data: await getSelectedRate() };
      case MessageActionType.RefreshRates:
        return { success: true, data: await refreshRates() };
      case MessageActionType.UpdateSettings:
        return { success: true, data: await saveSettings(message.settings) };
      case MessageActionType.ContentRefresh:
        return { success: true, data: null };
      default:
        return { success: false, error: 'Unsupported action' };
    }
  }

  return {
    initialize,
    handleMessage,
    getSnapshot,
    getSelectedRate,
    getBanks,
    refreshRates,
  };
}
