import { clearInjectedPrices, decoratePrices } from '../lib/avby-dom';
import { MessageActionType } from '../types';
import type { ActiveRate, MessageAction, MessageResponse, UserSettings } from '../types';

function debounce<T extends (...args: never[]) => void>(callback: T, delayMs: number): T {
  let timeoutId: number | undefined;

  return ((...args: never[]) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => callback(...args), delayMs);
  }) as T;
}

export default defineContentScript({
  matches: ['https://av.by/*', 'https://*.av.by/*'],
  runAt: 'document_idle',
  world: 'ISOLATED',

  main() {
    let activeRate: ActiveRate | null = null;
    let settings: UserSettings | null = null;
    let lastUrl = location.href;

    const rerender = async (force = false) => {
      const settingsResponse = (await browser.runtime.sendMessage({
        action: MessageActionType.GetSettings,
      } as MessageAction)) as MessageResponse<UserSettings>;

      settings = settingsResponse.success ? settingsResponse.data : null;

      if (!settings?.enabled) {
        clearInjectedPrices(document);
        return;
      }

      const action = force ? MessageActionType.RefreshRates : MessageActionType.GetActiveRate;
      const rateResponse = (await browser.runtime.sendMessage({
        action,
      } as MessageAction)) as MessageResponse<ActiveRate | null>;

      activeRate = rateResponse.success ? rateResponse.data : null;

      clearInjectedPrices(document);
      if (!activeRate) {
        return;
      }

      decoratePrices(
        document,
        activeRate,
        settings.roundToWholeByn,
        settings.badgeAppearance,
        settings.bannerAppearance,
      );
    };

    const debouncedRerender = debounce(() => {
      if (activeRate && settings?.enabled) {
        decoratePrices(
          document,
          activeRate,
          settings.roundToWholeByn,
          settings.badgeAppearance,
          settings.bannerAppearance,
        );
      }
    }, 120);

    const debouncedSpaRerender = debounce(() => {
      rerender(false).catch(() => undefined);
    }, 300);

    const observer = new MutationObserver(() => {
      // Detect SPA URL changes (Vue Router / History API)
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        debouncedSpaRerender();
        return;
      }
      debouncedRerender();
    });

    browser.runtime.onMessage.addListener((message: MessageAction) => {
      if (message.action === MessageActionType.ContentRefresh) {
        rerender(false).catch(() => undefined);
      }
    });

    // Also catch History API navigation that may not trigger MutationObserver
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);
    history.pushState = (...args) => {
      originalPushState(...args);
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        debouncedSpaRerender();
      }
    };
    history.replaceState = (...args) => {
      originalReplaceState(...args);
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        debouncedSpaRerender();
      }
    };
    window.addEventListener('popstate', () => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        debouncedSpaRerender();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    rerender(false).catch((error) => {
      console.error('[AVBY Currency Helper] Content script render failed', error);
    });
  },
});
