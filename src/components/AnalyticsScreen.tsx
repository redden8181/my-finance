import { useMemo, useState } from 'react';
import { useAppStore } from '../store/StoreContext';
import { formatCurrency, formatMonthYear, formatDate } from '../utils/format';
import { ChevronLeft, ChevronRight, PieChart, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import ReportsScreen from './ReportsScreen';
import TransactionItem from './TransactionItem';
import type { Transaction } from '../types';

type ViewMode = 'all' | 'expense' | 'income';

const EXPENSE_COLORS = ['#ef4444', '#f97316', '#f43f5e', '#ec4899', '#e11d48', '#fb923c', '#dc2626', '#c026d3'];
const INCOME_COLORS = ['#10b981', '#14b8a6', '#22c55e', '#06b6d4', '#059669', '#34d399', '#0d9488', '#84cc16'];

export default function AnalyticsScreen() {
  const [showReports, setShowReports] = useState(false);
  const { transactions, getCategoryById } = useAppStore();

  const [monthOffset, setMonthOffset] = useState(0);
  const [mode, setMode] = useState<ViewMode>('all');

  const targetDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const targetMonth = targetDate.getMonth();
  const targetYear = targetDate.getFullYear();

  /* All transactions of the selected month */
  const monthTx = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });
  }, [transactions, targetMonth, targetYear]);

  const totals = useMemo(() => {
    const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, net: income - expense, sum: income + expense };
  }, [monthTx]);

  /* Category breakdown for current mode */
  const breakdown = useMemo(() => {
    const relevant =
      mode === 'all' ? monthTx : monthTx.filter(t => t.type === mode);

    const map = new Map<string, { total: number; type: 'income' | 'expense' }>();
    for (const tx of relevant) {
      const cur = map.get(tx.categoryId);
      if (cur) cur.total += tx.amount;
      else map.set(tx.categoryId, { total: tx.amount, type: tx.type });
    }

    const entries = Array.from(map.entries())
      .map(([catId, d]) => ({
        categoryId: catId,
        category: getCategoryById(catId),
        total: d.total,
        type: d.type,
      }))
      .sort((a, b) => b.total - a.total);

    // Assign colors: red palette for expenses, green for income
    let ei = 0;
    let ii = 0;
    const withColor = entries.map(e => {
      const color =
        e.type === 'expense'
          ? EXPENSE_COLORS[ei++ % EXPENSE_COLORS.length]
          : INCOME_COLORS[ii++ % INCOME_COLORS.length];
      return { ...e, color };
    });

    const grandTotal = withColor.reduce((s, e) => s + e.total, 0);
    return { entries: withColor, grandTotal };
  }, [monthTx, mode, getCategoryById]);

  /* Transactions list for current mode, grouped by day */
  const groupedTx = useMemo(() => {
    const relevant =
      mode === 'all' ? monthTx : monthTx.filter(t => t.type === mode);
    const sorted = [...relevant].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const groups: { date: string; items: Transaction[] }[] = [];
    for (const tx of sorted) {
      const key = new Date(tx.date).toDateString();
      const g = groups.find(x => x.date === key);
      if (g) g.items.push(tx);
      else groups.push({ date: key, items: [tx] });
    }
    return groups;
  }, [monthTx, mode]);

  const isEmpty = breakdown.entries.length === 0;

  if (showReports) {
    return <ReportsScreen onClose={() => setShowReports(false)} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Reports button */}
      <div className="flex-shrink-0 px-4 pt-1 pb-1 flex justify-end">
        <button
          onClick={() => setShowReports(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium transition-colors"
        >
          <FileText size={13} />
          Отчёты
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* ─── 1. MONTH SELECTOR ─── */}
        <div className="mx-4 flex items-center justify-between py-2">
          <button
            onClick={() => setMonthOffset(p => p - 1)}
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">
            {formatMonthYear(targetDate)}
          </span>
          <button
            onClick={() => setMonthOffset(p => Math.min(p + 1, 0))}
            disabled={monthOffset >= 0}
            className={`w-9 h-9 rounded-full flex items-center justify-center ${
              monthOffset >= 0
                ? 'bg-gray-50 dark:bg-gray-900 text-gray-200 dark:text-gray-700'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            }`}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* ─── 2. OVERVIEW: income vs expense ─── */}
        <div className="mx-4 mt-1 rounded-2xl bg-gray-50 dark:bg-gray-800/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <TrendingUp size={14} className="text-emerald-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Доходы</span>
              </div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(totals.income)}
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-xs text-gray-500 dark:text-gray-400">Расходы</span>
                <TrendingDown size={14} className="text-red-500" />
              </div>
              <div className="text-lg font-bold text-red-500 dark:text-red-400 mt-0.5">
                {formatCurrency(totals.expense)}
              </div>
            </div>
          </div>

          {/* Proportion bar */}
          {totals.sum > 0 && (
            <div className="flex h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${(totals.income / totals.sum) * 100}%` }}
              />
              <div
                className="bg-red-500 transition-all duration-500"
                style={{ width: `${(totals.expense / totals.sum) * 100}%` }}
              />
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">Итого за месяц</span>
            <span className={`text-base font-bold ${
              totals.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
            }`}>
              {formatCurrency(totals.net, true)}
            </span>
          </div>
        </div>

        {/* ─── 3. MODE SWITCHER ─── */}
        <div className="mx-4 mt-4">
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            {([
              { key: 'all', label: 'Все' },
              { key: 'expense', label: 'Расходы' },
              { key: 'income', label: 'Доходы' },
            ] as { key: ViewMode; label: string }[]).map(m => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  mode === m.key
                    ? m.key === 'expense'
                      ? 'bg-white dark:bg-gray-700 text-red-500 shadow-sm'
                      : m.key === 'income'
                      ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <PieChart size={28} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-base text-gray-400 dark:text-gray-500 font-medium">
              Нет данных за этот месяц
            </p>
            <p className="text-sm text-gray-300 dark:text-gray-600 mt-1">
              Добавьте операции, чтобы увидеть аналитику
            </p>
          </div>
        ) : (
          <>
            {/* ─── 4. DONUT CHART ─── */}
            <div className="mx-4 mt-4 flex justify-center">
              <div className="relative w-48 h-48">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {(() => {
                    const C = 2 * Math.PI * 42;

                    // "All" mode → two segments: income vs expense
                    if (mode === 'all') {
                      const base = totals.income + totals.expense;
                      if (base === 0) return null;
                      const incPct = totals.income / base;
                      const expPct = totals.expense / base;
                      return (
                        <>
                          <circle
                            cx="50" cy="50" r="42" fill="none"
                            stroke="#10b981" strokeWidth="12"
                            strokeDasharray={`${incPct * C} ${C - incPct * C}`}
                            strokeDashoffset={0}
                            className="transition-all duration-500"
                          />
                          <circle
                            cx="50" cy="50" r="42" fill="none"
                            stroke="#ef4444" strokeWidth="12"
                            strokeDasharray={`${expPct * C} ${C - expPct * C}`}
                            strokeDashoffset={-incPct * C}
                            className="transition-all duration-500"
                          />
                        </>
                      );
                    }

                    // Single type → by categories
                    let cumulative = 0;
                    return breakdown.entries.map(entry => {
                      const pct = entry.total / breakdown.grandTotal;
                      const dash = pct * C;
                      const offset = -cumulative * C;
                      cumulative += pct;
                      return (
                        <circle
                          key={entry.categoryId}
                          cx="50" cy="50" r="42" fill="none"
                          stroke={entry.color}
                          strokeWidth="12"
                          strokeDasharray={`${dash} ${C - dash}`}
                          strokeDashoffset={offset}
                          className="transition-all duration-500"
                        />
                      );
                    });
                  })()}
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  {mode === 'all' ? (
                    <>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">Итого</span>
                      <span className={`text-xl font-extrabold ${
                        totals.net >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-500 dark:text-red-400'
                      }`}>
                        {formatCurrency(totals.net, true)}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {totals.net >= 0 ? 'накоплено' : 'перерасход'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {mode === 'expense' ? 'Расходы' : 'Доходы'}
                      </span>
                      <span className="text-lg font-extrabold text-gray-800 dark:text-gray-100">
                        {formatCurrency(breakdown.grandTotal)}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {breakdown.entries.length} кат.
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Legend for "all" mode */}
            {mode === 'all' && (
              <div className="mx-4 mt-3 flex items-center justify-center gap-5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Доходы {totals.income + totals.expense > 0
                      ? `${Math.round((totals.income / (totals.income + totals.expense)) * 100)}%`
                      : '0%'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Расходы {totals.income + totals.expense > 0
                      ? `${Math.round((totals.expense / (totals.income + totals.expense)) * 100)}%`
                      : '0%'}
                  </span>
                </div>
              </div>
            )}

            {/* ─── 5. CATEGORY LIST ─── */}
            <div className="mx-4 mt-4">
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/50 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/50">
                {breakdown.entries.map(entry => {
                  // Percentage within its own group (income or expense),
                  // so numbers stay meaningful in "all" mode
                  const groupTotal =
                    mode === 'all'
                      ? entry.type === 'income' ? totals.income : totals.expense
                      : breakdown.grandTotal;
                  const pct = groupTotal > 0
                    ? ((entry.total / groupTotal) * 100).toFixed(1)
                    : '0.0';
                  return (
                    <div key={entry.categoryId} className="flex items-center gap-3 px-4 py-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <div className="w-9 h-9 rounded-xl bg-white dark:bg-gray-700 flex items-center justify-center text-base flex-shrink-0">
                        {entry.category?.icon || '📄'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {entry.category?.name || 'Без категории'}
                          </span>
                          {mode === 'all' && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                              entry.type === 'income'
                                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                                : 'bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400'
                            }`}>
                              {entry.type === 'income' ? 'доход' : 'расход'}
                            </span>
                          )}
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: entry.color }}
                          />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`text-sm font-bold ${
                          entry.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-500 dark:text-red-400'
                        }`}>
                          {formatCurrency(entry.total)}
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">{pct}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ─── 6. TRANSACTIONS FOR THIS MONTH ─── */}
            <div className="mx-4 mt-5">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">
                Операции
              </h3>
              <div className="space-y-4">
                {groupedTx.map(group => (
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}
