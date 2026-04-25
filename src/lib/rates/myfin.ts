import { MYFIN_CITY_SLUG } from '../../constants';
import type { BankRate } from '../../types';

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/&nbsp;/g, ' ').trim();
}

function stripHtml(value: string): string {
  return normalizeWhitespace(value.replace(/<[^>]+>/g, ' '));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');
}

function parseRateCells(rowHtml: string): { buyRate: number; sellRate: number } | null {
  const rateMatches = Array.from(
    rowHtml.matchAll(/<td class="currencies-courses__currency-cell [^"]*">\s*<span[^>]*>([\d.]+)<\/span>/g),
  );

  if (rateMatches.length < 2) {
    return null;
  }

  const buyRate = Number.parseFloat(rateMatches[0][1]);
  const sellRate = Number.parseFloat(rateMatches[1][1]);

  if (!Number.isFinite(buyRate) || !Number.isFinite(sellRate)) {
    return null;
  }

  return { buyRate, sellRate };
}

export function parseMyfinBanks(html: string): BankRate[] {
  const rowPattern = /<tr class="([^"]*currencies-courses__row-main[^"]*)"([^>]*)>([\s\S]*?)<\/tr>/g;
  const banks: BankRate[] = [];

  for (const match of html.matchAll(rowPattern)) {
    const [, className, rowAttributes, rowHtml] = match;

    if (className.includes('currencies-courses__row-main--ad')) {
      continue;
    }

    if (!rowAttributes.includes('data-row-type="default"')) {
      continue;
    }

    const aliasMatch = rowAttributes.match(/data-bank-sef-alias="([^"]+)"/);
    if (!aliasMatch) {
      continue;
    }

    const nameMatch = rowHtml.match(
      /<span class="bank-logo bank-logo--s mr-5">[\s\S]*?<\/span>([\s\S]*?)<\/span><\/td>/,
    );
    const altMatch = rowHtml.match(/<img class="load_image"[^>]*alt="([^"]+)"/);
    const rates = parseRateCells(rowHtml);

    if (!rates) {
      continue;
    }

    const name = stripHtml(nameMatch?.[1] ?? altMatch?.[1] ?? aliasMatch[1]);

    banks.push({
      alias: aliasMatch[1] || slugify(name),
      name,
      buyRate: rates.buyRate,
      sellRate: rates.sellRate,
    });
  }

  const uniqueByAlias = new Map<string, BankRate>();
  banks.forEach((bank) => uniqueByAlias.set(bank.alias, bank));

  return Array.from(uniqueByAlias.values()).sort((left, right) => left.name.localeCompare(right.name, 'ru'));
}

export async function fetchMyfinBanks(fetchImpl: typeof fetch = fetch): Promise<BankRate[]> {
  const response = await fetchImpl(`https://myfin.by/currency/usd/${MYFIN_CITY_SLUG}`, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Myfin responded with status ${response.status}`);
  }

  const html = await response.text();
  const banks = parseMyfinBanks(html);

  if (!banks.length) {
    throw new Error('Could not extract bank rates from Myfin');
  }

  return banks;
}
