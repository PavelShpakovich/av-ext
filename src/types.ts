export type RateSourceType = 'nbrb' | 'bank';

export interface BankRate {
  alias: string;
  name: string;
  buyRate: number;
  sellRate: number;
}

export interface RateSnapshot {
  officialRate: number | null;
  officialUpdatedAt: string | null;
  banks: BankRate[];
  fetchedAt: string;
  expiresAt: number;
  partialFailure: boolean;
  issues: string[];
}

export interface UserSettings {
  enabled: boolean;
  selectedRateSourceType: RateSourceType;
  selectedBankAlias: string | null;
  cacheTtlMs: number;
  roundToWholeByn: boolean;
}

export interface ActiveRate {
  value: number;
  sourceType: RateSourceType;
  sourceLabel: string;
  updatedAt: string | null;
  stale: boolean;
  fallbackToOfficial: boolean;
  bankAlias: string | null;
}

export enum MessageActionType {
  GetSettings = 'getSettings',
  UpdateSettings = 'updateSettings',
  GetBanks = 'getBanks',
  GetActiveRate = 'getActiveRate',
  RefreshRates = 'refreshRates',
  ContentRefresh = 'contentRefresh',
}

export type MessageAction =
  | { action: MessageActionType.GetSettings }
  | { action: MessageActionType.GetBanks }
  | { action: MessageActionType.GetActiveRate }
  | { action: MessageActionType.RefreshRates }
  | { action: MessageActionType.ContentRefresh }
  | { action: MessageActionType.UpdateSettings; settings: Partial<UserSettings> };

export type MessageResponse<T = unknown> = { success: true; data: T } | { success: false; error: string };
