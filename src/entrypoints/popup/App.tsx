import { useEffect, useState } from 'react';
import { SITE_LABELS } from '../../constants';
import { MessageActionType } from '../../types';
import { formatUpdatedAt } from '../../lib/format';
import type {
  ActiveRate,
  BadgeAppearance,
  BadgeDisplayMode,
  BankRate,
  MessageAction,
  MessageResponse,
  SupportedSite,
  UserSettings,
} from '../../types';

async function sendMessage<T>(message: MessageAction): Promise<T> {
  const response = (await browser.runtime.sendMessage(message)) as MessageResponse<T>;
  if (!response.success) {
    throw new Error(response.error);
  }
  return response.data;
}

const DISPLAY_MODE_LABELS: Record<BadgeDisplayMode, string> = {
  badge: 'Бейдж (фон + рамка + текст)',
  outline: 'Контур (рамка + текст)',
  text: 'Только текст',
};

const SITE_ORDER = ['avby', 'kufar'] as const satisfies SupportedSite[];

interface AppearanceSectionProps {
  label: string;
  value: BadgeAppearance;
  onChange: (next: BadgeAppearance) => void;
}

function AppearanceSection({ label, value, onChange }: AppearanceSectionProps) {
  const update = (patch: Partial<BadgeAppearance>) => onChange({ ...value, ...patch });
  const updateLight = (patch: Partial<BadgeAppearance['light']>) => update({ light: { ...value.light, ...patch } });
  const updateDark = (patch: Partial<BadgeAppearance['dark']>) => update({ dark: { ...value.dark, ...patch } });

  return (
    <div className='appearance-group'>
      <p className='field-label appearance-group-label'>{label}</p>

      <label className='control-group'>
        <span className='field-label'>Режим отображения</span>
        <span className='select-shell'>
          <select value={value.mode} onChange={(e) => update({ mode: e.target.value as BadgeDisplayMode })}>
            {(Object.entries(DISPLAY_MODE_LABELS) as [BadgeDisplayMode, string][]).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </span>
      </label>

      <div className='color-theme-row'>
        <div className='color-picker-group'>
          <p className='field-label'>Светлая тема</p>
          <label className='color-picker-row'>
            <span>Текст</span>
            <input
              type='color'
              value={value.light.textColor}
              onChange={(e) => updateLight({ textColor: e.target.value })}
            />
          </label>
          {value.mode !== 'text' && (
            <label className='color-picker-row'>
              <span>Фон / рамка</span>
              <input
                type='color'
                value={value.light.backgroundColor}
                onChange={(e) => updateLight({ backgroundColor: e.target.value })}
              />
            </label>
          )}
        </div>
        <div className='color-picker-group'>
          <p className='field-label'>Тёмная тема</p>
          <label className='color-picker-row'>
            <span>Текст</span>
            <input
              type='color'
              value={value.dark.textColor}
              onChange={(e) => updateDark({ textColor: e.target.value })}
            />
          </label>
          {value.mode !== 'text' && (
            <label className='color-picker-row'>
              <span>Фон / рамка</span>
              <input
                type='color'
                value={value.dark.backgroundColor}
                onChange={(e) => updateDark({ backgroundColor: e.target.value })}
              />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [banks, setBanks] = useState<BankRate[]>([]);
  const [activeRate, setActiveRate] = useState<ActiveRate | null>(null);
  const [activeAppearanceSite, setActiveAppearanceSite] = useState<SupportedSite>('avby');
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

  const enabledSitesCount = Object.values(settings.enabledSites).filter(Boolean).length;
  const appearanceSettings = settings.siteAppearances[activeAppearanceSite];

  const updateSiteAppearance = (
    site: SupportedSite,
    patch: Partial<UserSettings['siteAppearances'][SupportedSite]>,
  ) => {
    saveSettings({
      siteAppearances: {
        ...settings.siteAppearances,
        [site]: {
          ...settings.siteAppearances[site],
          ...patch,
        },
      },
    });
  };

  return (
    <main className='popup-shell'>
      <section className='hero-card'>
        <div className='hero-copy'>
          <h1>AV.BY | Kufar: цены в USD</h1>
        </div>

        <div className='hero-aside'>
          {SITE_ORDER.map((site) => (
            <label className='toggle-card' key={site}>
              <span className='toggle-copy'>
                <strong>Показывать USD на {SITE_LABELS[site]}</strong>
                <small>{site === 'avby' ? 'Автомобили и салонные объявления' : 'Объявления и вертикали Kufar'}</small>
              </span>
              <span className='toggle-control'>
                <input
                  type='checkbox'
                  checked={settings.enabledSites[site]}
                  onChange={(event) =>
                    saveSettings({
                      enabledSites: {
                        ...settings.enabledSites,
                        [site]: event.target.checked,
                      },
                    })
                  }
                />
                <span className='toggle-track' aria-hidden='true'>
                  <span className='toggle-thumb' />
                </span>
              </span>
            </label>
          ))}
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

      <section className='panel panel-grid'>
        <div className='panel-heading'>
          <div>
            <p className='section-kicker'>Оформление</p>
            <h2>Внешний вид</h2>
          </div>
        </div>

        <div className='site-tabs' role='tablist' aria-label='Настройки цвета по площадкам'>
          {SITE_ORDER.map((site) => (
            <button
              key={site}
              type='button'
              role='tab'
              className={`site-tab${activeAppearanceSite === site ? ' is-active' : ''}`}
              aria-selected={activeAppearanceSite === site}
              onClick={() => setActiveAppearanceSite(site)}
            >
              {SITE_LABELS[site]}
            </button>
          ))}
        </div>

        <p className='notice'>Цвета настраиваются отдельно для каждой площадки во вкладках выше.</p>

        <AppearanceSection
          label={`Обычный значок · ${SITE_LABELS[activeAppearanceSite]}`}
          value={appearanceSettings.badgeAppearance}
          onChange={(next) => updateSiteAppearance(activeAppearanceSite, { badgeAppearance: next })}
        />

        <div className='appearance-divider' />

        <AppearanceSection
          label={`Значок на баннерах · ${SITE_LABELS[activeAppearanceSite]}`}
          value={appearanceSettings.bannerAppearance}
          onChange={(next) => updateSiteAppearance(activeAppearanceSite, { bannerAppearance: next })}
        />
      </section>

      <section className='panel metrics-panel'>
        <div className='panel-heading'>
          <div>
            <p className='section-kicker'>Текущий статус</p>
            <h2>Курс и источник</h2>
          </div>
          <span className='live-dot'>auto</span>
        </div>

        <p className='notice'>
          Активных площадок: {enabledSitesCount} из {SITE_ORDER.length}. Если на странице уже есть цена в долларах,
          расширение пропустит такой блок.
        </p>

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
