import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Transaction, Category, AppSettings, ThemeMode, TransactionType, MonthlyReport, TransactionFlag, Debt } from '../types';

const STORAGE_KEY = 'koshelek_app_data';

function createDefaultCategories(): Category[] {
  return [
    { id: 'cat-salary', name: 'Зарплата', icon: '💰', type: 'income', isDefault: true },
    { id: 'cat-freelance', name: 'Фриланс', icon: '💻', type: 'income', isDefault: true },
    { id: 'cat-gift-in', name: 'Подарок', icon: '🎁', type: 'income', isDefault: true },
    { id: 'cat-invest', name: 'Инвестиции', icon: '📈', type: 'income', isDefault: true },
    { id: 'cat-debt-return', name: 'Возврат долга', icon: '💸', type: 'income', isDefault: true },
    { id: 'cat-other-in', name: 'Другое', icon: '📥', type: 'income', isDefault: true },
    { id: 'cat-groceries', name: 'Продукты', icon: '🛒', type: 'expense', isDefault: true },
    { id: 'cat-transport', name: 'Транспорт', icon: '🚌', type: 'expense', isDefault: true },
    { id: 'cat-cafe', name: 'Кафе', icon: '☕', type: 'expense', isDefault: true },
    { id: 'cat-entertainment', name: 'Развлечения', icon: '🎮', type: 'expense', isDefault: true },
    { id: 'cat-health', name: 'Здоровье', icon: '💊', type: 'expense', isDefault: true },
    { id: 'cat-clothes', name: 'Одежда', icon: '👕', type: 'expense', isDefault: true },
    { id: 'cat-housing', name: 'Жильё', icon: '🏠', type: 'expense', isDefault: true },
    { id: 'cat-telecom', name: 'Связь', icon: '📱', type: 'expense', isDefault: true },
    { id: 'cat-subscriptions', name: 'Подписки', icon: '📺', type: 'expense', isDefault: true },
    { id: 'cat-debt-give', name: 'Дал в долг', icon: '💸', type: 'expense', isDefault: true },
    { id: 'cat-other-out', name: 'Другое', icon: '📤', type: 'expense', isDefault: true },
  ];
}

const defaultSettings: AppSettings = {
  theme: 'light',
};

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

interface StoredData {
  transactions: Transaction[];
  categories: Category[];
  settings: AppSettings;
  monthlyReports: MonthlyReport[];
  lastCheckedMonth: string;
  debts: Debt[];
}

function loadFromStorage(): StoredData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        transactions: parsed.transactions || [],
        categories: parsed.categories || createDefaultCategories(),
        settings: { ...defaultSettings, ...parsed.settings },
        monthlyReports: parsed.monthlyReports || [],
        lastCheckedMonth: parsed.lastCheckedMonth || getCurrentMonthKey(),
        debts: parsed.debts || [],
      };
    }
  } catch (e) {
    console.error('Failed to load from storage', e);
  }
  return {
    transactions: [],
    categories: createDefaultCategories(),
    settings: defaultSettings,
    monthlyReports: [],
    lastCheckedMonth: getCurrentMonthKey(),
    debts: [],
  };
}

function saveToStorage(data: StoredData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to storage', e);
  }
}

export function useStore() {
  const [initialData] = useState(() => loadFromStorage());
  const [transactions, setTransactions] = useState<Transaction[]>(initialData.transactions);
  const [categories, setCategories] = useState<Category[]>(initialData.categories);
  const [settings, setSettings] = useState<AppSettings>(initialData.settings);
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReport[]>(initialData.monthlyReports);
  const [lastCheckedMonth, setLastCheckedMonth] = useState<string>(initialData.lastCheckedMonth);
  const monthCheckDone = useRef(false);

  const [debts, setDebts] = useState<Debt[]>(initialData.debts);

  // Save to storage
  useEffect(() => {
    saveToStorage({ transactions, categories, settings, monthlyReports, lastCheckedMonth, debts });
  }, [transactions, categories, settings, monthlyReports, lastCheckedMonth, debts]);

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  // Check for month change and create report + carryover
  useEffect(() => {
    if (monthCheckDone.current) return;
    monthCheckDone.current = true;

    const currentMonthKey = getCurrentMonthKey();
    
    if (lastCheckedMonth && lastCheckedMonth !== currentMonthKey) {
      // Month has changed! Create report for the previous month
      const [prevYearStr, prevMonthStr] = lastCheckedMonth.split('-');
      const prevYear = parseInt(prevYearStr);
      const prevMonth = parseInt(prevMonthStr) - 1; // Convert to 0-indexed

      // Get transactions for the previous month
      const prevMonthTx = transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
      });

      // Calculate totals
      const totalIncome = prevMonthTx
        .filter(t => t.type === 'income')
        .reduce((s, t) => s + t.amount, 0);
      const totalExpenses = prevMonthTx
        .filter(t => t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0);

      // Find previous report to get carryover chain
      const prevReports = monthlyReports.filter(r => {
        const reportDate = new Date(r.year, r.month);
        const prevDate = new Date(prevYear, prevMonth);
        return reportDate < prevDate;
      }).sort((a, b) => {
        const aDate = new Date(a.year, a.month);
        const bDate = new Date(b.year, b.month);
        return bDate.getTime() - aDate.getTime();
      });

      const carryoverFromPrevious = prevReports.length > 0 ? prevReports[0].balance : 0;
      const balance = carryoverFromPrevious + totalIncome - totalExpenses;

      // Calculate category breakdown
      const categoryMap = new Map<string, { total: number; type: TransactionType }>();
      for (const tx of prevMonthTx) {
        const existing = categoryMap.get(tx.categoryId);
        if (existing) {
          existing.total += tx.amount;
        } else {
          categoryMap.set(tx.categoryId, { total: tx.amount, type: tx.type });
        }
      }

      const categoryBreakdown = Array.from(categoryMap.entries()).map(([catId, data]) => {
        const cat = categories.find(c => c.id === catId);
        return {
          categoryId: catId,
          categoryName: cat?.name || 'Без категории',
          categoryIcon: cat?.icon || '📄',
          type: data.type,
          total: data.total,
        };
      });

      // Calculate flag breakdown
      const flagMap = new Map<TransactionFlag, number>();
      for (const tx of prevMonthTx) {
        flagMap.set(tx.flag, (flagMap.get(tx.flag) || 0) + tx.amount);
      }
      const flagBreakdown = Array.from(flagMap.entries()).map(([flag, total]) => ({ flag, total }));

      // Create the report
      const newReport: MonthlyReport = {
        id: uuidv4(),
        month: prevMonth,
        year: prevYear,
        totalIncome,
        totalExpenses,
        balance,
        carryoverFromPrevious,
        closedAt: new Date().toISOString(),
        categoryBreakdown,
        flagBreakdown,
      };

      setMonthlyReports(prev => [newReport, ...prev]);

      // No carryover transaction created — balance is already correct
      // as the sum of all transactions. The carryover is shown visually
      // from the report data, not as a fake income transaction.

      setLastCheckedMonth(currentMonthKey);
    }
  }, [lastCheckedMonth, transactions, categories, monthlyReports]);

  const addTransaction = useCallback((tx: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTx: Transaction = {
      ...tx,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    setTransactions(prev => [newTx, ...prev]);
  }, []);

  const updateTransaction = useCallback((id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const addCategory = useCallback((cat: Omit<Category, 'id'>) => {
    const newCat: Category = { ...cat, id: uuidv4() };
    setCategories(prev => [...prev, newCat]);
  }, []);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  const setTheme = useCallback((theme: ThemeMode) => {
    setSettings(prev => ({ ...prev, theme }));
  }, []);

  const resetAllData = useCallback(() => {
    setTransactions([]);
    setCategories(createDefaultCategories());
    setSettings(defaultSettings);
    setMonthlyReports([]);
    setLastCheckedMonth(getCurrentMonthKey());
    setDebts([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getCategoryById = useCallback((id: string): Category | undefined => {
    return categories.find(c => c.id === id);
  }, [categories]);

  const getCategoriesByType = useCallback((type: TransactionType): Category[] => {
    return categories.filter(c => c.type === type);
  }, [categories]);

  // Manual month close for testing
  const closeCurrentMonth = useCallback(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Check if report already exists for this month
    const existingReport = monthlyReports.find(r => r.month === currentMonth && r.year === currentYear);
    if (existingReport) return;

    const currentMonthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalIncome = currentMonthTx
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    const totalExpenses = currentMonthTx
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);

    const lastReport = monthlyReports.length > 0 ? monthlyReports[0] : null;
    const carryoverFromPrevious = lastReport ? lastReport.balance : 0;
    const balance = carryoverFromPrevious + totalIncome - totalExpenses;

    const categoryMap = new Map<string, { total: number; type: TransactionType }>();
    for (const tx of currentMonthTx) {
      const existing = categoryMap.get(tx.categoryId);
      if (existing) {
        existing.total += tx.amount;
      } else {
        categoryMap.set(tx.categoryId, { total: tx.amount, type: tx.type });
      }
    }

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([catId, data]) => {
      const cat = categories.find(c => c.id === catId);
      return {
        categoryId: catId,
        categoryName: cat?.name || 'Без категории',
        categoryIcon: cat?.icon || '📄',
        type: data.type,
        total: data.total,
      };
    });

    const flagMap = new Map<TransactionFlag, number>();
    for (const tx of currentMonthTx) {
      flagMap.set(tx.flag, (flagMap.get(tx.flag) || 0) + tx.amount);
    }
    const flagBreakdown = Array.from(flagMap.entries()).map(([flag, total]) => ({ flag, total }));

    const newReport: MonthlyReport = {
      id: uuidv4(),
      month: currentMonth,
      year: currentYear,
      totalIncome,
      totalExpenses,
      balance,
      carryoverFromPrevious,
      closedAt: new Date().toISOString(),
      categoryBreakdown,
      flagBreakdown,
    };

    setMonthlyReports(prev => [newReport, ...prev]);
  }, [transactions, categories, monthlyReports]);

  // Debt management — creates transactions to move balance
  const addDebt = useCallback((debt: Omit<Debt, 'id' | 'createdAt' | 'isPaid'>) => {
    const debtId = uuidv4();
    const newDebt: Debt = {
      ...debt,
      id: debtId,
      createdAt: new Date().toISOString(),
      isPaid: false,
    };
    setDebts(prev => [newDebt, ...prev]);

    // Create transaction:
    // "owed_to_me" (I gave money) → expense (balance decreases)
    // "i_owe" (I received money) → income (balance increases)
    const txType = debt.direction === 'owed_to_me' ? 'expense' : 'income';
    const catId = debt.direction === 'owed_to_me' ? 'cat-debt-give' : 'cat-debt-return';
    const comment = debt.direction === 'owed_to_me'
      ? `Дал в долг: ${debt.personName}`
      : `Взял в долг: ${debt.personName}`;

    const tx: Transaction = {
      id: `debt-tx-${debtId}`,
      type: txType,
      amount: debt.amount,
      categoryId: catId,
      comment: debt.comment ? `${comment} — ${debt.comment}` : comment,
      date: new Date().toISOString(),
      flag: 'planned',
      createdAt: new Date().toISOString(),
    };
    setTransactions(prev => [tx, ...prev]);
  }, []);

  const toggleDebtPaid = useCallback((id: string) => {
    setDebts(prev => {
      const debt = prev.find(d => d.id === id);
      if (!debt) return prev;

      const wasPaid = debt.isPaid;
      const nowPaid = !wasPaid;

      if (nowPaid) {
        // Debt settled → reverse transaction
        // "owed_to_me" was expense → now income (money returned)
        // "i_owe" was income → now expense (money paid back)
        const txType = debt.direction === 'owed_to_me' ? 'income' : 'expense';
        const catId = debt.direction === 'owed_to_me' ? 'cat-debt-return' : 'cat-debt-give';
        const comment = debt.direction === 'owed_to_me'
          ? `Вернул долг: ${debt.personName}`
          : `Отдал долг: ${debt.personName}`;

        const tx: Transaction = {
          id: `debt-paid-${id}-${Date.now()}`,
          type: txType,
          amount: debt.amount,
          categoryId: catId,
          comment,
          date: new Date().toISOString(),
          flag: 'planned',
          createdAt: new Date().toISOString(),
        };
        setTransactions(p => [tx, ...p]);
      } else {
        // Unpaid — remove the paid-back transaction
        setTransactions(p => p.filter(t => !t.id.startsWith(`debt-paid-${id}-`)));
      }

      return prev.map(d =>
        d.id === id
          ? { ...d, isPaid: nowPaid, paidAt: nowPaid ? new Date().toISOString() : undefined }
          : d
      );
    });
  }, []);

  const deleteDebt = useCallback((id: string) => {
    // Remove debt and its transactions
    setDebts(prev => prev.filter(d => d.id !== id));
    setTransactions(prev => prev.filter(t =>
      t.id !== `debt-tx-${id}` && !t.id.startsWith(`debt-paid-${id}-`)
    ));
  }, []);

  return {
    transactions,
    categories,
    settings,
    monthlyReports,
    debts,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    updateCategory,
    deleteCategory,
    setTheme,
    resetAllData,
    getCategoryById,
    getCategoriesByType,
    closeCurrentMonth,
    addDebt,
    toggleDebtPaid,
    deleteDebt,
  };
}


