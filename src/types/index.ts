export type TransactionType = 'income' | 'expense';

export type TransactionFlag = 'mandatory' | 'spontaneous' | 'planned' | 'regular';

export type RecurrencePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Category {
  id: string;
  name: string;
  icon: string;
  type: TransactionType;
  isDefault?: boolean;
}

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
}

export type ThemeMode = 'light' | 'dark';

export interface AppSettings {
  theme: ThemeMode;
}

export type DebtDirection = 'i_owe' | 'owed_to_me';

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

export interface MonthlyReport {
  id: string;
  month: number; // 0-11
  year: number;
  totalIncome: number;
  totalExpenses: number;
  balance: number; // remaining for next month
  carryoverFromPrevious: number;
  closedAt: string; // ISO string when the month was closed
  categoryBreakdown: {
    categoryId: string;
    categoryName: string;
    categoryIcon: string;
    type: TransactionType;
    total: number;
  }[];
  flagBreakdown: {
    flag: TransactionFlag;
    total: number;
  }[];
}

export interface AppState {
  transactions: Transaction[];
  categories: Category[];
  settings: AppSettings;
  monthlyReports: MonthlyReport[];
  lastCheckedMonth: string; // "YYYY-MM" format
}
