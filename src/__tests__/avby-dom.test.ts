import { avbySampleHtml } from './fixtures/avby-sample';
import { clearInjectedPrices, decoratePrices, parseBynAmount } from '../lib/avby-dom';
import { DEFAULT_BADGE_APPEARANCE, DEFAULT_BANNER_APPEARANCE } from '../constants';
import type { ActiveRate } from '../types';

const dp = (root: Document | HTMLElement, roundToWholeByn: boolean) =>
  decoratePrices(root, rate, roundToWholeByn, DEFAULT_BADGE_APPEARANCE, DEFAULT_BANNER_APPEARANCE);

const rate: ActiveRate = {
  value: 2.8192,
  sourceType: 'nbrb',
  sourceLabel: 'НБРБ',
  updatedAt: '2026-04-27T08:00:00.000Z',
  stale: false,
  fallbackToOfficial: false,
  bankAlias: null,
};

beforeEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

// ── parseBynAmount ──────────────────────────────────────────────────

describe('parseBynAmount', () => {
  it('parses prices with р.', () => {
    expect(parseBynAmount('28 158 р.')).toBe(28158);
  });

  it('parses prices with Latin p.', () => {
    expect(parseBynAmount('41 442 p.')).toBe(41442);
  });

  it('parses prices with Latin p. and nbsp', () => {
    expect(parseBynAmount('41\u00A0442 p.')).toBe(41442);
  });

  it('parses prices with BYN', () => {
    expect(parseBynAmount('7 500 BYN')).toBe(7500);
  });

  it('parses prices with leading text', () => {
    expect(parseBynAmount('от 123 340 р.')).toBe(123340);
  });

  it('rejects exchange rates with decimals', () => {
    expect(parseBynAmount('1 USD = 2.82 BYN')).toBeNull();
  });

  it('rejects non-price text', () => {
    expect(parseBynAmount('не цена')).toBeNull();
  });
});

// ── av.by (classic structure) ───────────────────────────────────────

describe('av.by classic', () => {
  it('decorates h1.card-price and div.listing-price', () => {
    document.body.innerHTML = avbySampleHtml;
    expect(dp(document, true)).toBe(2);
    expect(document.querySelectorAll('.avby-currency-helper-badge')).toHaveLength(2);
  });

  it('does not duplicate on re-run', () => {
    document.body.innerHTML = avbySampleHtml;
    dp(document, true);
    expect(dp(document, true)).toBe(0);
    expect(document.querySelectorAll('.avby-currency-helper-badge')).toHaveLength(2);
  });

  it('clears all injected elements', () => {
    document.body.innerHTML = avbySampleHtml;
    dp(document, true);
    clearInjectedPrices(document);
    expect(document.querySelectorAll('.avby-currency-helper-badge')).toHaveLength(0);
  });
});

// ── salon.av.by/  (main page: top listings) ─────────────────────────

describe('salon.av.by main page — salon-listing-top', () => {
  it('decorates salon-listing-top__prices with split markup', () => {
    document.body.innerHTML = `
      <a class="salon-listing-top__item" href="#">
        <div class="salon-listing-top__photo"></div>
        <div class="salon-listing-top__desc">
          <h3 class="salon-listing-top__title">Mercedes-Benz CLA</h3>
          <div class="salon-listing-top__prices">
            <span>от</span>
            <div>123\u00A0340</div>
            <span>р.</span>
          </div>
        </div>
        <div class="salon-listing-top__summary"></div>
      </a>
    `;
    expect(dp(document, true)).toBe(1);
    expect(document.querySelector('.salon-listing-top__prices > .avby-currency-helper-badge')).not.toBeNull();
  });
});

// ── salon.av.by/nissan_x-trail  (model listing: item cards) ─────────

describe('salon.av.by model listing — salon-listing-items', () => {
  it('decorates salon-listing-items__item-price-byn with Cyrillic р.', () => {
    document.body.innerHTML = `
      <div class="salon-listing-items">
        <li class="salon-listing-items__item">
          <div class="salon-listing-items__item-wrap">
            <h3 class="salon-listing-items__item-title">BYD Dolphin</h3>
            <div class="salon-listing-items__item-prices">
              <div class="salon-listing-items__item-price-byn">
                45\u00A0953
                <span> р.</span>
              </div>
            </div>
          </div>
        </li>
      </div>
    `;
    expect(dp(document, true)).toBe(1);
    expect(document.querySelector('.salon-listing-items__item-price-byn > .avby-currency-helper-badge')).not.toBeNull();
  });

  it('decorates salon-listing-items__item-price-byn with Latin p.', () => {
    document.body.innerHTML = `
      <div class="salon-listing-items">
        <li class="salon-listing-items__item">
          <div class="salon-listing-items__item-wrap">
            <h3 class="salon-listing-items__item-title">BYD e2</h3>
            <div class="salon-listing-items__item-prices">
              <div class="salon-listing-items__item-price-byn">
                41\u00A0442
                <span> p.</span>
              </div>
            </div>
          </div>
        </li>
      </div>
    `;
    expect(dp(document, true)).toBe(1);
    expect(document.querySelector('.salon-listing-items__item-price-byn > .avby-currency-helper-badge')).not.toBeNull();
  });
});

// ── salon.av.by/byd_e2  (tile listing) ──────────────────────────────

describe('salon.av.by tile listing — salon-listing-tile', () => {
  it('decorates salon-listing-tile__item-price with "от" prefix', () => {
    document.body.innerHTML = `
      <div class="salon-listing-tile">
        <div class="salon-listing-tile__item">
          <div class="salon-listing-tile__item-price">
            <span>от\u00A0</span>
            95\u00A0853
            <span>р.</span>
          </div>
        </div>
      </div>
    `;
    expect(dp(document, true)).toBe(1);
    expect(document.querySelector('.salon-listing-tile__item-price > .avby-currency-helper-badge')).not.toBeNull();
  });
});

// ── salon.av.by/byd_dolphin_11771  (detail page) ────────────────────

describe('salon.av.by detail page — listing-item__price-primary', () => {
  it('decorates listing-item__price-primary', () => {
    document.body.innerHTML = `
      <div class="listing-item__price">
        <div class="listing-item__price-primary">
          39\u00A0187
          <span>р.</span>
        </div>
      </div>
    `;
    expect(dp(document, true)).toBe(1);
    expect(document.querySelector('.listing-item__price-primary > .avby-currency-helper-badge')).not.toBeNull();
  });
});

// ── banner context (white color) ────────────────────────────────────

describe('banner context', () => {
  it('renders badge inside banner-classed ancestor', () => {
    document.body.innerHTML = `
      <div class="promo-banner">
        <div class="listing-price">28 158 р.</div>
      </div>
    `;
    expect(dp(document, true)).toBe(1);
    // Badge should exist inside the banner ancestor
    const badge = document.querySelector('.avby-currency-helper-badge');
    expect(badge).not.toBeNull();
    expect(badge!.closest('[class*="banner"]')).not.toBeNull();
  });

  it('restores a visible border when banner mode is switched from text to outline', () => {
    document.body.innerHTML = `
      <div class="promo-banner">
        <div class="listing-price">28 158 р.</div>
      </div>
    `;

    decoratePrices(document, rate, true, DEFAULT_BADGE_APPEARANCE, {
      ...DEFAULT_BANNER_APPEARANCE,
      mode: 'outline',
    });

    const style = document.getElementById('avby-currency-helper-style');
    expect(style?.textContent).toContain('border: 1.5px solid rgba(255, 255, 255, 0.7);');
    expect(style?.textContent).toContain('padding: 0 2px;');
  });
});

// ── currency converter rejection ────────────────────────────────────

describe('currency converter rejection', () => {
  it('does not decorate exchange rate text like "1 USD = 2.82 BYN"', () => {
    document.body.innerHTML = `
      <div class="converter-price">1 USD = 2.82 BYN</div>
      <div class="listing-price">28 158 BYN</div>
    `;
    expect(dp(document, true)).toBe(1);
    expect(document.body.textContent).not.toContain('≈ $1');
  });
});

// ── re-injection after framework removal ────────────────────────────

describe('re-injection after framework removal', () => {
  it('re-injects badge after Vue/Nuxt removes it', () => {
    document.body.innerHTML = `
      <div class="salon-listing-items__item-price-byn">
        45\u00A0953
        <span> р.</span>
      </div>
    `;

    dp(document, true);
    expect(document.querySelectorAll('.avby-currency-helper-badge')).toHaveLength(1);

    // Simulate framework removing our badge
    document.querySelector('.avby-currency-helper-badge')!.remove();
    expect(document.querySelectorAll('.avby-currency-helper-badge')).toHaveLength(0);

    // Must re-inject
    expect(dp(document, true)).toBe(1);
    expect(document.querySelectorAll('.avby-currency-helper-badge')).toHaveLength(1);
  });
});

// ── multiple prices on one page ─────────────────────────────────────

describe('full page with multiple price types', () => {
  it('decorates all price types on a mixed salon page', () => {
    document.body.innerHTML = `
      <main>
        <div class="salon-listing-top__prices">
          <span>от</span><div>81\u00A0757</div><span>р.</span>
        </div>
        <div class="salon-listing-items__item-price-byn">
          45\u00A0953<span> р.</span>
        </div>
        <div class="salon-listing-tile__item-price">
          <span>от\u00A0</span>95\u00A0853<span>р.</span>
        </div>
        <div class="listing-item__price-primary">
          39\u00A0187<span>р.</span>
        </div>
      </main>
    `;
    expect(dp(document, true)).toBe(4);
    expect(document.querySelectorAll('.avby-currency-helper-badge')).toHaveLength(4);
  });
});
