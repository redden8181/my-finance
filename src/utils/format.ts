export const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export const MONTH_NAMES_GEN = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

const nf = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });

/** 12345.5 → "12 345,5 ₽" */
export function formatMoney(amount: number, withSign = false): string {
  const abs = Math.abs(amount);
  const formatted = nf.format(Math.round(abs * 100) / 100);
  if (withSign) return `${amount < 0 ? "−" : "+"}${formatted} ₽`;
  return `${amount < 0 ? "−" : ""}${formatted} ₽`;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function monthKeyOf(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** "Сегодня" / "Вчера" / "12 ноября" */
export function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, now)) return "Сегодня";
  if (isSameDay(d, yesterday)) return "Вчера";
  const sameYear = d.getFullYear() === now.getFullYear();
  return `${d.getDate()} ${MONTH_NAMES_GEN[d.getMonth()]}${sameYear ? "" : ` ${d.getFullYear()}`}`;
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH_NAMES_GEN[d.getMonth()]}`;
}

export function formatDateFull(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH_NAMES_GEN[d.getMonth()]} ${d.getFullYear()}`;
}

/** Склонение: 1 день, 2 дня, 5 дней */
export function pluralize(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return many;
  if (last > 1 && last < 5) return few;
  if (last === 1) return one;
  return many;
}

/** Безопасный расчёт выражений вида "1500+300*2" (× ÷ − ,) */
export function evaluateExpression(input: string): number | null {
  const expr = input
    .replace(/,/g, ".")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/\s+/g, "");
  if (!expr || /[^0-9+\-*/.]/.test(expr)) return null;
  let pos = 0;
  const parseFactor = (): number => {
    if (expr[pos] === "-") { pos++; return -parseFactor(); }
    if (expr[pos] === "+") { pos++; return parseFactor(); }
    let num = "";
    while (pos < expr.length && /[0-9.]/.test(expr[pos])) num += expr[pos++];
    const v = parseFloat(num);
    if (Number.isNaN(v)) throw new Error("nan");
    return v;
  };
  const parseTerm = (): number => {
    let v = parseFactor();
    while (pos < expr.length && (expr[pos] === "*" || expr[pos] === "/")) {
      const op = expr[pos++];
      v = op === "*" ? v * parseFactor() : v / parseFactor();
    }
    return v;
  };
  const parseExpr = (): number => {
    let v = parseTerm();
    while (pos < expr.length && (expr[pos] === "+" || expr[pos] === "-")) {
      const op = expr[pos++];
      v = op === "+" ? v + parseTerm() : v - parseTerm();
    }
    return v;
  };
  try {
    const result = parseExpr();
    if (pos !== expr.length || !Number.isFinite(result)) return null;
    return Math.round(result * 100) / 100;
  } catch {
    return null;
  }
}

export function hasOperator(input: string): boolean {
  return /[+×÷−]/.test(input.slice(1));
}
