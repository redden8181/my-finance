import { useState, useMemo } from 'react';
import { useAppStore } from '../store/StoreContext';
import { X, Check, ChevronDown, Zap, Calculator } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import NumberPad from './NumberPad';
import type { TransactionType, TransactionFlag, RecurrencePeriod } from '../types';

// Try to evaluate simple math expression safely
function tryEvaluateExpression(expr: string): number | null {
  // Only allow digits, basic operators, dots, parentheses
  if (!/^[\d+\-*/().\s]+$/.test(expr)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + expr + ')')();
    if (typeof result === 'number' && isFinite(result)) {
      return Math.max(0, Math.round(result * 100) / 100);
    }
  } catch {
    return null;
  }
  return null;
}

interface Props {
  onClose: () => void;
}

const flagLabels: Record<TransactionFlag, string> = {
  mandatory: 'Обязательная',
  spontaneous: 'Спонтанная',
  planned: 'Запланированная',
  regular: 'Регулярная',
};

const flagIcons: Record<TransactionFlag, string> = {
  mandatory: '⚠️',
  spontaneous: '⚡',
  planned: '📋',
  regular: '🔄',
};

const periodLabels: Record<RecurrencePeriod, string> = {
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
  yearly: 'Ежегодно',
};

interface QuickAction {
  categoryId: string;
  categoryIcon: string;
  categoryName: string;
  amount: number;
  count: number;
}

export default function AddTransactionScreen({ onClose }: Props) {
  const { addTransaction, addCategory, getCategoriesByType, transactions, getCategoryById } = useAppStore();

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [comment, setComment] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [flag, setFlag] = useState<TransactionFlag>('planned');
  const [recurrencePeriod, setRecurrencePeriod] = useState<RecurrencePeriod>('monthly');
  const [showCategories, setShowCategories] = useState(false);
  const [evaluatedAmount, setEvaluatedAmount] = useState<number | null>(null);
  const [showNumberPad, setShowNumberPad] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📁');

  const categories = useMemo(() => getCategoriesByType(type), [type, getCategoriesByType]);
  const selectedCategory = categories.find(c => c.id === categoryId);

  // Calculate quick actions from transaction history
  const quickActions = useMemo(() => {
    // Group by category + rounded amount
    const actionMap = new Map<string, QuickAction>();
    
    const recentTx = transactions
      .filter(t => t.type === type)
      .slice(0, 100); // Last 100 transactions of this type

    for (const tx of recentTx) {
      const cat = getCategoryById(tx.categoryId);
      if (!cat) continue;

      // Round amount to nice numbers for quick actions
      let roundedAmount = tx.amount;
      if (tx.amount < 100) {
        roundedAmount = Math.round(tx.amount / 10) * 10;
      } else if (tx.amount < 1000) {
        roundedAmount = Math.round(tx.amount / 50) * 50;
      } else {
        roundedAmount = Math.round(tx.amount / 100) * 100;
      }

      const key = `${tx.categoryId}-${roundedAmount}`;
      const existing = actionMap.get(key);
      
      if (existing) {
        existing.count++;
      } else {
        actionMap.set(key, {
          categoryId: tx.categoryId,
          categoryIcon: cat.icon,
          categoryName: cat.name,
          amount: roundedAmount,
          count: 1,
        });
      }
    }

    // Sort by frequency and take top 6
    return Array.from(actionMap.values())
      .filter(a => a.count >= 2) // Only show if used at least twice
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [transactions, type, getCategoryById]);

  const finalAmount = evaluatedAmount !== null && amount ? evaluatedAmount : parseFloat(amount || '0');
  const canSave = finalAmount > 0 && categoryId;

  const handleSave = () => {
    if (!canSave) return;
    addTransaction({
      type,
      amount: finalAmount,
      categoryId,
      comment,
      date: new Date(date).toISOString(),
      flag,
      recurrencePeriod: flag === 'regular' ? recurrencePeriod : undefined,
    });
    onClose();
  };

  const handleQuickAction = (action: QuickAction) => {
    addTransaction({
      type,
      amount: action.amount,
      categoryId: action.categoryId,
      comment: '',
      date: new Date().toISOString(),
      flag: 'planned',
    });
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="safe-top" />
      <div className="flex items-center justify-between px-4 pt-1.5 pb-1.5 border-b border-gray-100 dark:border-gray-800">
        <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
          <X size={20} />
        </button>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Новая операция</h2>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            canSave
              ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
              : 'text-gray-300 dark:text-gray-600'
          }`}
        >
          <Check size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Type Switcher */}
        <div className="mx-4 mt-3">
          <div className="flex bg-gray-100 dark:bg-gray-900 rounded-xl p-1">
            <button
              onClick={() => { setType('expense'); setCategoryId(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                type === 'expense'
                  ? 'bg-white dark:bg-gray-800 text-red-500 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Расход
            </button>
            <button
              onClick={() => { setType('income'); setCategoryId(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                type === 'income'
                  ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Доход
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        {quickActions.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-1.5 px-4 mb-2">
              <Zap size={12} className="text-amber-500" />
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Быстрые действия
              </span>
            </div>
            <div className="flex gap-2 px-4 overflow-x-auto pb-2 scrollbar-hide">
              {quickActions.map((action, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickAction(action)}
                  className="flex-shrink-0 flex items-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-100 dark:border-amber-900/30 hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-950/50 dark:hover:to-orange-950/40 transition-all active:scale-95"
                >
                  <span className="text-base">{action.categoryIcon}</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {formatCurrency(action.amount)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Amount */}
        <div className="mx-4 mt-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Сумма
            </label>
            <button
              onClick={() => setShowNumberPad(!showNumberPad)}
              className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showNumberPad ? (
                <>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Ввод
                </>
              ) : (
                <>
                  <Calculator size={12} />
                  Калькулятор
                </>
              )}
            </button>
          </div>

          {showNumberPad ? (
            <div>
              <div className="relative min-h-[44px] flex items-center justify-end py-2">
                <div className="w-full text-3xl font-bold bg-transparent border-none outline-none text-gray-800 dark:text-gray-100 placeholder-gray-200 dark:text-right">
                  {amount || <span className="text-gray-200 dark:text-gray-700">0</span>}
                </div>
                <span className="text-2xl text-gray-300 dark:text-gray-600 font-medium ml-1">
                  ₽
                </span>
              </div>
              {evaluatedAmount !== null && amount && (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-2 text-right">
                  = {formatCurrency(evaluatedAmount)}
                </div>
              )}
              <div className="h-px bg-gray-100 dark:bg-gray-800" />

              {/* Number Pad */}
              <div className="mt-3">
                <NumberPad value={amount} onChange={(v) => {
                  setAmount(v);
                  setEvaluatedAmount(tryEvaluateExpression(v));
                }} />
              </div>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={e => {
                  setAmount(e.target.value);
                  setEvaluatedAmount(tryEvaluateExpression(e.target.value));
                }}
                placeholder="Например: 1500+300"
                className="w-full text-3xl font-bold bg-transparent border-none outline-none text-gray-800 dark:text-gray-100 placeholder-gray-200 dark:placeholder-gray-700 py-2"
              />
              <span className="absolute right-0 top-1/2 -translate-y-1/2 text-2xl text-gray-300 dark:text-gray-600 font-medium">
                ₽
              </span>
              {evaluatedAmount !== null && amount && (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  = {formatCurrency(evaluatedAmount)}
                </div>
              )}
              <div className="h-px bg-gray-100 dark:bg-gray-800 mt-1" />
            </div>
          )}
        </div>

        {/* Category */}
        <div className="mx-4 mt-5">
          <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Категория
          </label>
          <button
            onClick={() => setShowCategories(!showCategories)}
            className="w-full mt-2 flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800"
          >
            <div className="flex items-center gap-2.5">
              {selectedCategory ? (
                <>
                  <span className="text-lg">{selectedCategory.icon}</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{selectedCategory.name}</span>
                </>
              ) : (
                <span className="text-sm text-gray-400 dark:text-gray-500">Выберите категорию</span>
              )}
            </div>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${showCategories ? 'rotate-180' : ''}`} />
          </button>

          {showCategories && (
            <div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setCategoryId(cat.id); setShowCategories(false); }}
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border transition-all ${
                      categoryId === cat.id
                        ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30'
                        : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/60 hover:border-gray-200 dark:hover:border-gray-700'
                    }`}
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate w-full text-center">{cat.name}</span>
                  </button>
                ))}
                {/* Add button — same style as category tiles */}
                <button
                  onClick={() => setShowAddCat(true)}
                  className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all"
                >
                  <span className="text-xl text-gray-400 dark:text-gray-500">＋</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">Создать</span>
                </button>
              </div>

              {/* Inline add form */}
              {showAddCat && (
                <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={newCatIcon}
                      onChange={e => { const c = [...e.target.value]; setNewCatIcon(c[c.length - 1] || '📁'); }}
                      className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 text-center text-xl outline-none"
                      style={{ caretColor: 'transparent' }}
                    />
                    <input
                      type="text"
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      placeholder="Название"
                      className="flex-1 py-2 px-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 outline-none"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowAddCat(false); setNewCatName(''); setNewCatIcon('📁'); }} className="flex-1 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300">
                      Отмена
                    </button>
                    <button
                      onClick={() => {
                        if (!newCatName.trim()) return;
                        addCategory({ name: newCatName.trim(), icon: newCatIcon, type });
                        setNewCatName('');
                        setNewCatIcon('📁');
                        setShowAddCat(false);
                      }}
                      disabled={!newCatName.trim()}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium ${newCatName.trim() ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-400'}`}
                    >
                      Добавить
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Comment */}
        <div className="mx-4 mt-5">
          <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Комментарий
          </label>
          <input
            type="text"
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Необязательно"
            className="w-full mt-2 py-3 text-sm bg-transparent border-b border-gray-100 dark:border-gray-800 outline-none text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600"
          />
        </div>

        {/* Date */}
        <div className="mx-4 mt-5">
          <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Дата
          </label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full mt-2 py-3 text-sm bg-transparent border-b border-gray-100 dark:border-gray-800 outline-none text-gray-800 dark:text-gray-200"
          />
        </div>

        {/* Flags */}
        <div className="mx-4 mt-5 mb-4">
          <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Тип операции
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(Object.keys(flagLabels) as TransactionFlag[]).map(f => (
              <button
                key={f}
                onClick={() => setFlag(f)}
                className={`flex items-center gap-2 py-2.5 px-3 rounded-xl border text-left transition-all ${
                  flag === f
                    ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/60'
                }`}
              >
                <span className="text-base">{flagIcons[f]}</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{flagLabels[f]}</span>
              </button>
            ))}
          </div>

          {/* Recurrence Period */}
          {flag === 'regular' && (
            <div className="mt-3">
              <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Период
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(periodLabels) as RecurrencePeriod[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setRecurrencePeriod(p)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                      recurrencePeriod === p
                        ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                        : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/60 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {periodLabels[p]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={`w-full py-3.5 rounded-2xl text-sm font-semibold transition-all ${
            canSave
              ? type === 'expense'
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600'
          }`}
        >
          {type === 'expense' ? 'Добавить расход' : 'Добавить доход'}
        </button>
      </div>
    </div>
  );
}
