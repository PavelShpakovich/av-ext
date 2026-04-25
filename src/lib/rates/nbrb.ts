const NBRB_USD_URL = 'https://api.nbrb.by/exrates/rates/USD?parammode=2';

type NbrbUsdResponse = {
  Cur_OfficialRate: number;
  Date: string;
};

export async function fetchNbrbRate(fetchImpl: typeof fetch = fetch): Promise<{ rate: number; updatedAt: string }> {
  const response = await fetchImpl(NBRB_USD_URL, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`NBRB responded with status ${response.status}`);
  }

  const payload = (await response.json()) as NbrbUsdResponse;

  return {
    rate: payload.Cur_OfficialRate,
    updatedAt: payload.Date,
  };
}
