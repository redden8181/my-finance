import { useMemo, useState } from 'react';
import { useAppStore } from '../store/StoreContext';
import { formatCurrency } from '../utils/format';
import { FileText, TrendingUp, TrendingDown, ChevronRight, Calendar } from 'lucide-react';
import type { MonthlyReport } from '../types';

const monthNames = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const flagLabels: Record<string, string> = {
  mandatory: 'Обязательные',
  spontaneous: 'Спонтанные',
  planned: 'Запланированные',
  regular: 'Регулярные',
};

const flagIcons: Record<string, string> = {
  mandatory: '⚠️',
  spontaneous: '⚡',
  planned: '📋',
  regular: '🔄',
};

interface Props {
  onClose: () => void;
}

export default function ReportsScreen({ onClose }: Props) {
  const { monthlyReports, transactions, getCategoryById, closeCurrentMonth } = useAppStore();
  const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(null);
  const [showCloseMonthConfirm, setShowCloseMonthConfirm] = useState(false);

  // Current month live stats
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const currentMonthStats = useMemo(() => {
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

    // Get carryover from last report
    const lastReport = monthlyReports.length > 0 ? monthlyReports[0] : null;
    const carryover = lastReport ? lastReport.balance : 0;

    const projectedBalance = carryover + totalIncome - totalExpenses;

    // Category breakdown
    const categoryMap = new Map<string, { total: number; type: 'income' | 'expense' }>();
    for (const tx of currentMonthTx) {
      const existing = categoryMap.get(tx.categoryId);
      if (existing) {
        existing.total += tx.amount;
      } else {
        categoryMap.set(tx.categoryId, { total: tx.amount, type: tx.type });
      }
    }

    const expenseCategories = Array.from(categoryMap.entries())
      .filter(([_, data]) => data.type === 'expense')
      .map(([catId, data]) => {
        const cat = getCategoryById(catId);
        return {
          categoryId: catId,
          categoryName: cat?.name || 'Без категории',
          categoryIcon: cat?.icon || '📄',
          total: data.total,
        };
      })
      .sort((a, b) => b.total - a.total);

    // Flag breakdown for expenses
    const flagMap = new Map<string, number>();
    for (const tx of currentMonthTx.filter(t => t.type === 'expense')) {
      flagMap.set(tx.flag, (flagMap.get(tx.flag) || 0) + tx.amount);
    }

    // Days left in month
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysLeft = lastDay - now.getDate();
    const daysPassed = now.getDate();

    // Daily spending rate
    const dailyRate = daysPassed > 0 ? totalExpenses / daysPassed : 0;
    const projectedMonthlyExpenses = dailyRate * lastDay;

    // Savings rate
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    // Compare with last month
    const prevReport = monthlyReports[0];
    const prevExpenses = prevReport ? prevReport.totalExpenses : 0;
    const prevIncome = prevReport ? prevReport.totalIncome : 0;
    
    const expenseChange = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : 0;
    const incomeChange = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0;

    return {
      totalIncome,
      totalExpenses,
      carryover,
      projectedBalance,
      expenseCategories,
      flagMap,
      daysLeft,
      daysPassed,
      dailyRate,
      projectedMonthlyExpenses,
      savingsRate,
      transactionCount: currentMonthTx.length,
      expenseChange,
      incomeChange,
      hasPrevMonth: !!prevReport,
    };
  }, [transactions, currentMonth, currentYear, monthlyReports, getCategoryById]);

  const currentHasReport = monthlyReports.some(r => r.month === currentMonth && r.year === currentYear);

  if (selectedReport) {
    return (
      <div className="absolute inset-0 z-50 bg-gray-50 dark:bg-gray-950 flex flex-col">
        <div className="safe-top" />
        <div className="flex items-center gap-3 px-4 pt-1.5 pb-1.5 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setSelectedReport(null)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            {monthNames[selectedReport.month]} {selectedReport.year}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto pb-6">
          {/* Summary Cards */}
          <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-900/30">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={14} className="text-emerald-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Доходы</span>
              </div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(selectedReport.totalIncome)}
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-950/30 rounded-2xl p-4 border border-red-100 dark:border-red-900/30">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown size={14} className="text-red-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Расходы</span>
              </div>
              <div className="text-lg font-bold text-red-500 dark:text-red-400">
                -{formatCurrency(selectedReport.totalExpenses)}
              </div>
            </div>
          </div>

          {/* Balance Flow */}
          <div className="mx-4 mt-4 bg-white dark:bg-gray-900/60 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Движение средств</h3>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">Остаток с прошлого месяца</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {formatCurrency(selectedReport.carryoverFromPrevious)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">+ Доходы</span>
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(selectedReport.totalIncome)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">- Расходы</span>
                <span className="text-sm font-medium text-red-500 dark:text-red-400">
                  -{formatCurrency(selectedReport.totalExpenses)}
                </span>
              </div>
              <div className="h-px bg-gray-100 dark:bg-gray-800 my-2" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Перенесено на след. месяц
                </span>
                <span className={`text-base font-bold ${selectedReport.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                  {formatCurrency(selectedReport.balance)}
                </span>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          {selectedReport.categoryBreakdown.length > 0 && (
            <div className="mx-4 mt-4 bg-white dark:bg-gray-900/60 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">По категориям</h3>
              <div className="space-y-2">
                {selectedReport.categoryBreakdown
                  .sort((a, b) => b.total - a.total)
                  .map((cat, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-sm">{cat.categoryIcon}</span>
                      <span className="flex-1 text-sm text-gray-600 dark:text-gray-400 truncate">{cat.categoryName}</span>
                      <span className={`text-sm font-medium ${cat.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                        {cat.type === 'income' ? '+' : '-'}{formatCurrency(cat.total)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Flag Breakdown */}
          {selectedReport.flagBreakdown.length > 0 && (
            <div className="mx-4 mt-4 bg-white dark:bg-gray-900/60 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">По типу операций</h3>
              <div className="grid grid-cols-2 gap-2">
                {selectedReport.flagBreakdown.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <span className="text-sm">{flagIcons[item.flag]}</span>
                    <div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">{flagLabels[item.flag]}</div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {formatCurrency(item.total)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 bg-gray-50 dark:bg-gray-950 flex flex-col">
      <div className="safe-top" />
      <div className="flex items-center gap-3 px-4 pt-1.5 pb-1.5 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Финансовые отчёты</h2>
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        {/* Current Month Live Report */}
        <div className="mx-4 mt-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Текущий месяц
            </span>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-pink-950/20 rounded-2xl p-4 border border-indigo-100/50 dark:border-indigo-900/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                {monthNames[currentMonth]} {currentYear}
              </h3>
              <span className="text-xs bg-white/60 dark:bg-gray-800/60 px-2 py-1 rounded-full text-gray-500 dark:text-gray-400">
                {currentMonthStats.daysLeft} {getDaysWord(currentMonthStats.daysLeft)} осталось
              </span>
            </div>

            {/* Main Balance */}
            <div className="text-center py-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Текущий баланс</div>
              <div className={`text-3xl font-bold ${currentMonthStats.projectedBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                {formatCurrency(currentMonthStats.projectedBalance)}
              </div>
            </div>

            {/* Income/Expense Row */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-white/50 dark:bg-gray-900/30 rounded-xl p-3">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp size={12} className="text-emerald-500" />
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Доходы</span>
                </div>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(currentMonthStats.totalIncome)}
                </div>
                {currentMonthStats.hasPrevMonth && currentMonthStats.incomeChange !== 0 && (
                  <div className={`text-[10px] mt-0.5 ${currentMonthStats.incomeChange >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                    {currentMonthStats.incomeChange >= 0 ? '↑' : '↓'} {Math.abs(currentMonthStats.incomeChange).toFixed(0)}% vs пр. мес.
                  </div>
                )}
              </div>
              <div className="bg-white/50 dark:bg-gray-900/30 rounded-xl p-3">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingDown size={12} className="text-red-500" />
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Расходы</span>
                </div>
                <div className="text-base font-bold text-red-500 dark:text-red-400">
                  -{formatCurrency(currentMonthStats.totalExpenses)}
                </div>
                {currentMonthStats.hasPrevMonth && currentMonthStats.expenseChange !== 0 && (
                  <div className={`text-[10px] mt-0.5 ${currentMonthStats.expenseChange <= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                    {currentMonthStats.expenseChange >= 0 ? '↑' : '↓'} {Math.abs(currentMonthStats.expenseChange).toFixed(0)}% vs пр. мес.
                  </div>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-white/40 dark:bg-gray-900/20 rounded-lg p-2 text-center">
                <div className="text-[10px] text-gray-400 dark:text-gray-500">Операций</div>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {currentMonthStats.transactionCount}
                </div>
              </div>
              <div className="bg-white/40 dark:bg-gray-900/20 rounded-lg p-2 text-center">
                <div className="text-[10px] text-gray-400 dark:text-gray-500">В день</div>
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {formatCurrency(currentMonthStats.dailyRate)}
                </div>
              </div>
              <div className="bg-white/40 dark:bg-gray-900/20 rounded-lg p-2 text-center">
                <div className="text-[10px] text-gray-400 dark:text-gray-500">Экономия</div>
                <div className={`text-sm font-semibold ${currentMonthStats.savingsRate >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                  {currentMonthStats.savingsRate.toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Top Expenses */}
            {currentMonthStats.expenseCategories.length > 0 && (
              <div className="mt-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Топ расходов</div>
                <div className="space-y-1.5">
                  {currentMonthStats.expenseCategories.slice(0, 3).map((cat, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white/40 dark:bg-gray-900/20 rounded-lg px-2.5 py-1.5">
                      <span className="text-sm">{cat.categoryIcon}</span>
                      <span className="flex-1 text-xs text-gray-600 dark:text-gray-400 truncate">{cat.categoryName}</span>
                      <span className="text-xs font-semibold text-red-500 dark:text-red-400">
                        {formatCurrency(cat.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projection */}
            {currentMonthStats.daysPassed > 3 && (
              <div className="mt-4 pt-3 border-t border-white/30 dark:border-gray-800/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Прогноз расходов за месяц</span>
                  <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                    ~{formatCurrency(currentMonthStats.projectedMonthlyExpenses)}
                  </span>
                </div>
              </div>
            )}

            {/* Financial Health Indicator */}
            <div className="mt-4 pt-3 border-t border-white/30 dark:border-gray-800/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Финансовое здоровье</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  currentMonthStats.savingsRate >= 20
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                    : currentMonthStats.savingsRate >= 0
                    ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400'
                    : 'bg-red-100 dark:bg-red-900/40 text-red-500 dark:text-red-400'
                }`}>
                  {currentMonthStats.savingsRate >= 20 ? '💪 Отлично' : currentMonthStats.savingsRate >= 0 ? '🤔 Норма' : '⚠️ Осторожно'}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    currentMonthStats.savingsRate >= 20
                      ? 'bg-emerald-500'
                      : currentMonthStats.savingsRate >= 0
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, currentMonthStats.savingsRate + 50))}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px] text-gray-400 dark:text-gray-500">-50%</span>
                <span className="text-[9px] text-gray-400 dark:text-gray-500">0%</span>
                <span className="text-[9px] text-gray-400 dark:text-gray-500">+50%</span>
              </div>
            </div>

            {/* Close Month Button (for demo) */}
            {!currentHasReport && (
              <div className="mt-4 pt-3 border-t border-white/30 dark:border-gray-800/30">
                {!showCloseMonthConfirm ? (
                  <button
                    onClick={() => setShowCloseMonthConfirm(true)}
                    className="w-full py-2.5 rounded-xl bg-white/60 dark:bg-gray-800/60 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors"
                  >
                    📊 Закрыть месяц и создать отчёт
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                      Закрыть месяц? Это создаст финальный отчёт.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowCloseMonthConfirm(false)}
                        className="flex-1 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={() => {
                          closeCurrentMonth();
                          setShowCloseMonthConfirm(false);
                        }}
                        className="flex-1 py-2 rounded-lg bg-indigo-500 text-sm font-medium text-white"
                      >
                        Закрыть
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Past Reports */}
        <div className="mx-4 mt-6">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            История отчётов
          </span>

          {monthlyReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                <FileText size={24} className="text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-gray-400 dark:text-gray-500 text-sm">Пока нет завершённых месяцев</p>
              <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">
                Отчёты появятся автоматически 1-го числа
              </p>
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              {monthlyReports.map(report => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="w-full bg-white dark:bg-gray-900/60 rounded-xl p-4 border border-gray-100 dark:border-gray-800 flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center">
                    <Calendar size={18} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {monthNames[report.month]} {report.year}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(report.totalIncome)}
                      </span>
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                      <span className="text-xs text-red-500 dark:text-red-400">
                        -{formatCurrency(report.totalExpenses)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${report.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                      {formatCurrency(report.balance)}
                    </div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500">остаток</div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChevronLeft({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function getDaysWord(n: number): string {
  const lastTwo = Math.abs(n) % 100;
  const lastOne = lastTwo % 10;
  if (lastTwo >= 11 && lastTwo <= 19) return 'дней';
  if (lastOne === 1) return 'день';
  if (lastOne >= 2 && lastOne <= 4) return 'дня';
  return 'дней';
}
