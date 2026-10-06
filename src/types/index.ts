export type TransactionType = "income" | "expense";
export type TransactionFlag = "mandatory" | "spontaneous" | "planned" | "regular";
export type RecurrencePeriod = "daily" | "weekly" | "monthly" | "yearly";
export type DebtDirection = "i_owe" | "owed_to_me";
export type ThemeMode = "light" | "dark";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  comment: string;
  date: string; // ISO string
  flag: TransactionFlag;
  recurrencePeriod?: RecurrencePeriod;
  createdAt: string;
  dueDay?: number; // 1-31, день ежемесячного платежа
  lastPaidAt?: string; // когда подтверждена оплата цикла
  debtId?: string; // связь с долгом
  debtKind?: "open" | "repay";
}

export interface Category {
  id: string;
  name: string;
  icon: string; // эмодзи
  type: TransactionType;
  isDefault?: boolean;
  isSpecial?: boolean; // служебные (корректировка, долги) — скрыты из выбора
}

export interface Debt {
  id: string;
  direction: DebtDirection;
  personName: string;
  amount: number;
  comment: string;
  createdAt: string;
  isPaid: boolean;
  paidAt?: string;
}

/**
 * Разовая запланированная трата.
 * Баланс не меняет: это только напоминание отложить деньги.
 * Расход создаётся в момент подтверждения.
 */
export interface PlannedExpense {
  id: string;
  title: string;
  amount: number;
  categoryId: string;
  dueDate: string; // ISO — когда планируется потратить
  createdAt: string;
}

export interface MonthlyReport {
  id: string;
  month: number; // 0-11
  year: number;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  carryoverFromPrevious: number;
  closedAt: string;
  categoryBreakdown: {
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    type: TransactionType;
    total: number;
  }[];
  flagBreakdown: { flag: TransactionFlag; total: number }[];
}

export interface StoredData {
  transactions: Transaction[];
  categories: Category[];
  settings: { theme: ThemeMode };
  monthlyReports: MonthlyReport[];
  lastCheckedMonth: string; // "YYYY-MM"
  debts: Debt[];
  plannedExpenses: PlannedExpense[];
}
