import { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuid } from "uuid";
import type {
  Category,
  Debt,
  DebtDirection,
  MonthlyReport,
  StoredData,
  ThemeMode,
  Transaction,
  TransactionFlag,
  TransactionType,
} from "../types";
import { daysInMonth, monthKeyOf } from "../utils/format";

const STORAGE_KEY = "koshelek_app_data";

export const ADJUST_CATEGORY_ID = "cat-adjust";
export const DEBT_CATEGORY_ID = "cat-debt";

/** Служебные категории: скрыты из UI, их нельзя изменить, удалить или переместить. */
export const SPECIAL_CATEGORY_IDS = [ADJUST_CATEGORY_ID, DEBT_CATEGORY_ID];

export function isSpecialCategoryId(id: string): boolean {
  return SPECIAL_CATEGORY_IDS.includes(id);
}

export const FLAG_LABELS: Record<TransactionFlag, string> = {
  mandatory: "Обязательная",
  spontaneous: "Спонтанная",
  planned: "Запланированная",
  regular: "Регулярная",
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: ADJUST_CATEGORY_ID, name: "Корректировка", icon: "⚖️", type: "income", isDefault: true, isSpecial: true },
  { id: DEBT_CATEGORY_ID, name: "Долги", icon: "💸", type: "expense", isDefault: true, isSpecial: true },
  { id: "cat-salary", name: "Зарплата", icon: "💼", type: "income", isDefault: true },
  { id: "cat-side", name: "Подработка", icon: "💻", type: "income", isDefault: true },
  { id: "cat-gift-in", name: "Подарки", icon: "🎁", type: "income", isDefault: true },
  { id: "cat-interest", name: "Проценты", icon: "🏦", type: "income", isDefault: true },
  { id: "cat-other-in", name: "Прочее", icon: "✨", type: "income", isDefault: true },
  { id: "cat-food", name: "Продукты", icon: "🛒", type: "expense", isDefault: true },
  { id: "cat-cafe", name: "Кафе", icon: "☕", type: "expense", isDefault: true },
  { id: "cat-transport", name: "Транспорт", icon: "🚌", type: "expense", isDefault: true },
  { id: "cat-home", name: "Жильё", icon: "🏠", type: "expense", isDefault: true },
  { id: "cat-health", name: "Здоровье", icon: "💊", type: "expense", isDefault: true },
  { id: "cat-fun", name: "Развлечения", icon: "🎬", type: "expense", isDefault: true },
  { id: "cat-clothes", name: "Одежда", icon: "👕", type: "expense", isDefault: true },
  { id: "cat-subs", name: "Подписки", icon: "📱", type: "expense", isDefault: true },
  { id: "cat-other-out", name: "Прочее", icon: "📦", type: "expense", isDefault: true },
];

function defaultData(): StoredData {
  const now = new Date();
  return {
    transactions: [],
    categories: DEFAULT_CATEGORIES,
    settings: { theme: "light" },
    monthlyReports: [],
    lastCheckedMonth: monthKeyOf(now.getFullYear(), now.getMonth()),
    debts: [],
  };
}

/**
 * Восстанавливает служебные категории.
 * Чинит данные, где они были удалены или сохранены без флага isSpecial
 * (например, после старых версий приложения).
 */
function ensureSpecialCategories(categories: Category[]): Category[] {
  const healed = categories.map((category) =>
    isSpecialCategoryId(category.id) ? { ...category, isSpecial: true } : category
  );

  for (const special of DEFAULT_CATEGORIES) {
    if (!special.isSpecial) continue;
    if (!healed.some((category) => category.id === special.id)) {
      healed.push({ ...special });
    }
  }

  return healed;
}

function loadData(): StoredData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw) as Partial<StoredData>;
    const base = defaultData();
    return {
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      categories:
        Array.isArray(parsed.categories) && parsed.categories.length
          ? ensureSpecialCategories(parsed.categories)
          : base.categories,
      settings: { theme: parsed.settings?.theme === "dark" ? "dark" : "light" },
      monthlyReports: Array.isArray(parsed.monthlyReports) ? parsed.monthlyReports : [],
      lastCheckedMonth: parsed.lastCheckedMonth || base.lastCheckedMonth,
      debts: Array.isArray(parsed.debts) ? parsed.debts : [],
    };
  } catch {
    return defaultData();
  }
}

/* ---------- derived helpers ---------- */

export function getBalance(transactions: Transaction[]): number {
  return transactions.reduce(
    (acc, t) => acc + (t.type === "income" ? t.amount : -t.amount),
    0
  );
}

export function getTransactionsOfMonth(
  transactions: Transaction[],
  year: number,
  month: number
): Transaction[] {
  return transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export function getMonthStats(transactions: Transaction[], year: number, month: number) {
  const list = getTransactionsOfMonth(transactions, year, month);
  let income = 0;
  let expense = 0;
  for (const t of list) {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }
  return { list, income, expense, net: income - expense };
}

/** Остаток на начало месяца (сумма всех операций до его начала) */
export function getCarryover(transactions: Transaction[], year: number, month: number): number {
  const start = new Date(year, month, 1).getTime();
  return transactions.reduce((acc, t) => {
    if (new Date(t.date).getTime() < start) {
      return acc + (t.type === "income" ? t.amount : -t.amount);
    }
    return acc;
  }, 0);
}

/** Серия баланса на конец каждого из последних N дней */
export function getBalanceSeries(transactions: Transaction[], days = 30): number[] {
  const now = new Date();
  const nets = new Array<number>(days).fill(0);
  for (const t of transactions) {
    const d = new Date(t.date);
    const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const diff = Math.round((todayStart - startOfDay) / 86400000);
    if (diff >= 0 && diff < days) {
      nets[days - 1 - diff] += t.type === "income" ? t.amount : -t.amount;
    }
  }
  const total = getBalance(transactions);
  const series = new Array<number>(days);
  series[days - 1] = total;
  for (let i = days - 2; i >= 0; i--) {
    series[i] = series[i + 1] - nets[i + 1];
  }
  return series;
}

export interface Reminder {
  tx: Transaction;
  dueDate: Date;
  daysUntil: number;
  level: "green" | "yellow" | "orange" | "red";
  progress: number;
}

export function computeReminders(transactions: Transaction[]): Reminder[] {
  const now = new Date();
  const templates = transactions.filter(
    (t) =>
      t.flag === "regular" &&
      t.recurrencePeriod === "monthly" &&
      typeof t.dueDay === "number" &&
      t.type === "expense"
  );
  const result: Reminder[] = [];
  for (const tx of templates) {
    const y = now.getFullYear();
    const m = now.getMonth();
    let dueDate = new Date(y, m, Math.min(tx.dueDay!, daysInMonth(y, m)));
    // если платёж в этом месяце уже подтверждён — смотрим следующий цикл
    if (tx.lastPaidAt) {
      const paid = new Date(tx.lastPaidAt);
      if (paid.getFullYear() === y && paid.getMonth() === m) {
        const nm = m === 11 ? 0 : m + 1;
        const ny = m === 11 ? y + 1 : y;
        dueDate = new Date(ny, nm, Math.min(tx.dueDay!, daysInMonth(ny, nm)));
      }
    }
    const todayStart = new Date(y, m, now.getDate()).getTime();
    const daysUntil = Math.round((dueDate.getTime() - todayStart) / 86400000);
    if (daysUntil > 10) continue;
    const level =
      daysUntil < 0 ? "red" : daysUntil <= 2 ? "orange" : daysUntil <= 5 ? "yellow" : "green";
    result.push({
      tx,
      dueDate,
      daysUntil,
      level,
      progress: Math.min(1, Math.max(0, (10 - daysUntil) / 10)),
    });
  }
  return result.sort((a, b) => a.daysUntil - b.daysUntil);
}

/** Топ частых комбинаций категория+сумма из истории расходов */
export function getQuickSpends(transactions: Transaction[], limit = 6) {
  const map = new Map<string, { categoryId: string; amount: number; count: number; last: number }>();
  for (const t of transactions) {
    if (t.type !== "expense" || t.debtId) continue;
    const key = `${t.categoryId}|${t.amount}`;
    const entry = map.get(key);
    const time = new Date(t.date).getTime();
    if (entry) {
      entry.count += 1;
      entry.last = Math.max(entry.last, time);
    } else {
      map.set(key, { categoryId: t.categoryId, amount: t.amount, count: 1, last: time });
    }
  }
  return [...map.values()]
    .sort((a, b) => b.count - a.count || b.last - a.last)
    .filter((e) => e.count >= 2)
    .slice(0, limit);
}

function buildReport(
  transactions: Transaction[],
  categories: Category[],
  year: number,
  month: number
): MonthlyReport {
  const { list, income, expense, net } = getMonthStats(transactions, year, month);
  // Ключ — «категория + тип», чтобы служебная категория долгов
  // не смешивала взятые и выданные суммы в одну строку
  const catMap = new Map<string, { categoryId: string; type: TransactionType; total: number }>();
  const flagMap = new Map<TransactionFlag, number>();
  for (const t of list) {
    const key = `${t.categoryId}|${t.type}`;
    const entry = catMap.get(key);
    if (entry) entry.total += t.amount;
    else catMap.set(key, { categoryId: t.categoryId, type: t.type, total: t.amount });
    flagMap.set(t.flag, (flagMap.get(t.flag) || 0) + t.amount);
  }
  const findCat = (id: string) => categories.find((c) => c.id === id);
  return {
    id: uuid(),
    month,
    year,
    totalIncome: income,
    totalExpenses: expense,
    balance: net,
    carryoverFromPrevious: getCarryover(transactions, year, month),
    closedAt: new Date().toISOString(),
    categoryBreakdown: [...catMap.values()]
      .map(({ categoryId, type, total }) => {
        const cat = findCat(categoryId);
        return {
          categoryId,
          categoryName: cat?.name || "Без категории",
          categoryIcon: cat?.icon || "🏷️",
          type,
          total,
        };
      })
      .sort((a, b) => b.total - a.total),
    flagBreakdown: [...flagMap.entries()].map(([flag, total]) => ({ flag, total })),
  };
}

/* ---------- store hook ---------- */

export function useStore() {
  const [data, setData] = useState<StoredData>(loadData);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* переполнение хранилища — игнорируем */
    }
  }, [data]);

  // Автозакрытие месяца при смене календарного месяца
  useEffect(() => {
    setData((prev) => {
      const now = new Date();
      const currentKey = monthKeyOf(now.getFullYear(), now.getMonth());
      if (!prev.lastCheckedMonth || prev.lastCheckedMonth >= currentKey) return prev;
      let [y, m] = prev.lastCheckedMonth.split("-").map(Number);
      m -= 1; // месяц 0-11
      const reports = [...prev.monthlyReports];
      let changed = false;
      while (monthKeyOf(y, m) < currentKey) {
        const exists = reports.some((r) => r.year === y && r.month === m);
        const hasTx = getTransactionsOfMonth(prev.transactions, y, m).length > 0;
        if (!exists && hasTx) {
          reports.push(buildReport(prev.transactions, prev.categories, y, m));
          changed = true;
        }
        m += 1;
        if (m > 11) { m = 0; y += 1; }
      }
      return {
        ...prev,
        monthlyReports: changed ? reports : prev.monthlyReports,
        lastCheckedMonth: currentKey,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --- transactions --- */

  const addTransaction = useCallback(
    (tx: Omit<Transaction, "id" | "createdAt">) => {
      const full: Transaction = { ...tx, id: uuid(), createdAt: new Date().toISOString() };
      setData((prev) => ({ ...prev, transactions: [...prev.transactions, full] }));
      return full;
    },
    []
  );

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    setData((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) => (t.id === id ? { ...t, ...updates, id } : t)),
    }));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id),
    }));
  }, []);

  const adjustBalance = useCallback((actualBalance: number, note?: string) => {
    setData((prev) => {
      const current = getBalance(prev.transactions);
      const diff = Math.round((actualBalance - current) * 100) / 100;
      if (diff === 0) return prev;
      const tx: Transaction = {
        id: uuid(),
        type: diff > 0 ? "income" : "expense",
        amount: Math.abs(diff),
        categoryId: ADJUST_CATEGORY_ID,
        comment: note?.trim() || "Корректировка баланса",
        date: new Date().toISOString(),
        flag: "mandatory",
        createdAt: new Date().toISOString(),
      };
      return { ...prev, transactions: [...prev.transactions, tx] };
    });
  }, []);

  /** Подтверждение оплаты регулярного платежа из напоминания */
  const payReminder = useCallback((templateId: string) => {
    setData((prev) => {
      const template = prev.transactions.find((t) => t.id === templateId);
      if (!template) return prev;
      const now = new Date().toISOString();
      const payment: Transaction = {
        id: uuid(),
        type: "expense",
        amount: template.amount,
        categoryId: template.categoryId,
        comment: template.comment,
        date: now,
        flag: "regular",
        recurrencePeriod: template.recurrencePeriod,
        createdAt: now,
      };
      return {
        ...prev,
        transactions: prev.transactions
          .map((t) => (t.id === templateId ? { ...t, lastPaidAt: now } : t))
          .concat(payment),
      };
    });
  }, []);

  /* --- categories --- */

  const addCategory = useCallback((cat: Omit<Category, "id">) => {
    const full: Category = { ...cat, id: uuid() };
    setData((prev) => ({ ...prev, categories: [...prev.categories, full] }));
    return full;
  }, []);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    if (isSpecialCategoryId(id)) return; // служебные категории неизменяемы
    setData((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === id && !c.isSpecial ? { ...c, ...updates, id } : c
      ),
    }));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    if (isSpecialCategoryId(id)) return; // служебные категории нельзя удалить
    setData((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id || c.isSpecial),
    }));
  }, []);

  /** Перемещение категории вверх/вниз внутри своей группы (доходы/расходы) */
  const moveCategory = useCallback((id: string, direction: -1 | 1) => {
    if (isSpecialCategoryId(id)) return; // служебные категории вне пользовательского порядка
    setData((prev) => {
      const cats = [...prev.categories];
      const idx = cats.findIndex((c) => c.id === id);
      if (idx === -1 || cats[idx].isSpecial) return prev;
      const type = cats[idx].type;
      let j = idx + direction;
      while (j >= 0 && j < cats.length && (cats[j].type !== type || cats[j].isSpecial)) {
        j += direction;
      }
      if (j < 0 || j >= cats.length) return prev;
      [cats[idx], cats[j]] = [cats[j], cats[idx]];
      return { ...prev, categories: cats };
    });
  }, []);

  /* --- debts --- */

  const addDebt = useCallback(
    (debt: { direction: DebtDirection; personName: string; amount: number; comment: string }) => {
      const now = new Date().toISOString();
      const id = uuid();
      const full: Debt = { ...debt, id, createdAt: now, isPaid: false };
      const tx: Transaction = {
        id: uuid(),
        type: debt.direction === "owed_to_me" ? "expense" : "income",
        amount: debt.amount,
        categoryId: DEBT_CATEGORY_ID,
        comment:
          debt.direction === "owed_to_me"
            ? `Дал в долг: ${debt.personName}`
            : `Взял в долг: ${debt.personName}`,
        date: now,
        flag: "mandatory",
        createdAt: now,
        debtId: id,
        debtKind: "open",
      };
      setData((prev) => ({
        ...prev,
        debts: [...prev.debts, full],
        transactions: [...prev.transactions, tx],
      }));
      return full;
    },
    []
  );

  const toggleDebtPaid = useCallback((id: string) => {
    setData((prev) => {
      const debt = prev.debts.find((d) => d.id === id);
      if (!debt) return prev;
      if (!debt.isPaid) {
        const now = new Date().toISOString();
        const tx: Transaction = {
          id: uuid(),
          type: debt.direction === "owed_to_me" ? "income" : "expense",
          amount: debt.amount,
          categoryId: DEBT_CATEGORY_ID,
          comment:
            debt.direction === "owed_to_me"
              ? `Вернули долг: ${debt.personName}`
              : `Вернул долг: ${debt.personName}`,
          date: now,
          flag: "mandatory",
          createdAt: now,
          debtId: id,
          debtKind: "repay",
        };
        return {
          ...prev,
          debts: prev.debts.map((d) => (d.id === id ? { ...d, isPaid: true, paidAt: now } : d)),
          transactions: [...prev.transactions, tx],
        };
      }
      return {
        ...prev,
        debts: prev.debts.map((d) =>
          d.id === id ? { ...d, isPaid: false, paidAt: undefined } : d
        ),
        transactions: prev.transactions.filter(
          (t) => !(t.debtId === id && t.debtKind === "repay")
        ),
      };
    });
  }, []);

  const deleteDebt = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      debts: prev.debts.filter((d) => d.id !== id),
      transactions: prev.transactions.filter((t) => t.debtId !== id),
    }));
  }, []);

  /* --- misc --- */

  const setTheme = useCallback((theme: ThemeMode) => {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, theme } }));
  }, []);

  const closeCurrentMonth = useCallback(() => {
    setData((prev) => {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      if (getTransactionsOfMonth(prev.transactions, y, m).length === 0) return prev;
      const report = buildReport(prev.transactions, prev.categories, y, m);
      return {
        ...prev,
        monthlyReports: [...prev.monthlyReports.filter((r) => !(r.year === y && r.month === m)), report],
      };
    });
  }, []);

  const resetAllData = useCallback(() => {
    setData((prev) => {
      const fresh = defaultData();
      return { ...fresh, settings: { theme: prev.settings.theme } };
    });
  }, []);

  const importData = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json) as Partial<StoredData>;
      if (!Array.isArray(parsed.transactions) || !Array.isArray(parsed.categories)) return false;
      const base = defaultData();
      setData({
        transactions: parsed.transactions,
        categories: parsed.categories.length
          ? ensureSpecialCategories(parsed.categories)
          : base.categories,
        settings: { theme: parsed.settings?.theme === "dark" ? "dark" : "light" },
        monthlyReports: Array.isArray(parsed.monthlyReports) ? parsed.monthlyReports : [],
        lastCheckedMonth: parsed.lastCheckedMonth || base.lastCheckedMonth,
        debts: Array.isArray(parsed.debts) ? parsed.debts : [],
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const exportData = useCallback((): string => JSON.stringify(data, null, 2), [data]);

  const getCategoryById = useCallback(
    (id: string) => data.categories.find((c) => c.id === id),
    [data.categories]
  );

  const getCategoriesByType = useCallback(
    (type: TransactionType) =>
      data.categories.filter(
        (c) => c.type === type && !c.isSpecial && !isSpecialCategoryId(c.id)
      ),
    [data.categories]
  );

  const reminders = useMemo(() => computeReminders(data.transactions), [data.transactions]);
  const balance = useMemo(() => getBalance(data.transactions), [data.transactions]);

  return {
    transactions: data.transactions,
    categories: data.categories,
    settings: data.settings,
    monthlyReports: data.monthlyReports,
    debts: data.debts,
    reminders,
    balance,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    adjustBalance,
    payReminder,
    addCategory,
    updateCategory,
    deleteCategory,
    moveCategory,
    getCategoryById,
    getCategoriesByType,
    addDebt,
    toggleDebtPaid,
    deleteDebt,
    setTheme,
    closeCurrentMonth,
    resetAllData,
    importData,
    exportData,
  };
}

export type Store = ReturnType<typeof useStore>;
