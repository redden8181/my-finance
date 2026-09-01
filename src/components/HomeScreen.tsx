import { useMemo } from 'react';
import { useAppStore } from '../store/StoreContext';
import { formatCurrency, formatDate, formatMonthYear } from '../utils/format';
import { Wallet, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import TransactionItem from './TransactionItem';
import Sparkline from './Sparkline';
import ReminderCard, { type ReminderInfo } from './ReminderCard';
import type { Transaction } from '../types';

interface Props {
  onOpenSettings?: () => void;
  onOpenDebts?: () => void;
}

export default function HomeScreen({ onOpenDebts }: Props) {
  const { transactions, monthlyReports, debts: debtsList } = useAppStore();

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
    const balance = transactions.reduce(
      (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount),
      0
    );

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

    const prevMonthReport = monthlyReports.find(r => r.month === prevMonth && r.year === prevYear);
    const monthNamesGenitive = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

    let prevMonthCarryover: number | null = null;
    let prevMonthLabel = '';

    if (prevMonthReport) {
      prevMonthCarryover = prevMonthReport.balance;
      prevMonthLabel = `Остаток за ${monthNamesGenitive[prevMonth]}`;
    } else if (prevMonthTx.length > 0) {
      prevMonthCarryover = prevIncome - prevExpenses;
      prevMonthLabel = `Итог ${monthNamesGenitive[prevMonth]}`;
    }

    return {
      balance,
      currentExpenses,
      currentIncome,
      monthNet: currentIncome - currentExpenses,
      prevMonthCarryover,
      prevMonthLabel,
    };
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
      const bal = transactions
        .filter(t => new Date(t.date) <= date)
        .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);
      data.push(bal);
    }
    return data;
  }, [transactions]);

  /* Reminders: monthly recurring payments with dueDay, within 10 days */
  const reminders = useMemo(() => {
    const list: ReminderInfo[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const templates = transactions.filter(
      t => t.flag === 'regular' && t.recurrencePeriod === 'monthly' && t.dueDay
    );

    for (const tx of templates) {
      const day = tx.dueDay as number;

      // This month's due date (clamped to month length)
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      let dueDate = new Date(currentYear, currentMonth, Math.min(day, daysInMonth));
      dueDate.setHours(0, 0, 0, 0);

      // If already paid this cycle → look at next month
      if (tx.lastPaidAt) {
        const paid = new Date(tx.lastPaidAt);
        paid.setHours(0, 0, 0, 0);
        if (paid >= dueDate) {
          const nm = currentMonth === 11 ? 0 : currentMonth + 1;
          const ny = currentMonth === 11 ? currentYear + 1 : currentYear;
          const dim = new Date(ny, nm + 1, 0).getDate();
          dueDate = new Date(ny, nm, Math.min(day, dim));
          dueDate.setHours(0, 0, 0, 0);
        }
      }

      const daysLeft = Math.round((dueDate.getTime() - today.getTime()) / 86400000);

      // Show within 10 days ahead, or if overdue
      if (daysLeft <= 10) {
        list.push({ tx, daysLeft, dueDate });
      }
    }

    return list.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [transactions, currentMonth, currentYear]);

  const groupedTransactions = useMemo(() => {
    const sorted = [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
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

        {/* ─── 1. BALANCE (bigger, with month info inside) ─── */}
        <div className="mx-4 mt-1 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 px-5 py-6">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2">
              <Wallet size={18} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Баланс</span>
            </div>
            {sparklineData.length > 1 && sparklineData.some(v => v !== 0) && (
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">30 дней</span>
                <Sparkline data={sparklineData} width={80} height={26} />
              </div>
            )}
          </div>

          {/* Big number */}
          <div className={`text-5xl font-extrabold tracking-tighter leading-none ${
            stats.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
          }`}>
            {formatCurrency(stats.balance, true)}
          </div>

          {/* Divider */}
          <div className="h-px bg-emerald-200/60 dark:bg-emerald-800/40 my-4" />

          {/* Month summary inside balance card */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 capitalize">
                {formatMonthYear(now)}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <TrendingUp size={13} />
                  {formatCurrency(stats.currentIncome)}
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-red-500 dark:text-red-400">
                  <TrendingDown size={13} />
                  {formatCurrency(stats.currentExpenses)}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-gray-500 dark:text-gray-400">Итого</div>
              <div className={`text-base font-bold ${
                stats.monthNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
              }`}>
                {formatCurrency(stats.monthNet, true)}
              </div>
            </div>
          </div>

          {/* Carryover from last month */}
          {stats.prevMonthCarryover !== null && (
            <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-xl bg-white/60 dark:bg-gray-900/30">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                📦 {stats.prevMonthLabel}
              </span>
              <span className={`text-xs font-bold ${
                stats.prevMonthCarryover >= 0
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-orange-600 dark:text-orange-400'
              }`}>
                {formatCurrency(stats.prevMonthCarryover, true)}
              </span>
            </div>
          )}
        </div>

        {/* ─── 2. REMINDERS ─── */}
        {reminders.length > 0 && (
          <div className="mx-4 mt-4 space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
              Напоминания
            </h3>
            {reminders.map(r => (
              <ReminderCard key={r.tx.id} reminder={r} />
            ))}
          </div>
        )}

        {/* ─── 3. DEBTS ─── */}
        {onOpenDebts && (
          <button
            onClick={onOpenDebts}
            className="mx-4 mt-4 w-[calc(100%-2rem)] rounded-2xl px-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <span className="text-xl">💸</span>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">Долги</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                {debtsSummary.count === 0 ? 'Нет активных' : `${debtsSummary.count} активных`}
              </div>
            </div>
            {debtsSummary.count > 0 && (
              <span className={`text-base font-bold ${
                debtsSummary.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
              }`}>
                {formatCurrency(Math.abs(debtsSummary.net), true)}
              </span>
            )}
            <ArrowRight size={18} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
          </button>
        )}

        {/* ─── 4. HISTORY ─── */}
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
