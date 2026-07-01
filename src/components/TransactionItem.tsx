import { useState } from 'react';
import { useAppStore } from '../store/StoreContext';
import { formatCurrency } from '../utils/format';
import type { Transaction, TransactionFlag, RecurrencePeriod } from '../types';

interface Props {
  transaction: Transaction;
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

const displayFlagIcons: Record<string, string> = {
  mandatory: '⚠️',
  spontaneous: '⚡',
  regular: '🔄',
};

export default function TransactionItem({ transaction: tx }: Props) {
  const { getCategoryById } = useAppStore();
  const [showActions, setShowActions] = useState(false);

  const cat = getCategoryById(tx.categoryId);

  return (
    <>
      <div
        onClick={() => setShowActions(true)}
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-gray-100 dark:active:bg-gray-700 transition-colors bg-white dark:bg-gray-800"
      >
        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg flex-shrink-0">
          {cat?.icon || '📄'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
              {cat?.name || 'Без категории'}
            </span>
            {tx.flag && displayFlagIcons[tx.flag] && (
              <span className="text-xs">{displayFlagIcons[tx.flag]}</span>
            )}
          </div>
          {tx.comment && (
            <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{tx.comment}</div>
          )}
        </div>
        <div className={`text-base font-bold flex-shrink-0 ${
          tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
        }`}>
          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
        </div>
      </div>

      {showActions && (
        <TransactionActionSheet transaction={tx} onClose={() => setShowActions(false)} />
      )}
    </>
  );
}

function TransactionActionSheet({ transaction: tx, onClose }: { transaction: Transaction; onClose: () => void }) {
  const { deleteTransaction, updateTransaction, getCategoryById, getCategoriesByType, addCategory } = useAppStore();
  const [mode, setMode] = useState<'actions' | 'edit'>('actions');

  const cat = getCategoryById(tx.categoryId);
  const [amount, setAmount] = useState(String(tx.amount));
  const [categoryId, setCategoryId] = useState(tx.categoryId);
  const [comment, setComment] = useState(tx.comment);
  const [date, setDate] = useState(tx.date.split('T')[0]);
  const [flag, setFlag] = useState<TransactionFlag>(tx.flag);
  const [recurrencePeriod, setRecurrencePeriod] = useState<RecurrencePeriod>(tx.recurrencePeriod || 'monthly');
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📁');

  const categories = getCategoriesByType(tx.type);

  const handleSave = () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0 || !categoryId) return;
    updateTransaction(tx.id, {
      amount: parsed,
      categoryId,
      comment,
      date: new Date(date).toISOString(),
      flag,
      recurrencePeriod: flag === 'regular' ? recurrencePeriod : undefined,
    });
    onClose();
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    addCategory({ name: newCatName.trim(), icon: newCatIcon, type: tx.type });
    setNewCatName('');
    setNewCatIcon('📁');
    setShowAddCat(false);
    // Auto-select won't work since we don't know the new id from addCategory
    // But it will appear in the list immediately
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-[430px] bg-white dark:bg-gray-800 rounded-t-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {mode === 'actions' ? (
          <div className="px-5 pb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl">
                {cat?.icon || '📄'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-semibold text-gray-800 dark:text-gray-200">{cat?.name || 'Без категории'}</div>
                {tx.comment && <div className="text-sm text-gray-400 truncate">{tx.comment}</div>}
              </div>
              <div className={`text-lg font-bold ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
              </div>
            </div>
            <button onClick={() => setMode('edit')} className="w-full py-3.5 rounded-2xl bg-gray-100 dark:bg-gray-700 text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
              ✏️ Редактировать
            </button>
            <button onClick={() => { deleteTransaction(tx.id); onClose(); }} className="w-full py-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 text-sm font-semibold text-red-500">
              🗑 Удалить
            </button>
          </div>
        ) : (
          <div className="px-5 pb-8 max-h-[75vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-4">Редактирование</h3>

            {/* Amount */}
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Сумма</label>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full mt-1 mb-4 py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-700 text-xl font-bold text-gray-800 dark:text-gray-200 outline-none"
            />

            {/* Category */}
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Категория</label>
            <div className="mt-1 mb-4 grid grid-cols-4 gap-2">
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl text-center transition-all ${
                    categoryId === c.id ? 'bg-emerald-100 dark:bg-emerald-900/40 ring-2 ring-emerald-400' : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  <span className="text-lg">{c.icon}</span>
                  <span className="text-[10px] text-gray-600 dark:text-gray-400 truncate w-full">{c.name}</span>
                </button>
              ))}
              {/* Add tile */}
              <button
                onClick={() => setShowAddCat(true)}
                className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all"
              >
                <span className="text-lg text-gray-400 dark:text-gray-500">＋</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">Создать</span>
              </button>
            </div>

            {showAddCat && (
              <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-600">
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
                  <button onClick={() => setShowAddCat(false)} className="flex-1 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300">Отмена</button>
                  <button
                    onClick={handleAddCategory}
                    disabled={!newCatName.trim()}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium ${newCatName.trim() ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-400'}`}
                  >Добавить</button>
                </div>
              </div>
            )}

            {/* Flag */}
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Тип операции</label>
            <div className="mt-1 mb-4 grid grid-cols-2 gap-2">
              {(Object.keys(flagLabels) as TransactionFlag[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFlag(f)}
                  className={`flex items-center gap-2 py-2.5 px-3 rounded-xl transition-all ${
                    flag === f ? 'bg-emerald-100 dark:bg-emerald-900/40 ring-2 ring-emerald-400' : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  <span className="text-sm">{flagIcons[f]}</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{flagLabels[f]}</span>
                </button>
              ))}
            </div>

            {/* Recurrence Period */}
            {flag === 'regular' && (
              <>
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Период</label>
                <div className="mt-1 mb-4 flex flex-wrap gap-2">
                  {(Object.keys(periodLabels) as RecurrencePeriod[]).map(p => (
                    <button
                      key={p}
                      onClick={() => setRecurrencePeriod(p)}
                      className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                        recurrencePeriod === p ? 'bg-emerald-100 dark:bg-emerald-900/40 ring-2 ring-emerald-400 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >{periodLabels[p]}</button>
                  ))}
                </div>
              </>
            )}

            {/* Comment */}
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Комментарий</label>
            <input type="text" value={comment} onChange={e => setComment(e.target.value)} placeholder="Необязательно"
              className="w-full mt-1 mb-4 py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 outline-none" />

            {/* Date */}
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Дата</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full mt-1 mb-5 py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 outline-none" />

            <button onClick={handleSave} className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white text-sm font-semibold mb-2">Сохранить</button>
            <button onClick={() => setMode('actions')} className="w-full py-3.5 rounded-2xl bg-gray-100 dark:bg-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400">Отмена</button>
          </div>
        )}
      </div>
    </div>
  );
}
