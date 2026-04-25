import { DEFAULT_SETTINGS } from '../constants';
import { Storage } from '../storage';
import type { RateSnapshot } from '../types';

describe('Storage', () => {
  it('returns default settings when nothing is stored', async () => {
    await expect(Storage.getSettings()).resolves.toEqual(DEFAULT_SETTINGS);
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
