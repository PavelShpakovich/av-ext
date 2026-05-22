import { INJECTED_BADGE_CLASS, INJECTED_STYLE_ID } from '../constants';
import { formatUsdAmount } from './format';
import type { ActiveRate, BadgeAppearance } from '../types';

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildBadgeModeStyles(cls: string, app: BadgeAppearance, theme: 'light' | 'dark'): string {
  const colors = app[theme];
  const { textColor, backgroundColor } = colors;
  const { mode } = app;

  if (mode === 'text') {
    return `
    .${cls} {
      background: none;
      border: none;
      padding: 0;
      color: ${textColor};
    }`;
  }
  if (mode === 'outline') {
    return `
    .${cls} {
      background: transparent;
      border: 1.5px solid ${hexToRgba(backgroundColor, 0.7)};
      padding: 0 2px;
      color: ${textColor};
    }`;
  }
  const bgAlpha = theme === 'dark' ? 0.55 : 0.14;
  const borderAlpha = theme === 'dark' ? 0.55 : 0.45;
  return `
    .${cls} {
      background: ${hexToRgba(backgroundColor, bgAlpha)};
      border: 1.5px solid ${hexToRgba(backgroundColor, borderAlpha)};
      padding: 0 2px;
      color: ${textColor};
    }`;
}

function buildBannerModeStyles(cls: string, app: BadgeAppearance, theme: 'light' | 'dark'): string {
  const colors = app[theme];
  const { textColor, backgroundColor } = colors;
  const { mode } = app;
  const selectors = [
    `[class*="banner"] .${cls}`,
    `[class*="Banner"] .${cls}`,
    `[class*="salon-listing-top"] .${cls}`,
    `.fullscreen-gallery__price .${cls}`,
  ].join(',\n    ');

  if (mode === 'text') {
    return `
    ${selectors} {
      background: none;
      border: none;
      padding: 0;
      color: ${textColor};
    }`;
  }
  if (mode === 'outline') {
    return `
    ${selectors} {
      background: transparent;
      border: 1.5px solid ${hexToRgba(backgroundColor, 0.7)};
      padding: 0 2px;
      color: ${textColor};
      margin-right: 8px;
    }`;
  }
  return `
    ${selectors} {
      color: ${textColor};
      background: ${hexToRgba(backgroundColor, 0.22)};
      border: 1.5px solid ${hexToRgba(backgroundColor, 0.5)};
      padding: 0 2px;
      margin-right: 8px;
    }`;
}

const BYN_PRICE_RE = /(?:^|[^\d.,])((?:\d{1,3}(?: \d{3})+|\d+))\s*(?:[рp]\.?|руб\.?|byn|br)(?=$|[\s),.;:!?])/i;
const FOREIGN_CURRENCY_RE = /(?:\$|usd\b|дол(?:лар|\.)?|€|eur\b)/i;

function normalizeSpaces(value: string): string {
  return value
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getScopeText(scope: HTMLElement): string {
  if (!scope.querySelector(`.${INJECTED_BADGE_CLASS}`)) {
    return normalizeSpaces(scope.textContent ?? '');
  }

  const clone = scope.cloneNode(true);
  if (clone instanceof HTMLElement) {
    clone.querySelectorAll(`.${INJECTED_BADGE_CLASS}`).forEach((node) => node.remove());
    return normalizeSpaces(clone.textContent ?? '');
  }

  return normalizeSpaces(scope.textContent ?? '');
}

export function parseBynAmount(text: string): number | null {
  const normalized = normalizeSpaces(text);
  const match = normalized.match(BYN_PRICE_RE);
  const digits = match?.[1];

  if (!digits) {
    return null;
  }

  const parsed = Number.parseInt(digits.replace(/\s+/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function findPriceHosts(root: ParentNode = document): HTMLElement[] {
  const doc = root instanceof Document ? root : root.ownerDocument;
  if (!doc) return [];

  const hosts = new Set<HTMLElement>();
  const walker = doc.createTreeWalker(root as Node, NodeFilter.SHOW_TEXT);

  let node = walker.nextNode();
  while (node) {
    const text = node.textContent ?? '';
    if (/\d/.test(text)) {
      let el = node.parentElement;
      while (el && el !== root && el !== doc.documentElement) {
        if (el.classList.contains(INJECTED_BADGE_CLASS)) break;

        const elText = normalizeSpaces(el.textContent ?? '');
        if (elText.length > 300) break;

        if (parseBynAmount(elText) !== null) {
          const hasChildHost = Array.from(el.children).some((child) => {
            if (!(child instanceof HTMLElement)) return false;
            if (child.classList.contains(INJECTED_BADGE_CLASS)) return false;
            return parseBynAmount(normalizeSpaces(child.textContent ?? '')) !== null;
          });

          if (hasChildHost) {
            break;
          }

          hosts.add(el);
          break;
        }
        el = el.parentElement;
      }
    }
    node = walker.nextNode();
  }

  return Array.from(hosts);
}

function hasExistingForeignCurrencyNearHost(element: HTMLElement, bynAmount: number): boolean {
  const parent = element.parentElement;
  const shouldInspectSiblings = Boolean(parent && !['BODY', 'HTML'].includes(parent.tagName));
  const siblingScopes = shouldInspectSiblings
    ? Array.from(parent?.children ?? []).filter(
        (scope): scope is HTMLElement =>
          scope instanceof HTMLElement && scope !== element && !scope.classList.contains(INJECTED_BADGE_CLASS),
      )
    : [];
  const scopes = [element, ...siblingScopes];

  return scopes.some((scope) => {
    const text = getScopeText(scope);
    if (!text || text.length > 80) {
      return false;
    }

    if (scope === element) {
      return parseBynAmount(text) === bynAmount && FOREIGN_CURRENCY_RE.test(text);
    }

    return FOREIGN_CURRENCY_RE.test(text);
  });
}

function ensureInjectedStyle(doc: Document, badgeApp: BadgeAppearance, bannerApp: BadgeAppearance): void {
  const styleKey = JSON.stringify({ b: badgeApp, n: bannerApp });
  const existing = doc.getElementById(INJECTED_STYLE_ID);
  if (existing?.dataset.key === styleKey) return;

  const style = existing ?? doc.createElement('style');
  style.id = INJECTED_STYLE_ID;
  style.dataset.key = styleKey;

  const cls = INJECTED_BADGE_CLASS;
  style.textContent = `
    .${cls} {
      display: block;
      width: fit-content;
      margin-top: 4px;
      padding: 0 2px;
      border-radius: 4px;
      border: 1.5px solid transparent;
      font-size: 0.75em;
      font-weight: 600;
      line-height: 1.4;
      white-space: nowrap;
      order: 999;
    }
    ${buildBadgeModeStyles(cls, badgeApp, 'light')}
    .${cls}[data-stale="true"] {
      background: rgba(193, 118, 25, 0.14);
      color: #6b3d09;
      border-color: rgba(193, 118, 25, 0.45);
    }
    ${buildBannerModeStyles(cls, bannerApp, 'light')}
    @media (prefers-color-scheme: dark) {
      ${buildBadgeModeStyles(cls, badgeApp, 'dark')}
      ${buildBannerModeStyles(cls, bannerApp, 'dark')}
      .${cls}[data-stale="true"] {
        background: rgba(120, 70, 10, 0.55);
        color: #ffe4bf;
        border-color: rgba(220, 150, 60, 0.55);
      }
    }
  `;

  if (!existing) {
    doc.head.append(style);
  }
}

function ensureGraphItemsPadding(root: Document | HTMLElement): void {
  const scope = root instanceof Document ? root : root.ownerDocument;
  if (!scope) return;

  const graphItems = scope.querySelectorAll('.graph__items');
  graphItems.forEach((element) => {
    if (element instanceof HTMLElement) {
      element.style.paddingBlock = '40px';
    }
  });
}

export function clearInjectedPrices(root: ParentNode = document): void {
  root.querySelectorAll(`.${INJECTED_BADGE_CLASS}`).forEach((n) => n.remove());
  const doc = root instanceof Document ? root : root instanceof Element ? root.ownerDocument : null;
  if (doc) {
    doc.getElementById(INJECTED_STYLE_ID)?.remove();
  }
}

export function decoratePrices(
  root: Document | HTMLElement,
  activeRate: ActiveRate,
  roundToWholeByn: boolean,
  badgeApp: BadgeAppearance,
  bannerApp: BadgeAppearance,
): number {
  const doc = root instanceof Document ? root : root.ownerDocument;
  if (!doc) return 0;

  ensureInjectedStyle(doc, badgeApp, bannerApp);
  ensureGraphItemsPadding(root);
  let injected = 0;

  findPriceHosts(root).forEach((element) => {
    const bynAmount = parseBynAmount(element.textContent ?? '');
    if (bynAmount === null) return;
    if (hasExistingForeignCurrencyNearHost(element, bynAmount)) return;

    const computedKey = `${bynAmount}-${activeRate.value}-${roundToWholeByn ? 'round' : 'precise'}`;

    const childBadge = Array.from(element.children).find(
      (c): c is HTMLElement => c instanceof HTMLElement && c.classList.contains(INJECTED_BADGE_CLASS),
    );
    const siblingBadge =
      element.nextElementSibling instanceof HTMLElement &&
      element.nextElementSibling.classList.contains(INJECTED_BADGE_CLASS)
        ? element.nextElementSibling
        : null;
    const existingBadge = childBadge ?? siblingBadge ?? null;

    if (existingBadge?.dataset.key === computedKey) return;

    const badge = existingBadge ?? doc.createElement('span');
    badge.className = INJECTED_BADGE_CLASS;
    badge.dataset.key = computedKey;
    badge.dataset.stale = String(activeRate.stale);
    badge.textContent = `≈ $${formatUsdAmount(bynAmount / activeRate.value, roundToWholeByn)}`;
    badge.title = `Источник: ${activeRate.sourceLabel}${activeRate.stale ? ' • кэш' : ''}`;

    if (!existingBadge) {
      element.append(badge);
      injected += 1;
    }
  });

  return injected;
}
