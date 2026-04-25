import { avbySampleHtml } from './fixtures/avby-sample';
import { decoratePrices, parseBynAmount } from '../lib/avby-dom';
import type { ActiveRate } from '../types';

describe('avby dom decoration', () => {
  const activeRate: ActiveRate = {
    value: 3.25,
    sourceType: 'nbrb',
    sourceLabel: 'НБРБ',
    updatedAt: '2026-04-25T08:00:00.000Z',
    stale: false,
    fallbackToOfficial: false,
    bankAlias: null,
  };

  it('extracts BYN values', () => {
    expect(parseBynAmount('28 158 р.')).toBe(28158);
    expect(parseBynAmount('7 500 BYN')).toBe(7500);
    expect(parseBynAmount('не цена')).toBeNull();
  });

  it('injects one USD badge per price and avoids duplicates', () => {
    document.body.innerHTML = avbySampleHtml;

    expect(decoratePrices(document, activeRate, true)).toBe(2);
    expect(decoratePrices(document, activeRate, true)).toBe(0);
    expect(document.querySelectorAll('.avby-currency-helper-badge')).toHaveLength(2);
    expect(document.body.textContent).toContain('≈ $8,664');
  });

  it('falls back to text-based detection when price markup has no price-like classes', () => {
    document.body.innerHTML = `
      <main>
        <section>
          <span class="vehicle-cost"><span>28 158</span><span> р.</span></span>
          <span class="vehicle-cost-secondary">7 500 BYN</span>
        </section>
      </main>
    `;

    expect(decoratePrices(document, activeRate, true)).toBe(2);
    expect(document.querySelectorAll('.avby-currency-helper-badge')).toHaveLength(2);
    expect(document.body.textContent).toContain('≈ $8,664');
  });
});
