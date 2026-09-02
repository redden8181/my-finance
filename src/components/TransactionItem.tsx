import { useState } from "react";
import { Pencil, Repeat, Trash2 } from "lucide-react";
import { useAppStore } from "../store/StoreContext";
import { FLAG_LABELS } from "../store/useStore";
import type { Transaction } from "../types";
import { formatDateFull, formatMoney } from "../utils/format";
import { Sheet } from "./Sheet";

export function TransactionItem({
  tx,
  onEdit,
}: {
  tx: Transaction;
  onEdit: (tx: Transaction) => void;
}) {
  const { getCategoryById, deleteTransaction } = useAppStore();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const cat = getCategoryById(tx.categoryId);
  const isIncome = tx.type === "income";

  return (
    <>
      <button
        onClick={() => {
          setSheetOpen(true);
          setConfirming(false);
        }}
        className="press flex w-full items-center gap-3 px-1 py-3 text-left"
      >
        <span className="flex h-10.5 w-10.5 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface2 text-lg">
          {cat?.icon || "🏷️"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold">
              {cat?.name || "Без категории"}
            </span>
            {tx.flag === "regular" && (
              <Repeat size={12} className="shrink-0 text-accent-ink" strokeWidth={2.5} />
            )}
          </span>
          {tx.comment ? (
            <span className="mt-0.5 block truncate text-xs font-medium text-muted">
              {tx.comment}
            </span>
          ) : null}
        </span>
        <span
          className={`shrink-0 font-display text-[14px] font-semibold ${
            isIncome ? "text-income" : "text-ink"
          }`}
        >
          {formatMoney(isIncome ? tx.amount : -tx.amount, true)}
        </span>
      </button>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        <div className="animate-pop">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-line bg-surface2 text-2xl">
              {cat?.icon || "🏷️"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold">{cat?.name || "Без категории"}</p>
              <p className="text-xs font-medium text-muted">{formatDateFull(tx.date)}</p>
            </div>
            <p
              className={`font-display text-[17px] font-semibold ${
                isIncome ? "text-income" : "text-expense"
              }`}
            >
              {formatMoney(isIncome ? tx.amount : -tx.amount, true)}
            </p>
          </div>

          <dl className="mt-5 space-y-2.5 rounded-2xl border border-line bg-surface2/40 p-4 text-sm">
            <div className="flex justify-between">
              <dt className="font-medium text-muted">Тип</dt>
              <dd className="font-semibold">{isIncome ? "Доход" : "Расход"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium text-muted">Метка</dt>
              <dd className="font-semibold">{FLAG_LABELS[tx.flag]}</dd>
            </div>
            {tx.comment && (
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 font-medium text-muted">Комментарий</dt>
                <dd className="text-right font-semibold break-words">{tx.comment}</dd>
              </div>
            )}
            {tx.flag === "regular" && tx.dueDay && (
              <div className="flex justify-between">
                <dt className="font-medium text-muted">День платежа</dt>
                <dd className="font-semibold">{tx.dueDay}-е число</dd>
              </div>
            )}
          </dl>

          <div className="mt-4 grid gap-2">
            <button
              onClick={() => {
                setSheetOpen(false);
                onEdit(tx);
              }}
              className="press flex h-13 items-center justify-center gap-2 rounded-2xl bg-accent text-[15px] font-bold text-on-accent"
            >
              <Pencil size={16} strokeWidth={2.6} />
              Редактировать
            </button>
            {confirming ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  className="press flex h-13 items-center justify-center rounded-2xl bg-surface2 text-[15px] font-bold text-muted"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    deleteTransaction(tx.id);
                    setSheetOpen(false);
                  }}
                  className="press flex h-13 items-center justify-center gap-2 rounded-2xl bg-expense text-[15px] font-bold text-on-accent"
                >
                  <Trash2 size={16} strokeWidth={2.6} />
                  Точно удалить?
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="press flex h-13 items-center justify-center gap-2 rounded-2xl bg-expense-soft text-[15px] font-bold text-expense"
              >
                <Trash2 size={16} strokeWidth={2.6} />
                Удалить
              </button>
            )}
            <button
              onClick={() => setSheetOpen(false)}
              className="press flex h-12 items-center justify-center rounded-2xl text-[15px] font-bold text-muted"
            >
              Закрыть
            </button>
          </div>
        </div>
      </Sheet>
    </>
  );
}
