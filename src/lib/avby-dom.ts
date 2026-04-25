import { INJECTED_BADGE_CLASS, INJECTED_STYLE_ID } from '../constants';
import { formatUsdAmount } from './format';
import type { ActiveRate } from '../types';

const PRICE_HINT_SELECTORS = [
  '[class*="price"]',
  '[class*="Price"]',
  '[class*="amount"]',
  '[class*="Amount"]',
  '[class*="cost"]',
  '[data-cy*="price"]',
  '[data-testid*="price"]',
  'h1',
  'h2',
  'strong',
];

const MAX_PRICE_TEXT_LENGTH = 40;

function normalizeSpaces(value: string): string {
  return value
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseBynAmount(text: string): number | null {
  const normalized = normalizeSpaces(text);
  const match = normalized.match(/(?:([\d ]{2,})\s*(?:р\.?|руб\.?|byn|br))/i);
  const digits = match?.[1];

  if (!digits) {
    return null;
  }

  const parsed = Number.parseInt(digits.replace(/\s+/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function isProbablyLeafPriceHost(element: HTMLElement): boolean {
  return !Array.from(element.children).some(
    (child) => child instanceof HTMLElement && parseBynAmount(child.textContent ?? '') !== null,
  );
}

function isEligiblePriceHost(element: HTMLElement): boolean {
  if (element.closest(`.${INJECTED_BADGE_CLASS}`)) {
    return false;
  }

  const text = normalizeSpaces(element.textContent ?? '');
  if (text.length > MAX_PRICE_TEXT_LENGTH) {
    return false;
  }

  return parseBynAmount(text) !== null && isProbablyLeafPriceHost(element);
}

function collectFallbackPriceHosts(root: ParentNode): HTMLElement[] {
  const doc = root instanceof Document ? root : root.ownerDocument;
  if (!doc) {
    return [];
  }

  const unique = new Set<HTMLElement>();
  const walker = doc.createTreeWalker(root as Node, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = normalizeSpaces(node.textContent ?? '');

      if (!text || text.length > 24 || !/\d/.test(text)) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let currentNode = walker.nextNode();
  while (currentNode) {
    let element = currentNode.parentElement;

    while (element && element !== root) {
      if (isEligiblePriceHost(element)) {
        unique.add(element);
        break;
      }

      element = element.parentElement;
    }

    currentNode = walker.nextNode();
  }

  return Array.from(unique);
}

export function findPriceHosts(root: ParentNode = document): HTMLElement[] {
  const unique = new Set<HTMLElement>();
  const selectors = PRICE_HINT_SELECTORS.join(',');

  root.querySelectorAll<HTMLElement>(selectors).forEach((element) => {
    if (!isEligiblePriceHost(element)) {
      return;
    }

    unique.add(element);
  });

  if (unique.size === 0) {
    collectFallbackPriceHosts(root).forEach((element) => unique.add(element));
  }

  return Array.from(unique);
}

function ensureInjectedStyle(doc: Document): void {
  if (doc.getElementById(INJECTED_STYLE_ID)) {
    return;
  }

  const style = doc.createElement('style');
  style.id = INJECTED_STYLE_ID;
  style.textContent = `
    .${INJECTED_BADGE_CLASS} {
      width: max-content;
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      marding: 2px;
      border-radius: 999px;
      background: rgba(93, 143, 46, 0.12);
      color: #365416;
      font-size: 0.86em;
      font-weight: 600;
      line-height: 1.2;
      white-space: nowrap;
      vertical-align: middle;
    }
    .${INJECTED_BADGE_CLASS}[data-stale="true"] {
      background: rgba(193, 118, 25, 0.12);
      color: #8e5512;
    }
  `;
  doc.head.append(style);
}

export function clearInjectedPrices(root: ParentNode = document): void {
  root.querySelectorAll(`.${INJECTED_BADGE_CLASS}`).forEach((node) => node.remove());
}

export function decoratePrices(root: Document | HTMLElement, activeRate: ActiveRate, roundToWholeByn: boolean): number {
  const doc = root instanceof Document ? root : root.ownerDocument;
  if (!doc) {
    return 0;
  }

  ensureInjectedStyle(doc);
  let injected = 0;

  findPriceHosts(root).forEach((element) => {
    const bynAmount = parseBynAmount(element.textContent ?? '');
    if (bynAmount === null) {
      return;
    }

    const computedKey = `${bynAmount}-${activeRate.value}-${roundToWholeByn ? 'round' : 'precise'}`;
    const nextSibling = element.nextElementSibling;
    const existingBadge =
      nextSibling instanceof HTMLElement && nextSibling.classList.contains(INJECTED_BADGE_CLASS) ? nextSibling : null;

    if (existingBadge?.dataset.key === computedKey) {
      return;
    }

    const badge = existingBadge ?? doc.createElement('span');
    badge.className = INJECTED_BADGE_CLASS;
    badge.dataset.key = computedKey;
    badge.dataset.stale = String(activeRate.stale);
    badge.textContent = `≈ $${formatUsdAmount(bynAmount / activeRate.value, roundToWholeByn)}`;
    badge.title = `Источник: ${activeRate.sourceLabel}${activeRate.stale ? ' • кэш' : ''}`;

    if (!existingBadge) {
      element.insertAdjacentElement('afterend', badge);
      injected += 1;
    }
  });

  return injected;
}
