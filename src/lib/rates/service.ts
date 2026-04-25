import type { ActiveRate, RateSnapshot, UserSettings } from '../../types';
import { fetchNbrbRate } from './nbrb';
import { fetchMyfinBanks } from './myfin';

export async function fetchRateSnapshot(
  fetchImpl: typeof fetch = fetch,
  ttlMs = 15 * 60_000,
): Promise<RateSnapshot> {
  const fetchedAt = new Date().toISOString();
  const issues: string[] = [];
  let officialRate: number | null = null;
  let officialUpdatedAt: string | null = null;
  let banks = [] as RateSnapshot['banks'];

  try {
    const official = await fetchNbrbRate(fetchImpl);
    officialRate = official.rate;
    officialUpdatedAt = official.updatedAt;
  } catch (error) {
    issues.push(error instanceof Error ? error.message : 'Failed to fetch NBRB rate');
  }

  try {
    banks = await fetchMyfinBanks(fetchImpl);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : 'Failed to fetch Myfin bank rates');
  }

  if (officialRate === null) {
    throw new Error(issues[0] ?? 'Failed to fetch any currency rate');
  }

  return {
    officialRate,
    officialUpdatedAt,
    banks,
    fetchedAt,
    expiresAt: Date.now() + ttlMs,
    partialFailure: issues.length > 0,
    issues,
  };
}

export function getActiveRate(settings: UserSettings, snapshot: RateSnapshot, now = Date.now()): ActiveRate | null {
  if (!settings.enabled) {
    return null;
  }

  if (settings.selectedRateSourceType === 'bank' && settings.selectedBankAlias) {
    const bank = snapshot.banks.find((entry) => entry.alias === settings.selectedBankAlias);
    if (bank) {
      return {
        value: bank.sellRate,
        sourceType: 'bank',
        sourceLabel: bank.name,
        updatedAt: snapshot.fetchedAt,
        stale: snapshot.expiresAt <= now,
        fallbackToOfficial: false,
        bankAlias: bank.alias,
      };
    }
  }

  if (snapshot.officialRate === null) {
    return null;
  }

  return {
    value: snapshot.officialRate,
    sourceType: 'nbrb',
    sourceLabel: settings.selectedRateSourceType === 'bank' ? 'НБРБ (fallback)' : 'НБРБ',
    updatedAt: snapshot.officialUpdatedAt ?? snapshot.fetchedAt,
    stale: snapshot.expiresAt <= now,
    fallbackToOfficial: settings.selectedRateSourceType === 'bank',
    bankAlias: null,
  };
}
