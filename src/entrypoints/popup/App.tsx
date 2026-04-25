import { useEffect, useState } from 'react';
import { MessageActionType } from '../../types';
import { formatUpdatedAt } from '../../lib/format';
import type { ActiveRate, BankRate, MessageAction, MessageResponse, UserSettings } from '../../types';

async function sendMessage<T>(message: MessageAction): Promise<T> {
  const response = (await browser.runtime.sendMessage(message)) as MessageResponse<T>;
  if (!response.success) {
    throw new Error(response.error);
  }
  return response.data;
}

export default function App() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [banks, setBanks] = useState<BankRate[]>([]);
  const [activeRate, setActiveRate] = useState<ActiveRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadState = async () => {
    setLoading(true);
    setError(null);

    try {
      const [nextSettings, nextBanks, nextActiveRate] = await Promise.all([
        sendMessage<UserSettings>({ action: MessageActionType.GetSettings }),
        sendMessage<BankRate[]>({ action: MessageActionType.GetBanks }),
        sendMessage<ActiveRate | null>({ action: MessageActionType.GetActiveRate }),
      ]);
      setSettings(nextSettings);
      setBanks(nextBanks);
      setActiveRate(nextActiveRate);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить состояние');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadState().catch(() => undefined);
  }, []);

  const saveSettings = async (partial: Partial<UserSettings>) => {
    if (!settings) {
      return;
    }

    const nextSettings = await sendMessage<UserSettings>({
      action: MessageActionType.UpdateSettings,
      settings: partial,
    });

    setSettings(nextSettings);
    const nextActiveRate = await sendMessage<ActiveRate | null>({ action: MessageActionType.GetActiveRate });
    setActiveRate(nextActiveRate);
  };

  const currentBank = banks.find((bank) => bank.alias === settings?.selectedBankAlias) ?? null;

  if (loading || !settings) {
    return (
      <main className='popup-shell popup-loading'>
        <div className='loading-orb' aria-hidden='true' />
        <p>Загрузка курсов и настроек…</p>
      </main>
    );
  }

  return (
    <main className='popup-shell'>
      <section className='hero-card'>
        <div className='hero-copy'>
          <p className='eyebrow'>AV.BY helper</p>
          <h1>Цены в долларах без калькулятора</h1>
          <p className='hero-description'>
            Расширение показывает примерную цену в USD прямо рядом с суммой в BYN на страницах av.by.
          </p>
        </div>

        <div className='hero-aside'>
          <span className={`status-pill ${settings.enabled ? 'is-on' : 'is-off'}`}>
            {settings.enabled ? 'Активно' : 'Выключено'}
          </span>
          <label className='toggle-card'>
            <span className='toggle-copy'>
              <strong>Показывать USD на av.by</strong>
              <small>Автообновление курсов каждые 10 минут</small>
            </span>
            <span className='toggle-control'>
              <input
                type='checkbox'
                checked={settings.enabled}
                onChange={(event) => saveSettings({ enabled: event.target.checked })}
              />
              <span className='toggle-track' aria-hidden='true'>
                <span className='toggle-thumb' />
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className='panel panel-grid'>
        <div className='panel-heading'>
          <div>
            <p className='section-kicker'>Настройки конвертации</p>
            <h2>Источник курса</h2>
          </div>
          <span className='badge-outline'>{settings.selectedRateSourceType === 'nbrb' ? 'НБРБ' : 'Банк'}</span>
        </div>

        <label className='control-group'>
          <span className='field-label'>Режим пересчёта</span>
          <span className='select-shell'>
            <select
              value={settings.selectedRateSourceType}
              onChange={(event) =>
                saveSettings({
                  selectedRateSourceType: event.target.value as UserSettings['selectedRateSourceType'],
                  selectedBankAlias:
                    event.target.value === 'bank' ? (settings.selectedBankAlias ?? banks[0]?.alias ?? null) : null,
                })
              }
            >
              <option value='nbrb'>Официальный курс НБРБ</option>
              <option value='bank'>Курс продажи банка</option>
            </select>
          </span>
        </label>

        {settings.selectedRateSourceType === 'bank' ? (
          <label className='control-group'>
            <span className='field-label'>Выбранный банк</span>
            <span className='select-shell'>
              <select
                value={settings.selectedBankAlias ?? banks[0]?.alias ?? ''}
                onChange={(event) => saveSettings({ selectedBankAlias: event.target.value || null })}
              >
                {banks.map((bank) => (
                  <option value={bank.alias} key={bank.alias}>
                    {bank.name} · продажа {bank.sellRate.toFixed(4)}
                  </option>
                ))}
              </select>
            </span>
          </label>
        ) : null}

        <label className='toggle-row'>
          <span>
            <strong>Округлять до целого USD</strong>
            <small>Удобно для быстрого сравнения объявлений</small>
          </span>
          <span className='toggle-control'>
            <input
              type='checkbox'
              checked={settings.roundToWholeByn}
              onChange={(event) => saveSettings({ roundToWholeByn: event.target.checked })}
            />
            <span className='toggle-track' aria-hidden='true'>
              <span className='toggle-thumb' />
            </span>
          </span>
        </label>
      </section>

      <section className='panel metrics-panel'>
        <div className='panel-heading'>
          <div>
            <p className='section-kicker'>Текущий статус</p>
            <h2>Курс и источник</h2>
          </div>
          <span className='live-dot'>auto</span>
        </div>

        <div className='highlight-rate'>
          <span className='highlight-label'>Текущий курс</span>
          <strong>{activeRate ? activeRate.value.toFixed(4) : 'нет данных'}</strong>
          <span className='highlight-meta'>1 USD = BYN</span>
        </div>

        <div className='metrics-grid'>
          <article className='metric-card'>
            <span>Источник</span>
            <strong>{activeRate?.sourceLabel ?? 'нет данных'}</strong>
            <small>
              {settings.selectedRateSourceType === 'bank' && currentBank ? 'Продажа банка' : 'Официальный курс'}
            </small>
          </article>

          <article className='metric-card'>
            <span>Обновлено</span>
            <strong>{formatUpdatedAt(activeRate?.updatedAt ?? null)}</strong>
            <small>Фон обновляет данные автоматически</small>
          </article>
        </div>

        {activeRate?.fallbackToOfficial ? (
          <p className='notice'>Выбранный банк недоступен, поэтому используется официальный курс НБРБ.</p>
        ) : null}
        {activeRate?.stale ? (
          <p className='notice warning'>Показан кэшированный курс. Расширение попробует обновить его автоматически.</p>
        ) : null}
        {error ? <p className='notice error'>{error}</p> : null}
      </section>
    </main>
  );
}
