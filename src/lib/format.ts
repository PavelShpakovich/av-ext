export const bynFormatter = new Intl.NumberFormat('ru-BY', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const bynPreciseFormatter = new Intl.NumberFormat('ru-BY', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const usdFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const usdPreciseFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const dateTimeFormatter = new Intl.DateTimeFormat('ru-BY', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatBynAmount(value: number, roundToWholeByn: boolean): string {
  return roundToWholeByn ? bynFormatter.format(Math.round(value)) : bynPreciseFormatter.format(value);
}

export function formatUsdAmount(value: number, roundToWholeUsd: boolean): string {
  return roundToWholeUsd ? usdFormatter.format(Math.round(value)) : usdPreciseFormatter.format(value);
}

export function formatUpdatedAt(value: string | null): string {
  if (!value) {
    return 'нет данных';
  }

  return dateTimeFormatter.format(new Date(value));
}
