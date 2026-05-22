import { DEFAULT_SETTINGS } from '../constants';
import { bvfbSampleHtml } from './fixtures/bvfb-sample';
import { myfinSampleHtml } from './fixtures/myfin-sample';
import { parseBvfbRate } from '../lib/rates/bvfb';
import { parseMyfinBanks } from '../lib/rates/myfin';
import { fetchRateSnapshot, getActiveRate } from '../lib/rates/service';

describe('rate services', () => {
  it('parses bank sell rates from Myfin html', () => {
    const banks = parseMyfinBanks(myfinSampleHtml);

    expect(banks).toHaveLength(2);
    expect(banks[0]).toMatchObject({ alias: 'belarusbank', sellRate: 3.26 });
    expect(banks[1]).toMatchObject({ alias: 'priorbank', sellRate: 3.245 });
  });

  it('parses BVFB weighted USD rate from trading html', () => {
    expect(parseBvfbRate(bvfbSampleHtml, '2026-05-22T10:15:00.000Z')).toEqual({
      rate: 2.7506,
      updatedAt: '2026-05-22T13:00:00+03:00',
    });
  });

  it('falls back to official rate when selected bank is missing', async () => {
    const fetchMock = jest.fn(async (url: string) => {
      if (url.includes('api.nbrb.by')) {
        return {
          ok: true,
          json: async () => ({ Cur_OfficialRate: 3.1234, Date: '2026-04-25T08:00:00.000Z' }),
        } as Response;
      }

      if (url.includes('torgi-na-bvfb')) {
        return {
          ok: true,
          text: async () => bvfbSampleHtml,
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

  it('returns BVFB rate when exchange source is selected', async () => {
    const fetchMock = jest.fn(async (url: string) => {
      if (url.includes('api.nbrb.by')) {
        return {
          ok: true,
          json: async () => ({ Cur_OfficialRate: 2.7315, Date: '2026-05-22T00:00:00.000Z' }),
        } as Response;
      }

      if (url.includes('torgi-na-bvfb')) {
        return {
          ok: true,
          text: async () => bvfbSampleHtml,
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
        selectedRateSourceType: 'exchange',
      },
      snapshot,
    );

    expect(activeRate).toMatchObject({ value: 2.7506, sourceType: 'exchange', sourceLabel: 'БВФБ' });
  });
});
