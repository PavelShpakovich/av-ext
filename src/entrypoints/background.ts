import { createBackgroundController } from '../background-controller';
import type { MessageAction, MessageResponse } from '../types';

const RATE_REFRESH_ALARM = 'rate-refresh';
const RATE_REFRESH_PERIOD_MINUTES = 10;

export default defineBackground(() => {
  const controller = createBackgroundController();

  controller.initialize().catch((error) => {
    console.error('[BYN to USD Marketplace Helper] Background initialization failed', error);
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== RATE_REFRESH_ALARM) {
      return;
    }

    controller.refreshRates(true).catch((error) => {
      console.error('[BYN to USD Marketplace Helper] Scheduled refresh failed', error);
    });
  });

  browser.alarms.create(RATE_REFRESH_ALARM, {
    periodInMinutes: RATE_REFRESH_PERIOD_MINUTES,
  });

  browser.runtime.onMessage.addListener(
    (
      message: MessageAction,
      _sender: Browser.runtime.MessageSender,
      sendResponse: (response: MessageResponse) => void,
    ) => {
      controller
        .handleMessage(message)
        .then((response) => sendResponse(response))
        .catch((error) => {
          sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        });

      return true;
    },
  );
});
