import { DEFAULT_SETTINGS } from '../constants';
import { Storage } from '../storage';
import type { RateSnapshot } from '../types';

describe('Storage', () => {
  it('returns default settings when nothing is stored', async () => {
    await expect(Storage.getSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('migrates a legacy enabled flag into per-site settings', async () => {
    await browser.storage.local.set({
      avbyCurrencySettings: {
        enabled: false,
      },
    });

    await expect(Storage.getSettings()).resolves.toMatchObject({
      enabledSites: {
        avby: false,
        kufar: false,
      },
    });
  });

  it('migrates legacy shared appearance settings into av.by site colors', async () => {
    await browser.storage.local.set({
      avbyCurrencySettings: {
        badgeAppearance: {
          mode: 'outline',
          light: { textColor: '#123456', backgroundColor: '#abcdef' },
          dark: { textColor: '#654321', backgroundColor: '#fedcba' },
        },
        bannerAppearance: {
          mode: 'text',
          light: { textColor: '#111111', backgroundColor: '#222222' },
          dark: { textColor: '#eeeeee', backgroundColor: '#dddddd' },
        },
      },
    });

    await expect(Storage.getSettings()).resolves.toMatchObject({
      siteAppearances: {
        avby: {
          badgeAppearance: {
            mode: 'outline',
            light: { textColor: '#123456', backgroundColor: '#abcdef' },
            dark: { textColor: '#654321', backgroundColor: '#fedcba' },
          },
          bannerAppearance: {
            mode: 'text',
            light: { textColor: '#111111', backgroundColor: '#222222' },
            dark: { textColor: '#eeeeee', backgroundColor: '#dddddd' },
          },
        },
      },
    });
  });

  it('reads a legacy rate snapshot key for backward compatibility', async () => {
    const snapshot: RateSnapshot = {
      officialRate: 3.1,
      officialUpdatedAt: '2026-04-25T08:00:00.000Z',
      banks: [],
      fetchedAt: '2026-04-25T08:05:00.000Z',
      expiresAt: Date.now() + 1_000,
      partialFailure: false,
      issues: [],
    };

    await browser.storage.local.set({
      avbyRateSnapshot: snapshot,
    });

    await expect(Storage.getRateSnapshot()).resolves.toEqual(snapshot);
  });

  it('stores and reads a rate snapshot', async () => {
    const snapshot: RateSnapshot = {
      officialRate: 3.2,
      officialUpdatedAt: '2026-04-25T08:00:00.000Z',
      banks: [],
      fetchedAt: '2026-04-25T08:05:00.000Z',
      expiresAt: Date.now() + 1_000,
      partialFailure: false,
      issues: [],
    };

    await Storage.saveRateSnapshot(snapshot);

    await expect(Storage.getRateSnapshot()).resolves.toEqual(snapshot);
    expect(Storage.isSnapshotFresh(snapshot, Date.now())).toBe(true);
    expect(Storage.isSnapshotFresh(snapshot, snapshot.expiresAt + 1)).toBe(false);
  });
});
