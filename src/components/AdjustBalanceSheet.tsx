import { useState, useMemo } from 'react';
import { useAppStore } from '../store/StoreContext';
import { formatCurrency } from '../utils/format';
import NumberPad from './NumberPad';
import { Scale, ArrowRight } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function AdjustBalanceSheet({ onClose }: Props) {
  const { transactions, adjustBalance } = useAppStore();

  const currentBalance = useMemo(
    () => transactions.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0),
    [transactions]
  );

  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [usePad, setUsePad] = useState(true);
  const [done, setDone] = useState(false);

  const parsed = value === '' ? null : Number(value);
  const isValid = parsed !== null && !Number.isNaN(parsed);
  const diff = isValid ? Math.round((parsed - currentBalance) * 100) / 100 : 0;

  const handleApply = () => {
    if (!isValid || diff === 0) return;
    adjustBalance(parsed, note);
    setDone(true);
    setTimeout(onClose, 1000);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-[430px] bg-white dark:bg-gray-800 rounded-t-3xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {done ? (
          <div className="px-5 pb-10 pt-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-3">
              <Scale size={22} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-base font-semibold text-gray-800 dark:text-gray-200">Баланс обновлён</p>
            <p className="text-sm text-gray-400 mt-1">{formatCurrency(parsed || 0)}</p>
          </div>
        ) : (
          <div className="px-5 pb-8 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <Scale size={18} className="text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
                Корректировка баланса
              </h3>
            </div>

            {/* Current → New */}
            <div className="flex items-center gap-3 mb-5 p-3 rounded-2xl bg-gray-50 dark:bg-gray-700/50">
              <div className="flex-1 text-center">
                <div className="text-xs text-gray-400 mb-0.5">Сейчас</div>
                <div className="text-base font-bold text-gray-700 dark:text-gray-300">
                  {formatCurrency(currentBalance)}
                </div>
              </div>
              <ArrowRight size={18} className="text-gray-300 dark:text-gray-600" />
              <div className="flex-1 text-center">
                <div className="text-xs text-gray-400 mb-0.5">Станет</div>
                <div className={`text-base font-bold ${
                  isValid
                    ? (parsed as number) >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-500'
                    : 'text-gray-300 dark:text-gray-600'
                }`}>
                  {isValid ? formatCurrency(parsed as number) : '—'}
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Реальная сумма
              </label>
              <button
                onClick={() => setUsePad(!usePad)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {usePad ? 'Ввод' : 'Клавиатура'}
              </button>
            </div>

            {usePad ? (
              <>
                <div className="flex items-center justify-end py-2 min-h-[48px]">
                  <span className="text-3xl font-extrabold text-gray-800 dark:text-gray-100">
                    {value || <span className="text-gray-200 dark:text-gray-600">0</span>}
                  </span>
                  <span className="text-2xl text-gray-300 dark:text-gray-600 ml-1">₽</span>
                </div>
                <div className="h-px bg-gray-100 dark:bg-gray-700 mb-3" />
                <NumberPad value={value} onChange={setValue} />
              </>
            ) : (
              <input
                type="number"
                inputMode="decimal"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="0"
                autoFocus
                className="w-full py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-700 text-2xl font-bold text-gray-800 dark:text-gray-200 outline-none"
              />
            )}

            {/* Difference preview */}
            {isValid && diff !== 0 && (
              <div className={`mt-4 px-4 py-3 rounded-xl text-sm font-medium ${
                diff > 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
              }`}>
                {diff > 0 ? '＋ Будет добавлен доход ' : '－ Будет добавлен расход '}
                <span className="font-bold">{formatCurrency(Math.abs(diff))}</span>
              </div>
            )}

            {isValid && diff === 0 && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-400 text-center">
                Баланс уже совпадает
              </div>
            )}

            {/* Note */}
            <label className="block mt-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
              Комментарий
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Например: после отпуска"
              className="w-full mt-1 py-3 px-4 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 outline-none"
            />

            {/* Actions */}
            <button
              onClick={handleApply}
              disabled={!isValid || diff === 0}
              className={`w-full mt-5 py-3.5 rounded-2xl text-sm font-semibold transition-all ${
                isValid && diff !== 0
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-500'
              }`}
            >
              Применить
            </button>
            <button
              onClick={onClose}
              className="w-full mt-2 py-3.5 rounded-2xl bg-gray-100 dark:bg-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400"
            >
              Отмена
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
