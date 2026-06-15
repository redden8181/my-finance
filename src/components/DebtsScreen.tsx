import { useState, useMemo } from 'react';
import { useAppStore } from '../store/StoreContext';
import { ArrowLeft, Plus, Check, Trash2, User, ChevronDown } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import NumberPad from './NumberPad';
import type { Debt, DebtDirection } from '../types';

interface Props {
  onClose: () => void;
}

// Try to evaluate simple math expression safely
function tryEvaluateExpression(expr: string): number | null {
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

export default function DebtsScreen({ onClose }: Props) {
  const { debts, addDebt, toggleDebtPaid, deleteDebt } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [direction, setDirection] = useState<DebtDirection>('i_owe');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [evaluatedAmount, setEvaluatedAmount] = useState<number | null>(null);
  const [showNumberPad, setShowNumberPad] = useState(false);
  const [filter, setFilter] = useState<'active' | 'all'>('active');

  const filteredDebts = useMemo(() => {
    const sorted = [...debts].sort((a, b) => {
      // Active first
      if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    if (filter === 'active') {
      return sorted.filter(d => !d.isPaid);
    }
    return sorted;
  }, [debts, filter]);

  const totals = useMemo(() => {
    const active = debts.filter(d => !d.isPaid);
    const iOwe = active.filter(d => d.direction === 'i_owe').reduce((s, d) => s + d.amount, 0);
    const owedToMe = active.filter(d => d.direction === 'owed_to_me').reduce((s, d) => s + d.amount, 0);
    return { iOwe, owedToMe, net: owedToMe - iOwe };
  }, [debts]);

  const finalAmount = evaluatedAmount !== null && amount ? evaluatedAmount : parseFloat(amount || '0');
  const canSave = finalAmount > 0 && personName.trim();

  const handleSave = () => {
    if (!canSave) return;
    addDebt({
      direction,
      personName: personName.trim(),
      amount: finalAmount,
      comment: comment.trim(),
    });
    setDirection('i_owe');
    setPersonName('');
    setAmount('');
    setComment('');
    setShowAdd(false);
    setShowNumberPad(false);
  };

  return (
    <div className="absolute inset-0 z-50 bg-gray-50 dark:bg-gray-950 flex flex-col">
      <div className="safe-top" />
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-1.5 pb-1.5 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex-1">Долги</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            showAdd
              ? 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
          }`}
        >
          {showAdd ? <ChevronDown size={20} /> : <Plus size={20} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Summary */}
        {!showAdd && (
          <div className="mx-4 mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/20 border border-red-100 dark:border-red-900/30">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base">📤</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Я должен</span>
              </div>
              <div className="text-base font-bold text-red-500 dark:text-red-400">
                {formatCurrency(totals.iOwe)}
              </div>
            </div>
            <div className="rounded-2xl p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-900/30">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base">📥</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Мне должны</span>
              </div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totals.owedToMe)}
              </div>
            </div>
          </div>
        )}

        {/* Add form */}
        {showAdd && (
          <div className="mx-4 mt-4">
            <div className="bg-white dark:bg-gray-900/60 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
              {/* Direction */}
              <div className="flex bg-gray-100 dark:bg-gray-900 rounded-xl p-1 mb-4">
                <button
                  onClick={() => setDirection('i_owe')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    direction === 'i_owe'
                      ? 'bg-white dark:bg-gray-800 text-red-500 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Я должен
                </button>
                <button
                  onClick={() => setDirection('owed_to_me')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    direction === 'owed_to_me'
                      ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Мне должны
                </button>
              </div>

              {/* Person Name */}
              <div className="mb-3">
                <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Имя
                </label>
                <input
                  type="text"
                  value={personName}
                  onChange={e => setPersonName(e.target.value)}
                  placeholder="Например: Вася"
                  className="w-full mt-1 py-2 px-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-200 outline-none"
                  autoFocus
                />
              </div>

              {/* Amount */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    Сумма
                  </label>
                  <button
                    onClick={() => setShowNumberPad(!showNumberPad)}
                    className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600"
                  >
                    {showNumberPad ? 'Ввод' : 'Клавиатура'}
                  </button>
                </div>
                {showNumberPad ? (
                  <div>
                    <div className="relative min-h-[40px] flex items-center justify-end py-2">
                      <div className="w-full text-2xl font-bold text-right text-gray-800 dark:text-gray-100">
                        {amount || <span className="text-gray-200 dark:text-gray-700">0</span>}
                      </div>
                      <span className="text-xl text-gray-300 dark:text-gray-600 font-medium ml-1">₽</span>
                    </div>
                    {evaluatedAmount !== null && amount && (
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 text-right mb-2">
                        = {formatCurrency(evaluatedAmount)}
                      </div>
                    )}
                    <div className="h-px bg-gray-100 dark:bg-gray-800 mb-2" />
                    <NumberPad value={amount} onChange={(v) => {
                      setAmount(v);
                      setEvaluatedAmount(tryEvaluateExpression(v));
                    }} />
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
                      placeholder="0"
                      className="w-full py-2 px-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-2xl font-bold text-gray-800 dark:text-gray-200 outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xl text-gray-300 dark:text-gray-600">₽</span>
                    {evaluatedAmount !== null && amount && (
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 px-1">
                        = {formatCurrency(evaluatedAmount)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Comment */}
              <div className="mb-3">
                <label className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Комментарий
                </label>
                <input
                  type="text"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Необязательно"
                  className="w-full mt-1 py-2 px-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-200 outline-none"
                />
              </div>

              <button
                onClick={handleSave}
                disabled={!canSave}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                  canSave
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600'
                }`}
              >
                Добавить
              </button>
            </div>
          </div>
        )}

        {/* Filter */}
        {!showAdd && debts.length > 0 && (
          <div className="mx-4 mt-4 flex gap-2">
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === 'active'
                  ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}
            >
              Активные
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === 'all'
                  ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}
            >
              Все
            </button>
          </div>
        )}

        {/* List */}
        <div className="mx-4 mt-3 mb-4">
          {!showAdd && debts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <User size={28} className="text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">
                Нет долгов
              </p>
              <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">
                Нажмите «+» чтобы добавить
              </p>
            </div>
          ) : !showAdd && filteredDebts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-3">
                <Check size={20} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                Все долги погашены 🎉
              </p>
            </div>
          ) : !showAdd ? (
            <div className="space-y-2">
              {filteredDebts.map(debt => (
                <DebtItem
                  key={debt.id}
                  debt={debt}
                  onToggle={() => toggleDebtPaid(debt.id)}
                  onDelete={() => deleteDebt(debt.id)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DebtItem({ debt, onToggle, onDelete }: { debt: Debt; onToggle: () => void; onDelete: () => void }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
      debt.isPaid
        ? 'bg-gray-50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800 opacity-60'
        : debt.direction === 'i_owe'
        ? 'bg-white dark:bg-gray-900/60 border-gray-100 dark:border-gray-800'
        : 'bg-white dark:bg-gray-900/60 border-gray-100 dark:border-gray-800'
    }`}>
      <button
        onClick={onToggle}
        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
          debt.isPaid
            ? 'bg-emerald-100 dark:bg-emerald-900/40'
            : 'border-2 border-gray-200 dark:border-gray-700 hover:border-emerald-400'
        }`}
      >
        {debt.isPaid && <Check size={16} className="text-emerald-600 dark:text-emerald-400" />}
      </button>

      <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-lg flex-shrink-0">
        {debt.direction === 'i_owe' ? '📤' : '📥'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-medium truncate ${
            debt.isPaid ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'
          }`}>
            {debt.personName}
          </span>
        </div>
        {debt.comment && (
          <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
            {debt.comment}
          </div>
        )}
      </div>

      <div className={`text-sm font-semibold flex-shrink-0 ${
        debt.isPaid
          ? 'text-gray-400 dark:text-gray-500 line-through'
          : debt.direction === 'i_owe'
          ? 'text-red-500 dark:text-red-400'
          : 'text-emerald-600 dark:text-emerald-400'
      }`}>
        {debt.direction === 'i_owe' ? '-' : '+'}{formatCurrency(debt.amount)}
      </div>

      <button
        onClick={onDelete}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex-shrink-0"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
