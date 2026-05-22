const MYFIN_BVFB_URL = 'https://myfin.by/currency/torgi-na-bvfb';

function normalizeWhitespace(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseBelarusTimestamp(baseIso: string, time: string): string {
  const [hours, minutes] = time.split(':').map((value) => Number.parseInt(value, 10));
  const baseDate = new Date(baseIso);
  const year = baseDate.getUTCFullYear();
  const month = String(baseDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(baseDate.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00+03:00`;
}

export function parseBvfbRate(html: string, fetchedAt: string): { rate: number; updatedAt: string } | null {
  const text = normalizeWhitespace(html);
  const usdBlockMatch = text.match(/Итоги торгов .*? USD .*?(\d{1,2}:\d{2})\s+[+-]\d[\d.,]*\s+(\d[\d.,]*)/u);

  if (!usdBlockMatch) {
    return null;
  }

  const [, time, rawRate] = usdBlockMatch;
  const rate = Number.parseFloat(rawRate.replace(',', '.'));

  if (!Number.isFinite(rate)) {
    return null;
  }

  return {
    rate,
    updatedAt: parseBelarusTimestamp(fetchedAt, time),
  };
}

export async function fetchBvfbRate(
  fetchImpl: typeof fetch = fetch,
  fetchedAt = new Date().toISOString(),
): Promise<{ rate: number; updatedAt: string }> {
  const response = await fetchImpl(MYFIN_BVFB_URL, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`BVFB source responded with status ${response.status}`);
  }

  const parsed = parseBvfbRate(await response.text(), fetchedAt);

  if (!parsed) {
    throw new Error('Could not extract BVFB trading rate');
  }

  return parsed;
}
