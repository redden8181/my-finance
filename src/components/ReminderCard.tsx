import { useState } from "react";
import { BellRing, Check } from "lucide-react";
import { useAppStore } from "../store/StoreContext";
import type { Reminder } from "../store/useStore";
import { formatDateShort, formatMoney, pluralize } from "../utils/format";
import { Sheet } from "./Sheet";

const LEVEL_STYLES = {
  green: { chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300", bar: "bg-emerald-500", stripe: "bg-emerald-500" },
  yellow: { chip: "bg-amber-500/16 text-amber-600 dark:text-amber-300", bar: "bg-amber-500", stripe: "bg-amber-500" },
  orange: { chip: "bg-orange-500/16 text-orange-600 dark:text-orange-300", bar: "bg-orange-500", stripe: "bg-orange-500" },
  red: { chip: "bg-red-500/16 text-red-500 dark:text-red-300", bar: "bg-red-500", stripe: "bg-red-500" },
} as const;

function dueLabel(daysUntil: number): string {
  if (daysUntil < 0)
    return `Просрочен на ${-daysUntil} ${pluralize(-daysUntil, "день", "дня", "дней")}`;
  if (daysUntil === 0) return "Сегодня";
  if (daysUntil === 1) return "Завтра";
  return `Через ${daysUntil} ${pluralize(daysUntil, "день", "дня", "дней")}`;
}

export function ReminderCard({ reminder, index }: { reminder: Reminder; index: number }) {
  const { payReminder, getCategoryById } = useAppStore();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cat = getCategoryById(reminder.tx.categoryId);
  const style = LEVEL_STYLES[reminder.level];

  return (
    <>
      <button
        onClick={() => setConfirmOpen(true)}
        className="press animate-rise relative block w-full overflow-hidden rounded-[22px] border border-line bg-surface p-4 pl-5 text-left"
        style={{ animationDelay: `${index * 70}ms` }}
      >
        <span className={`absolute inset-y-0 left-0 w-1 ${style.stripe}`} />
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface2 text-xl">
            {cat?.icon || "🏷️"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold">
              {reminder.tx.comment || cat?.name || "Платёж"}
            </span>
            <span className="mt-0.5 block text-xs font-medium text-muted">
              {formatDateShort(reminder.dueDate.toISOString())} ·{" "}
              <span className="tabular-nums">{formatMoney(reminder.tx.amount)}</span>
            </span>
          </span>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${style.chip}`}
          >
            {dueLabel(reminder.daysUntil)}
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface2">
          <div
            className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
            style={{ width: `${Math.round(reminder.progress * 100)}%` }}
          />
        </div>
      </button>

      <Sheet open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <div className="animate-pop text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-line bg-surface2 text-3xl">
            {cat?.icon || "🏷️"}
          </span>
          <h3 className="mt-4 font-display text-[17px] font-semibold">Оплатили этот платёж?</h3>
          <p className="mt-2 text-sm font-medium text-muted">
            {reminder.tx.comment || cat?.name || "Платёж"} ·{" "}
            <span className="tabular-nums">{formatMoney(reminder.tx.amount)}</span>
          </p>
          <p className="mt-0.5 flex items-center justify-center gap-1.5 text-xs font-medium text-muted">
            <BellRing size={12} />
            Срок: {formatDateShort(reminder.dueDate.toISOString())} · создастся расход
          </p>
          <div className="mt-5 grid gap-2">
            <button
              onClick={() => {
                payReminder(reminder.tx.id);
                setConfirmOpen(false);
              }}
              className="press flex h-13 items-center justify-center gap-2 rounded-2xl bg-income text-[15px] font-bold text-on-accent"
            >
              <Check size={18} strokeWidth={3} />
              Да, оплатил
            </button>
            <button
              onClick={() => setConfirmOpen(false)}
              className="press flex h-13 items-center justify-center rounded-2xl bg-surface2 text-[15px] font-bold text-ink"
            >
              Ещё нет
            </button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
