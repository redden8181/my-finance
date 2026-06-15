import { useMemo, useState } from 'react';
import { useAppStore } from '../store/StoreContext';
import { formatCurrency, formatMonthYear } from '../utils/format';
import { ChevronLeft, ChevronRight, PieChart, FileText } from 'lucide-react';
import ReportsScreen from './ReportsScreen';
import type { TransactionType } from '../types';

export default function AnalyticsScreen() {
  const [showReports, setShowReports] = useState(false);
  const { transactions, getCategoryById } = useAppStore();

  const [monthOffset, setMonthOffset] = useState(0);
  const [viewType, setViewType] = useState<TransactionType>('expense');

  const targetDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const targetMonth = targetDate.getMonth();
  const targetYear = targetDate.getFullYear();

  const monthTransactions = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear && t.type === viewType;
    });
  }, [transactions, targetMonth, targetYear, viewType]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of monthTransactions) {
      map.set(tx.categoryId, (map.get(tx.categoryId) || 0) + tx.amount);
    }
    const entries = Array.from(map.entries())
      .map(([catId, total]) => ({
        categoryId: catId,
        category: getCategoryById(catId),
        total,
      }))
      .sort((a, b) => b.total - a.total);

    const grandTotal = entries.reduce((s, e) => s + e.total, 0);
    return { entries, grandTotal };
  }, [monthTransactions, getCategoryById]);

  const colors = [
    'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500',
    'bg-pink-500', 'bg-cyan-500', 'bg-yellow-500', 'bg-red-500',
    'bg-indigo-500', 'bg-teal-500', 'bg-lime-500', 'bg-rose-500',
  ];

  const colorValues = [
    '#10b981', '#3b82f6', '#a855f7', '#f97316',
    '#ec4899', '#06b6d4', '#eab308', '#ef4444',
    '#6366f1', '#14b8a6', '#84cc16', '#f43f5e',
  ];

  const isEmpty = monthTransactions.length === 0;

  if (showReports) {
    return <ReportsScreen onClose={() => setShowReports(false)} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Reports button */}
      <div className="flex-shrink-0 px-4 pt-1 pb-1 flex justify-end">
        <button
          onClick={() => setShowReports(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium hover:from-indigo-200 hover:to-purple-200 dark:hover:from-indigo-900/60 dark:hover:to-purple-900/50 transition-colors"
        >
          <FileText size={13} />
          Отчёты
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-20">
        {/* Month Selector */}
        <div className="mx-4 flex items-center justify-between py-2">
          <button
            onClick={() => setMonthOffset(prev => prev - 1)}
            className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
            {formatMonthYear(targetDate)}
          </span>
          <button
            onClick={() => setMonthOffset(prev => Math.min(prev + 1, 0))}
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

        {/* Type Switcher */}
        <div className="mx-4 mt-1.5">
          <div className="flex bg-gray-100 dark:bg-gray-900 rounded-xl p-1">
            <button
              onClick={() => setViewType('expense')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                viewType === 'expense'
                  ? 'bg-white dark:bg-gray-800 text-red-500 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Расходы
            </button>
            <button
              onClick={() => setViewType('income')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                viewType === 'income'
                  ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Доходы
            </button>
          </div>
        </div>

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <PieChart size={28} className="text-gray-300 dark:text-gray-600" />
            </div>
            <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">
              Нет данных за этот месяц
            </p>
            <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">
              Добавьте операции, чтобы увидеть аналитику
            </p>
          </div>
        ) : (
          <>
            {/* Total */}
            <div className="mx-4 mt-4 text-center">
              <div className={`text-2xl font-bold ${
                viewType === 'expense' ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {formatCurrency(categoryBreakdown.grandTotal)}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Всего за месяц
              </p>
            </div>

            {/* Donut Chart */}
            <div className="mx-4 mt-4 flex justify-center">
              <div className="relative w-44 h-44">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  {(() => {
                    let cumulative = 0;
                    return categoryBreakdown.entries.map((entry, i) => {
                      const percent = entry.total / categoryBreakdown.grandTotal;
                      const dashArray = percent * 282.74;
                      const dashOffset = -cumulative * 282.74;
                      cumulative += percent;
                      return (
                        <circle
                          key={entry.categoryId}
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke={colorValues[i % colorValues.length]}
                          strokeWidth="10"
                          strokeDasharray={`${dashArray} ${282.74 - dashArray}`}
                          strokeDashoffset={dashOffset}
                          strokeLinecap="round"
                          className="transition-all duration-500"
                        />
                      );
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {categoryBreakdown.entries.length}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {categoryBreakdown.entries.length === 1 ? 'категория' :
                     categoryBreakdown.entries.length < 5 ? 'категории' : 'категорий'}
                  </span>
                </div>
              </div>
            </div>

            {/* Category List */}
            <div className="mx-4 mt-4">
              <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden divide-y divide-gray-50 dark:divide-gray-800/50">
                {categoryBreakdown.entries.map((entry, i) => {
                  const percent = ((entry.total / categoryBreakdown.grandTotal) * 100).toFixed(1);
                  return (
                    <div key={entry.categoryId} className="flex items-center gap-3 px-4 py-3">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors[i % colors.length]}`} />
                      <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-sm flex-shrink-0">
                        {entry.category?.icon || '📄'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                          {entry.category?.name || 'Без категории'}
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${colors[i % colors.length]}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {formatCurrency(entry.total)}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {percent}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Flag Breakdown */}
            <div className="mx-4 mt-4 mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">По типу операции</h3>
              <div className="bg-white dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { flag: 'mandatory' as const, label: 'Обязательные', icon: '⚠️' },
                    { flag: 'spontaneous' as const, label: 'Спонтанные', icon: '⚡' },
                    { flag: 'planned' as const, label: 'Запланированные', icon: '📋' },
                    { flag: 'regular' as const, label: 'Регулярные', icon: '🔄' },
                  ].map(({ flag, label, icon }) => {
                    const total = monthTransactions
                      .filter(t => t.flag === flag)
                      .reduce((s, t) => s + t.amount, 0);
                    return (
                      <div key={flag} className="flex items-center gap-2 py-1">
                        <span className="text-sm">{icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{label}</div>
                          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            {formatCurrency(total)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
