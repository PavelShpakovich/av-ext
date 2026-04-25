import { DEFAULT_SETTINGS } from '../constants';
import { myfinSampleHtml } from './fixtures/myfin-sample';
import { parseMyfinBanks } from '../lib/rates/myfin';
import { fetchRateSnapshot, getActiveRate } from '../lib/rates/service';

describe('rate services', () => {
  it('parses bank sell rates from Myfin html', () => {
    const banks = parseMyfinBanks(myfinSampleHtml);

    expect(banks).toHaveLength(2);
    expect(banks[0]).toMatchObject({ alias: 'belarusbank', sellRate: 3.26 });
    expect(banks[1]).toMatchObject({ alias: 'priorbank', sellRate: 3.245 });
  });

  it('falls back to official rate when selected bank is missing', async () => {
    const fetchMock = jest.fn(async (url: string) => {
      if (url.includes('api.nbrb.by')) {
        return {
          ok: true,
          json: async () => ({ Cur_OfficialRate: 3.1234, Date: '2026-04-25T08:00:00.000Z' }),
        } as Response;
      }

      return {
        ok: true,
        text: async () => myfinSampleHtml,
      } as Response;
    });

    const snapshot = await fetchRateSnapshot(fetchMock as unknown as typeof fetch, 5_000);
    const activeRate = getActiveRate(
      {
        ...DEFAULT_SETTINGS,
        selectedRateSourceType: 'bank',
        selectedBankAlias: 'missing-bank',
      },
      snapshot,
    );

    expect(activeRate).toMatchObject({ value: 3.1234, fallbackToOfficial: true, sourceType: 'nbrb' });
  });
});
