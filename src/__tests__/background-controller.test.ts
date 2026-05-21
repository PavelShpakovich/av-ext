import { createBackgroundController } from '../background-controller';
import { DEFAULT_SETTINGS } from '../constants';
import { myfinSampleHtml } from './fixtures/myfin-sample';
import { MessageActionType } from '../types';
import type { UserSettings } from '../types';

describe('background controller', () => {
  it('refreshes rates on initialize and notifies supported-site tabs', async () => {
    const storage = {
      getSettings: jest.fn(async () => DEFAULT_SETTINGS),
      saveSettings: jest.fn(async () => undefined),
      getRateSnapshot: jest.fn(async () => null),
      saveRateSnapshot: jest.fn(async () => undefined),
      isSnapshotFresh: jest.fn(() => false),
    };

    const browserApi = {
      action: {
        setBadgeText: jest.fn(async () => undefined),
        setBadgeBackgroundColor: jest.fn(async () => undefined),
      },
      tabs: {
        query: jest.fn(async () => [{ id: 12 }]),
        sendMessage: jest.fn(async () => undefined),
      },
    } as unknown as typeof browser;

    const fetchMock = jest.fn(async (url: string) => {
      if (url.includes('api.nbrb.by')) {
        return {
          ok: true,
          json: async () => ({ Cur_OfficialRate: 3.1111, Date: '2026-04-25T08:00:00.000Z' }),
        } as Response;
      }

      return {
        ok: true,
        text: async () => myfinSampleHtml,
      } as Response;
    });

    const controller = createBackgroundController({
      browserApi,
      storage: storage as never,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await controller.initialize();

    expect(storage.saveRateSnapshot).toHaveBeenCalled();
    expect(browserApi.tabs.query).toHaveBeenCalledWith({
      url: [
        'https://cars.av.by/*',
        'https://av.by/*',
        'https://*.av.by/*',
        'https://kufar.by/*',
        'https://*.kufar.by/*',
      ],
    });
    expect(browserApi.tabs.sendMessage).toHaveBeenCalledWith(12, { action: MessageActionType.ContentRefresh });
  });

  it('returns selected bank sell rate and notifies supported-site tabs on settings change', async () => {
    const storedSettings: UserSettings = {
      ...DEFAULT_SETTINGS,
      selectedRateSourceType: 'bank',
      selectedBankAlias: 'priorbank',
    };

    const storage = {
      getSettings: jest.fn(async () => storedSettings),
      saveSettings: jest.fn(async () => undefined),
      getRateSnapshot: jest.fn(async () => null),
      saveRateSnapshot: jest.fn(async () => undefined),
      isSnapshotFresh: jest.fn(() => false),
    };

    const browserApi = {
      action: {
        setBadgeText: jest.fn(async () => undefined),
        setBadgeBackgroundColor: jest.fn(async () => undefined),
      },
      tabs: {
        query: jest.fn(async () => [{ id: 12 }]),
        sendMessage: jest.fn(async () => undefined),
      },
    } as unknown as typeof browser;

    const fetchMock = jest.fn(async (url: string) => {
      if (url.includes('api.nbrb.by')) {
        return {
          ok: true,
          json: async () => ({ Cur_OfficialRate: 3.1111, Date: '2026-04-25T08:00:00.000Z' }),
        } as Response;
      }

      return {
        ok: true,
        text: async () => myfinSampleHtml,
      } as Response;
    });

    const controller = createBackgroundController({
      browserApi,
      storage: storage as never,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await controller.initialize();

    const selectedRateResponse = await controller.handleMessage({ action: MessageActionType.GetActiveRate });
    expect(selectedRateResponse).toMatchObject({
      success: true,
      data: expect.objectContaining({ value: 3.245, sourceLabel: 'Priorbank' }),
    });

    await controller.handleMessage({
      action: MessageActionType.UpdateSettings,
      settings: { selectedRateSourceType: 'nbrb' },
    });

    expect(storage.saveSettings).toHaveBeenCalled();
    expect(browserApi.tabs.sendMessage).toHaveBeenCalledWith(12, { action: MessageActionType.ContentRefresh });
  });

  it('keeps the active rate available even when all sites are disabled', async () => {
    const storage = {
      getSettings: jest.fn(async () => ({
        ...DEFAULT_SETTINGS,
        enabledSites: {
          avby: false,
          kufar: false,
        },
      })),
      saveSettings: jest.fn(async () => undefined),
      getRateSnapshot: jest.fn(async () => null),
      saveRateSnapshot: jest.fn(async () => undefined),
      isSnapshotFresh: jest.fn(() => false),
    };

    const browserApi = {
      action: {
        setBadgeText: jest.fn(async () => undefined),
        setBadgeBackgroundColor: jest.fn(async () => undefined),
      },
      tabs: {
        query: jest.fn(async () => []),
        sendMessage: jest.fn(async () => undefined),
      },
    } as unknown as typeof browser;

    const fetchMock = jest.fn(async (url: string) => {
      if (url.includes('api.nbrb.by')) {
        return {
          ok: true,
          json: async () => ({ Cur_OfficialRate: 3.1111, Date: '2026-04-25T08:00:00.000Z' }),
        } as Response;
      }

      return {
        ok: true,
        text: async () => myfinSampleHtml,
      } as Response;
    });

    const controller = createBackgroundController({
      browserApi,
      storage: storage as never,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await controller.initialize();

    const selectedRateResponse = await controller.handleMessage({ action: MessageActionType.GetActiveRate });
    expect(selectedRateResponse).toMatchObject({
      success: true,
      data: expect.objectContaining({ value: 3.1111, sourceLabel: 'НБРБ' }),
    });
    expect(browserApi.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
  });
});
