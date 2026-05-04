import { INJECTED_BADGE_CLASS, INJECTED_STYLE_ID } from '../constants';
import { formatUsdAmount } from './format';
import type { ActiveRate } from '../types';

/**
 * BYN price regex:
 * - Requires at least 2 digits (to avoid matching single-digit numbers)
 * - Number may contain spaces (thousand separators)
 * - Must be followed by a BYN unit (р. руб. BYN br)
 * - Must NOT be preceded by a decimal separator (to skip exchange rates like "2.82 BYN")
 */
const BYN_PRICE_RE = /(?:^|[^\d.,])((?:\d{1,3}(?: \d{3})+|\d{2,}))\s*(?:[рp]\.?|руб\.?|byn|br)(?=$|[\s),.;:!?])/i;

function normalizeSpaces(value: string): string {
  return value
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

/**
 * Walk the DOM and find the smallest elements whose combined textContent
 * contains a BYN price. This is intentionally simple and greedy:
 * it walks ALL text nodes (not just those matching CSS selectors),
 * so it works with any markup structure.
 */
export function findPriceHosts(root: ParentNode = document): HTMLElement[] {
  const doc = root instanceof Document ? root : root.ownerDocument;
  if (!doc) return [];

  const hosts = new Set<HTMLElement>();
  const walker = doc.createTreeWalker(root as Node, NodeFilter.SHOW_TEXT);

  let node = walker.nextNode();
  while (node) {
    const text = node.textContent ?? '';
    // Only start checking if this text node contains digits
    if (/\d/.test(text)) {
      // Walk up to find the smallest ancestor whose textContent is a valid BYN price
      let el = node.parentElement;
      while (el && el !== root && el !== doc.documentElement) {
        // Skip our own injected elements
        if (el.classList.contains(INJECTED_BADGE_CLASS)) break;

        const elText = normalizeSpaces(el.textContent ?? '');
        if (elText.length > 300) break; // too big, stop climbing

        if (parseBynAmount(elText) !== null) {
          // Check this element doesn't have a child that ALSO independently matches
          const hasChildHost = Array.from(el.children).some((child) => {
            if (!(child instanceof HTMLElement)) return false;
            if (child.classList.contains(INJECTED_BADGE_CLASS)) return false;
            return parseBynAmount(normalizeSpaces(child.textContent ?? '')) !== null;
          });

          if (hasChildHost) {
            // A child already independently matches — skip this ancestor
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

function ensureInjectedStyle(doc: Document): void {
  if (doc.getElementById(INJECTED_STYLE_ID)) return;

  const style = doc.createElement('style');
  style.id = INJECTED_STYLE_ID;
  style.textContent = `
    .${INJECTED_BADGE_CLASS} {
      display: block;
      width: fit-content;
      margin-top: 4px;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(93, 143, 46, 0.14);
      color: #2d4a10;
      border: 1.5px solid rgba(93, 143, 46, 0.45);
      font-size: 0.75em;
      font-weight: 600;
      line-height: 1.4;
      white-space: nowrap;
      order: 999;
    }
    .${INJECTED_BADGE_CLASS}[data-stale="true"] {
      background: rgba(193, 118, 25, 0.14);
      color: #6b3d09;
      border-color: rgba(193, 118, 25, 0.45);
    }
    [class*="banner"] .${INJECTED_BADGE_CLASS},
    [class*="Banner"] .${INJECTED_BADGE_CLASS},
    [class*="salon-listing-top"] .${INJECTED_BADGE_CLASS},
    .fullscreen-gallery__price .${INJECTED_BADGE_CLASS} {
      color: #fff;
      background: rgba(255, 255, 255, 0.22);
      border-color: rgba(255, 255, 255, 0.5);
      margin-right: 8px;
    }
    @media (prefers-color-scheme: dark) {
      .${INJECTED_BADGE_CLASS} {
        background: rgba(60, 100, 20, 0.55);
        color: #d4f0a0;
        border-color: rgba(150, 210, 80, 0.55);
      }
      .${INJECTED_BADGE_CLASS}[data-stale="true"] {
        background: rgba(120, 70, 10, 0.55);
        color: #ffe4bf;
        border-color: rgba(220, 150, 60, 0.55);
      }
    }
  `;
  doc.head.append(style);
}

export function clearInjectedPrices(root: ParentNode = document): void {
  root.querySelectorAll(`.${INJECTED_BADGE_CLASS}`).forEach((n) => n.remove());
  const doc = root instanceof Document ? root : root instanceof Element ? root.ownerDocument : null;
  if (doc) {
    doc.getElementById(INJECTED_STYLE_ID)?.remove();
  }
}

export function decoratePrices(root: Document | HTMLElement, activeRate: ActiveRate, roundToWholeByn: boolean): number {
  const doc = root instanceof Document ? root : root.ownerDocument;
  if (!doc) return 0;

  ensureInjectedStyle(doc);
  let injected = 0;

  findPriceHosts(root).forEach((element) => {
    const bynAmount = parseBynAmount(element.textContent ?? '');
    if (bynAmount === null) return;

    const computedKey = `${bynAmount}-${activeRate.value}-${roundToWholeByn ? 'round' : 'precise'}`;

    // Check for existing badge as child or next sibling
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
