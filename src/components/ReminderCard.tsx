import { useState } from 'react';
import { useAppStore } from '../store/StoreContext';
import { formatCurrency } from '../utils/format';
import { Bell, Check, X } from 'lucide-react';
import type { Transaction } from '../types';

export interface ReminderInfo {
  tx: Transaction;
  daysLeft: number; // negative = overdue
  dueDate: Date;
}

/** green (safe) → amber (soon) → red (urgent/overdue) */
function getUrgency(daysLeft: number) {
  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= 2) return 'urgent';
  if (daysLeft <= 5) return 'soon';
  return 'safe';
}

const styles = {
  safe: {
    wrap: 'bg-emerald-50 dark:bg-emerald-950/25 border-emerald-200/60 dark:border-emerald-900/40',
    icon: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400',
    bar: 'bg-emerald-500',
  },
  soon: {
    wrap: 'bg-amber-50 dark:bg-amber-950/25 border-amber-200/60 dark:border-amber-900/40',
    icon: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    bar: 'bg-amber-500',
  },
  urgent: {
    wrap: 'bg-orange-50 dark:bg-orange-950/25 border-orange-200/60 dark:border-orange-900/40',
    icon: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400',
    badge: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
    bar: 'bg-orange-500',
  },
  overdue: {
    wrap: 'bg-red-50 dark:bg-red-950/25 border-red-200/60 dark:border-red-900/40',
    icon: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
    badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
    bar: 'bg-red-500',
  },
} as const;

function dayWord(n: number) {
  const l2 = Math.abs(n) % 100;
  const l1 = l2 % 10;
  if (l2 >= 11 && l2 <= 19) return 'дней';
  if (l1 === 1) return 'день';
  if (l1 >= 2 && l1 <= 4) return 'дня';
  return 'дней';
}

export default function ReminderCard({ reminder }: { reminder: ReminderInfo }) {
  const { getCategoryById } = useAppStore();
  const [showConfirm, setShowConfirm] = useState(false);

  const { tx, daysLeft, dueDate } = reminder;
  const cat = getCategoryById(tx.categoryId);
  const urgency = getUrgency(daysLeft);
  const s = styles[urgency];

  // progress: 10 days window
  const progress = Math.max(0, Math.min(100, ((10 - daysLeft) / 10) * 100));

  const statusText =
    daysLeft < 0
      ? `Просрочен на ${Math.abs(daysLeft)} ${dayWord(daysLeft)}`
      : daysLeft === 0
      ? 'Сегодня'
      : `Через ${daysLeft} ${dayWord(daysLeft)}`;

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left active:scale-[0.98] transition-transform ${s.wrap}`}
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.icon}`}>
          <Bell size={17} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
              {cat?.icon} {cat?.name || 'Платёж'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${s.badge}`}>
              {statusText}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              {dueDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          {/* progress bar */}
          <div className="mt-1.5 h-1 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
            <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="text-base font-bold text-gray-800 dark:text-gray-200 flex-shrink-0">
          {formatCurrency(tx.amount)}
        </div>
      </button>

      {showConfirm && (
        <PaymentConfirmSheet reminder={reminder} onClose={() => setShowConfirm(false)} />
      )}
    </>
  );
}

/* ── Confirm sheet ── */

function PaymentConfirmSheet({ reminder, onClose }: { reminder: ReminderInfo; onClose: () => void }) {
  const { getCategoryById, addTransaction, updateTransaction } = useAppStore();
  const [paid, setPaid] = useState(false);

  const { tx, dueDate } = reminder;
  const cat = getCategoryById(tx.categoryId);

  const handleYes = () => {
    // Create the actual expense
    addTransaction({
      type: tx.type,
      amount: tx.amount,
      categoryId: tx.categoryId,
      comment: tx.comment || `${cat?.name || 'Платёж'} — регулярный`,
      date: new Date().toISOString(),
      flag: 'mandatory',
    });
    // Mark the template as paid for this cycle
    updateTransaction(tx.id, { lastPaidAt: new Date().toISOString() });
    setPaid(true);
    setTimeout(onClose, 1100);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-[430px] bg-white dark:bg-gray-800 rounded-t-3xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {paid ? (
          <div className="px-5 pb-10 pt-3 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-3">
              <Check size={26} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-base font-semibold text-gray-800 dark:text-gray-200">Записано в расходы</p>
            <p className="text-sm text-gray-400 mt-0.5">{formatCurrency(tx.amount)}</p>
          </div>
        ) : (
          <div className="px-5 pb-8">
            {/* Payment info */}
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-2xl mb-3">
                {cat?.icon || '🔔'}
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                {cat?.name || 'Платёж'}
              </h3>
              <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-1">
                {formatCurrency(tx.amount)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Срок: {dueDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </p>
              {tx.comment && (
                <p className="text-xs text-gray-400 mt-1">{tx.comment}</p>
              )}
            </div>

            <p className="text-center text-sm font-medium text-gray-600 dark:text-gray-300 mb-4">
              Оплатили этот платёж?
            </p>

            <div className="flex gap-2.5">
              <button
                onClick={onClose}
                className="flex-1 py-3.5 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center gap-2"
              >
                <X size={17} className="text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Ещё нет</span>
              </button>
              <button
                onClick={handleYes}
                className="flex-1 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
              >
                <Check size={17} className="text-white" />
                <span className="text-sm font-semibold text-white">Да, оплатил</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
