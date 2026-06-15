import { useMemo } from 'react';
import { useAppStore } from '../store/StoreContext';
import { formatCurrency, formatDate, formatPercent, formatMonthYear } from '../utils/format';
import { Wallet, ArrowUpRight, ArrowDownRight, ArrowRight, Bell } from 'lucide-react';
import TransactionItem from './TransactionItem';
import Sparkline from './Sparkline';
import type { Transaction } from '../types';

interface Props {
  onOpenSettings?: () => void;
  onOpenDebts?: () => void;
}

export default function HomeScreen({ onOpenDebts }: Props) {
  const { transactions, monthlyReports, getCategoryById, debts: debtsList } = useAppStore();

  const debtsSummary = useMemo(() => {
    const active = debtsList.filter(d => !d.isPaid);
    const iOwe = active.filter(d => d.direction === 'i_owe').reduce((s, d) => s + d.amount, 0);
    const owedToMe = active.filter(d => d.direction === 'owed_to_me').reduce((s, d) => s + d.amount, 0);
    return { count: active.length, iOwe, owedToMe, net: owedToMe - iOwe };
  }, [debtsList]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const stats = useMemo(() => {
    const balance = transactions.reduce((sum, t) => {
      return sum + (t.type === 'income' ? t.amount : -t.amount);
    }, 0);

    const currentMonthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevMonthTx = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    });

    const currentExpenses = currentMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const currentIncome = currentMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const prevExpenses = prevMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const prevIncome = prevMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

    const expenseDiff = currentExpenses - prevExpenses;
    const expensePercent = prevExpenses > 0 ? ((currentExpenses - prevExpenses) / prevExpenses) * 100 : 0;
    const incomeDiff = currentIncome - prevIncome;
    const incomePercent = prevIncome > 0 ? ((currentIncome - prevIncome) / prevIncome) * 100 : 0;

    const prevMonthReport = monthlyReports.find(r => r.month === prevMonth && r.year === prevYear);
    const monthNamesGenitive = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

    let prevMonthCarryover: number | null = null;
    let prevMonthLabel = '';

    if (prevMonthReport) {
      prevMonthCarryover = prevMonthReport.balance;
      prevMonthLabel = `Остаток за ${monthNamesGenitive[prevMonth]}`;
    } else if (prevMonthTx.length > 0) {
      prevMonthCarryover = prevIncome - prevExpenses;
      prevMonthLabel = `Итог ${monthNamesGenitive[prevMonth]} (не закрыт)`;
    }

    return { balance, currentExpenses, currentIncome, prevExpenses, prevIncome, expenseDiff, expensePercent, incomeDiff, incomePercent, prevMonthCarryover, prevMonthLabel };
  }, [transactions, currentMonth, currentYear, monthlyReports]);

  const sparklineData = useMemo(() => {
    const days = 30;
    const data: number[] = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(23, 59, 59, 999);
      const balanceAtDate = transactions.filter(t => new Date(t.date) <= date).reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
      data.push(balanceAtDate);
    }
    return data;
  }, [transactions]);

  const pendingReminders = useMemo(() => {
    const reminders: { tx: Transaction; daysOverdue: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const regularTx = transactions.filter(t => t.flag === 'regular' && t.recurrencePeriod);
    const latestByCategory = new Map<string, Transaction>();
    for (const tx of regularTx) {
      const existing = latestByCategory.get(tx.categoryId);
      if (!existing || new Date(tx.date) > new Date(existing.date)) latestByCategory.set(tx.categoryId, tx);
    }
    for (const tx of latestByCategory.values()) {
      const lastDate = new Date(tx.date);
      const nextDue = new Date(lastDate);
      switch (tx.recurrencePeriod) {
        case 'daily': nextDue.setDate(nextDue.getDate() + 1); break;
        case 'weekly': nextDue.setDate(nextDue.getDate() + 7); break;
        case 'monthly': nextDue.setMonth(nextDue.getMonth() + 1); break;
        case 'yearly': nextDue.setFullYear(nextDue.getFullYear() + 1); break;
      }
      const daysOverdue = Math.floor((today.getTime() - nextDue.getTime()) / (1000 * 60 * 60 * 24));
      if (daysOverdue >= -3) reminders.push({ tx, daysOverdue });
    }
    return reminders;
  }, [transactions]);

  const groupedTransactions = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const groups: { date: string; items: Transaction[] }[] = [];
    for (const tx of sorted) {
      const dateKey = new Date(tx.date).toDateString();
      const existing = groups.find(g => g.date === dateKey);
      if (existing) existing.items.push(tx);
      else groups.push({ date: dateKey, items: [tx] });
    }
    return groups;
  }, [transactions]);

  const isEmpty = transactions.length === 0;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pb-24">

        {/* Balance */}
        <div className="mx-4 mt-1 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 px-5 py-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Wallet size={18} className="text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Баланс</span>
              </div>
              <div className={`text-4xl font-extrabold tracking-tight ${stats.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                {formatCurrency(stats.balance, true)}
              </div>
            </div>
            {sparklineData.length > 1 && sparklineData.some(v => v !== 0) && (
              <div className="flex flex-col items-end pt-1">
                <span className="text-xs text-gray-400 dark:text-gray-500 mb-1">30д</span>
                <Sparkline data={sparklineData} width={90} height={32} />
              </div>
            )}
          </div>
        </div>

        {/* Reminders */}
        {pendingReminders.length > 0 && (
          <div className="mx-4 mt-3 space-y-2">
            {pendingReminders.slice(0, 2).map((reminder, i) => {
              const cat = getCategoryById(reminder.tx.categoryId);
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20">
                  <Bell size={18} className="text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate block">
                      {cat?.icon} {cat?.name || 'Платёж'} · {formatCurrency(reminder.tx.amount)}
                    </span>
                  </div>
                  {reminder.daysOverdue > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-500 font-semibold">
                      +{reminder.daysOverdue}д
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Previous Month Carryover */}
        {stats.prevMonthCarryover !== null && (
          <div className={`mx-4 mt-3 rounded-2xl px-4 py-3.5 flex items-center gap-3 ${
            stats.prevMonthCarryover >= 0
              ? 'bg-blue-50 dark:bg-blue-950/20'
              : 'bg-orange-50 dark:bg-orange-950/20'
          }`}>
            <span className="text-xl">📦</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 dark:text-gray-400">{stats.prevMonthLabel}</div>
              <div className={`text-lg font-bold ${
                stats.prevMonthCarryover >= 0
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-orange-600 dark:text-orange-400'
              }`}>
                {formatCurrency(stats.prevMonthCarryover, true)}
              </div>
            </div>
            <ArrowRight size={18} className="text-gray-300 dark:text-gray-600" />
          </div>
        )}

        {/* Month Summary */}
        <div className="mx-4 mt-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4">
          <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3 text-center capitalize">
            {formatMonthYear(now)}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white dark:bg-gray-800 p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <ArrowDownRight size={16} className="text-emerald-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Доходы</span>
              </div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(stats.currentIncome)}
              </div>
              {stats.prevIncome > 0 && (
                <div className={`text-xs mt-1 ${stats.incomeDiff >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                  {formatPercent(stats.incomePercent)}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-white dark:bg-gray-800 p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <ArrowUpRight size={16} className="text-red-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Расходы</span>
              </div>
              <div className="text-xl font-bold text-red-500 dark:text-red-400">
                {formatCurrency(stats.currentExpenses)}
              </div>
              {stats.prevExpenses > 0 && (
                <div className={`text-xs mt-1 ${stats.expenseDiff <= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                  {formatPercent(stats.expensePercent)}
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Итого</span>
            <span className={`text-lg font-bold ${(stats.currentIncome - stats.currentExpenses) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              {formatCurrency(stats.currentIncome - stats.currentExpenses, true)}
            </span>
          </div>
        </div>

        {/* Debts Widget */}
        {onOpenDebts && (
          <button
            onClick={onOpenDebts}
            className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-2xl px-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <span className="text-xl">💸</span>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Долги</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                {debtsSummary.count === 0 ? 'Нет активных' : `${debtsSummary.count} активных`}
              </div>
            </div>
            {debtsSummary.count > 0 && (
              <span className={`text-base font-bold ${debtsSummary.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                {formatCurrency(Math.abs(debtsSummary.net), true)}
              </span>
            )}
            <ArrowRight size={18} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
          </button>
        )}

        {/* Transactions */}
        <div className="mx-4 mt-5">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">
            История
          </h3>

          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <Wallet size={28} className="text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-base text-gray-400 dark:text-gray-500 font-medium">
                Пока нет операций
              </p>
              <p className="text-sm text-gray-300 dark:text-gray-600 mt-1">
                Нажмите «+» чтобы добавить
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedTransactions.map(group => (
                <div key={group.date}>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wider">
                    {formatDate(group.items[0].date)}
                  </p>
                  <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/50">
                    {group.items.map(tx => (
                      <TransactionItem key={tx.id} transaction={tx} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
