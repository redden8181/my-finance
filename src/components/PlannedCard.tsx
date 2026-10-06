import { useState } from "react";
import { Check, PiggyBank, Trash2 } from "lucide-react";
import { useAppStore } from "../store/StoreContext";
import type { PlannedView } from "../store/useStore";
import { formatDateShort, formatMoney, pluralize } from "../utils/format";
import { Sheet } from "./Sheet";

const LEVEL_STYLES = {
  green: { chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300", stripe: "bg-emerald-500" },
  yellow: { chip: "bg-amber-500/16 text-amber-600 dark:text-amber-300", stripe: "bg-amber-500" },
  orange: { chip: "bg-orange-500/16 text-orange-600 dark:text-orange-300", stripe: "bg-orange-500" },
  red: { chip: "bg-red-500/16 text-red-500 dark:text-red-300", stripe: "bg-red-500" },
} as const;

function dueLabel(daysUntil: number): string {
  if (daysUntil < 0) {
    const d = -daysUntil;
    return `Просрочено на ${d} ${pluralize(d, "день", "дня", "дней")}`;
  }
  if (daysUntil === 0) return "Сегодня";
  if (daysUntil === 1) return "Завтра";
  return `Через ${daysUntil} ${pluralize(daysUntil, "день", "дня", "дней")}`;
}

export function PlannedCard({ view, index }: { view: PlannedView; index: number }) {
  const { completePlannedExpense, deletePlannedExpense, getCategoryById } = useAppStore();
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const cat = getCategoryById(view.item.categoryId);
  const style = LEVEL_STYLES[view.level];

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setConfirmDelete(false);
        }}
        className="press animate-rise relative block w-full overflow-hidden rounded-[22px] border border-line bg-surface p-4 pl-5 text-left"
        style={{ animationDelay: `${index * 70}ms` }}
      >
        <span className={`absolute inset-y-0 left-0 w-1 ${style.stripe}`} />
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface2 text-xl">
            {cat?.icon || "🎯"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold">{view.item.title}</span>
            <span className="mt-0.5 block text-xs font-medium text-muted">
              {formatDateShort(view.item.dueDate)} ·{" "}
              <span className="tabular-nums">{formatMoney(view.item.amount)}</span>
            </span>
          </span>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${style.chip}`}>
            {dueLabel(view.daysUntil)}
          </span>
        </div>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)}>
        <div className="animate-pop text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-line bg-surface2 text-3xl">
            {cat?.icon || "🎯"}
          </span>
          <h3 className="mt-4 font-display text-[17px] font-semibold">Уже потратили?</h3>
          <p className="mt-2 text-sm font-medium text-muted">
            {view.item.title} ·{" "}
            <span className="tabular-nums">{formatMoney(view.item.amount)}</span>
          </p>
          <p className="mt-0.5 flex items-center justify-center gap-1.5 text-xs font-medium text-muted">
            <PiggyBank size={12} />
            План на {formatDateShort(view.item.dueDate)} · создастся расход
          </p>

          <div className="mt-5 grid gap-2">
            <button
              onClick={() => {
                completePlannedExpense(view.item.id);
                setOpen(false);
              }}
              className="press flex h-13 items-center justify-center gap-2 rounded-2xl bg-income text-[15px] font-bold text-on-accent"
            >
              <Check size={18} strokeWidth={3} />
              Да, потратил
            </button>

            {confirmDelete ? (
              <button
                onClick={() => {
                  deletePlannedExpense(view.item.id);
                  setOpen(false);
                }}
                className="press flex h-13 items-center justify-center gap-2 rounded-2xl bg-expense text-[15px] font-bold text-on-accent"
              >
                <Trash2 size={16} strokeWidth={2.6} />
                Точно удалить план?
              </button>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="press flex h-13 items-center justify-center gap-2 rounded-2xl bg-expense-soft text-[15px] font-bold text-expense"
              >
                <Trash2 size={16} strokeWidth={2.6} />
                Удалить план
              </button>
            )}

            <button
              onClick={() => setOpen(false)}
              className="press flex h-12 items-center justify-center rounded-2xl text-[15px] font-bold text-muted"
            >
              Ещё нет
            </button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
