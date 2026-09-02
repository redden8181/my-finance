import { useState } from "react";
import { Scale } from "lucide-react";
import { useAppStore } from "../store/StoreContext";
import { formatMoney } from "../utils/format";
import { Sheet } from "./Sheet";

function parseAmount(v: string): number | null {
  const n = parseFloat(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export function AdjustBalanceSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { balance, adjustBalance } = useAppStore();
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");

  const actual = parseAmount(value);
  const diff = actual === null ? null : Math.round((actual - balance) * 100) / 100;

  const apply = () => {
    if (actual === null || diff === 0 || diff === null) return;
    adjustBalance(actual, note);
    setValue("");
    setNote("");
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="animate-pop">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft">
            <Scale size={21} className="text-accent-ink" />
          </span>
          <div>
            <h3 className="font-display text-[15px] font-semibold">Корректировка баланса</h3>
            <p className="mt-0.5 text-xs font-medium text-muted tabular-nums">
              Сейчас в приложении: {formatMoney(balance)}
            </p>
          </div>
        </div>

        <label className="mt-5 block">
          <span className="mb-1.5 block text-[11px] font-bold tracking-[0.16em] text-muted uppercase">
            Реальная сумма
          </span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
            placeholder="Например: 12 500"
            autoFocus
            className="h-13 w-full rounded-2xl bg-surface2 px-4 text-lg font-bold tabular-nums outline-none placeholder:font-medium placeholder:text-muted"
          />
        </label>

        <label className="mt-3 block">
          <span className="mb-1.5 block text-[11px] font-bold tracking-[0.16em] text-muted uppercase">
            Комментарий (необязательно)
          </span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Корректировка баланса"
            className="h-13 w-full rounded-2xl bg-surface2 px-4 text-[15px] font-bold outline-none placeholder:font-medium placeholder:text-muted"
          />
        </label>

        {diff !== null && diff !== 0 && (
          <p
            className={`mt-3 text-center text-sm font-bold tabular-nums ${
              diff > 0 ? "text-income" : "text-expense"
            }`}
          >
            Будет создана операция: {formatMoney(diff, true)}
          </p>
        )}
        {diff === 0 && value !== "" && (
          <p className="mt-3 text-center text-sm font-bold text-muted">
            Суммы совпадают — корректировка не нужна
          </p>
        )}

        <button
          onClick={apply}
          disabled={actual === null || diff === 0}
          className="press glow-accent mt-4 flex h-13 w-full items-center justify-center rounded-2xl bg-accent text-[15px] font-bold text-on-accent disabled:opacity-40"
        >
          Применить
        </button>
      </div>
    </Sheet>
  );
}
