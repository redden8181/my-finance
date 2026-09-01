export function formatCurrency(amount: number, showSign = false): string {
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  if (showSign && amount > 0) return `+${formatted} ₽`;
  if (showSign && amount < 0) return `-${formatted} ₽`;
  return `${formatted} ₽`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Сегодня';
  if (date.toDateString() === yesterday.toDateString()) return 'Вчера';

  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

export function getMonthName(date: Date): string {
  return date.toLocaleDateString('ru-RU', { month: 'long' });
}

/** Short date without time: "5 фев 2025" */
export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Human distance: "сегодня", "вчера", "5 дней назад", "2 мес. назад" */
export function formatAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  const d0 = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const n0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((n0.getTime() - d0.getTime()) / 86400000);

  if (days <= 0) return 'сегодня';
  if (days === 1) return 'вчера';
  if (days < 30) {
    const last2 = days % 100;
    const last1 = days % 10;
    let word = 'дней';
    if (!(last2 >= 11 && last2 <= 19)) {
      if (last1 === 1) word = 'день';
      else if (last1 >= 2 && last1 <= 4) word = 'дня';
    }
    return `${days} ${word} назад`;
  }
  const months = Math.floor(days / 30);
  return `${months} мес. назад`;
}

export function formatPercent(value: number): string {
  if (!isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}
