import { useMemo } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BellRing,
  ChevronRight,
  Coins,
  HandCoins,
  History,
  Package,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useAppStore } from "../store/StoreContext";
import { getBalanceSeries, getCarryover, getMonthStats } from "../store/useStore";
import type { Transaction } from "../types";
import { formatDayLabel, formatMoney, toISODate } from "../utils/format";
import { ReminderCard } from "./ReminderCard";
import { Sparkline } from "./Sparkline";
import { TransactionItem } from "./TransactionItem";

export function HomeScreen({
  onEdit,
  onOpenDebts,
}: {
  onEdit: (tx: Transaction) => void;
  onOpenDebts: () => void;
}) {
  const { transactions, balance, reminders, debts } = useAppStore();

  const now = new Date();
  const monthStats = useMemo(
    () => getMonthStats(transactions, now.getFullYear(), now.getMonth()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions]
  );
  const carryover = useMemo(
    () => getCarryover(transactions, now.getFullYear(), now.getMonth()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions]
  );
  const series = useMemo(() => getBalanceSeries(transactions, 30), [transactions]);

  const debtSummary = useMemo(() => {
    const active = debts.filter((d) => !d.isPaid);
    const iOwe = active.filter((d) => d.direction === "i_owe").reduce((s, d) => s + d.amount, 0);
    const owedToMe = active
      .filter((d) => d.direction === "owed_to_me")
      .reduce((s, d) => s + d.amount, 0);
    return { count: active.length, iOwe, owedToMe };
  }, [debts]);

  const grouped = useMemo(() => {
    const sorted = [...transactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const map = new Map<string, Transaction[]>();
    for (const tx of sorted) {
      const key = toISODate(new Date(tx.date));
      const list = map.get(key);
      if (list) list.push(tx);
      else map.set(key, [tx]);
    }
    return [...map.entries()];
  }, [transactions]);

  const isEmpty = transactions.length === 0;
  let section = 0;
  const delay = () => `${section++ * 80}ms`;

  return (
    <div className="space-y-6 pb-36">
      {/* ---- Баланс ---- */}
      <section
        className="glow-card animate-rise relative overflow-hidden rounded-[26px] border border-line bg-surface"
        style={{ animationDelay: delay() }}
      >
        <div
          className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full blur-[70px]"
          style={{ background: "var(--orb-1)" }}
        />
        <div className="relative p-5 pb-0">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <p className="text-[11px] font-bold tracking-[0.18em] text-muted uppercase">
              Общий баланс
            </p>
          </div>
          <p className="mt-2 font-display text-[38px] leading-none font-bold tracking-tight">
            {formatMoney(balance)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="flex items-center gap-2.5 rounded-2xl bg-income-soft px-3.5 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-income/20">
                <TrendingUp size={15} className="text-income" strokeWidth={2.6} />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-bold tracking-[0.14em] text-muted uppercase">
                  Доходы
                </span>
                <span className="block truncate text-[15px] font-bold text-income tabular-nums">
                  {formatMoney(monthStats.income)}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2.5 rounded-2xl bg-expense-soft px-3.5 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-expense/20">
                <TrendingDown size={15} className="text-expense" strokeWidth={2.6} />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-bold tracking-[0.14em] text-muted uppercase">
                  Расходы
                </span>
                <span className="block truncate text-[15px] font-bold text-expense tabular-nums">
                  {formatMoney(monthStats.expense)}
                </span>
              </span>
            </div>
          </div>
        </div>

        {!isEmpty && (
          <div className="relative mt-4 h-16 px-2 opacity-90">
            <Sparkline data={series} />
          </div>
        )}

        <div className="relative mt-4 space-y-2.5 border-t border-line px-5 py-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted">Итого за месяц</span>
            <span
              className={`flex items-center gap-1 font-bold tabular-nums ${
                monthStats.net > 0
                  ? "text-income"
                  : monthStats.net < 0
                    ? "text-expense"
                    : "text-ink"
              }`}
            >
              {monthStats.net !== 0 &&
                (monthStats.net > 0 ? (
                  <ArrowUpRight size={14} strokeWidth={2.6} />
                ) : (
                  <ArrowDownRight size={14} strokeWidth={2.6} />
                ))}
              {formatMoney(monthStats.net, true)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-muted">
              <Package size={14} />
              Остаток за прошлый месяц
            </span>
            <span className="font-bold tabular-nums">{formatMoney(carryover)}</span>
          </div>
        </div>
      </section>

      {/* ---- Напоминания ---- */}
      {reminders.length > 0 && (
        <section className="animate-rise" style={{ animationDelay: delay() }}>
          <h2 className="mb-2.5 flex items-center gap-2 px-1 text-[11px] font-bold tracking-[0.18em] text-muted uppercase">
            <BellRing size={13} />
            Напоминания
          </h2>
          <div className="space-y-2.5">
            {reminders.map((r, i) => (
              <ReminderCard key={r.tx.id} reminder={r} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ---- Долги ---- */}
      <section className="animate-rise" style={{ animationDelay: delay() }}>
        <button
          onClick={onOpenDebts}
          className="press flex w-full items-center gap-3.5 rounded-[26px] border border-line bg-surface p-4 text-left"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft">
            <HandCoins size={21} className="text-accent-ink" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold">Долги</span>
            {debtSummary.count > 0 ? (
              <span className="mt-0.5 block text-xs font-medium text-muted">
                {debtSummary.owedToMe > 0 && (
                  <span className="text-income">вернут вам {formatMoney(debtSummary.owedToMe)}</span>
                )}
                {debtSummary.owedToMe > 0 && debtSummary.iOwe > 0 && " · "}
                {debtSummary.iOwe > 0 && (
                  <span className="text-expense">вы должны {formatMoney(debtSummary.iOwe)}</span>
                )}
              </span>
            ) : (
              <span className="mt-0.5 block text-xs font-medium text-muted">
                Нет активных долгов
              </span>
            )}
          </span>
          <ChevronRight size={18} className="shrink-0 text-muted" />
        </button>
      </section>

      {/* ---- История ---- */}
      <section className="animate-rise" style={{ animationDelay: delay() }}>
        <h2 className="mb-2.5 flex items-center gap-2 px-1 text-[11px] font-bold tracking-[0.18em] text-muted uppercase">
          <History size={13} />
          История
        </h2>

        {isEmpty ? (
          <div className="flex flex-col items-center rounded-[26px] border border-dashed border-line bg-surface/40 px-6 py-12 text-center">
            <span className="glow-accent flex h-20 w-20 items-center justify-center rounded-full bg-accent-soft">
              <Coins size={34} className="text-accent-ink" strokeWidth={1.8} />
            </span>
            <p className="mt-4 font-display text-[15px] font-semibold">Пока пусто</p>
            <p className="mt-1.5 max-w-[240px] text-sm font-medium text-muted">
              Нажмите «+», чтобы добавить первую операцию
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([day, txs]) => {
              const dayNet = txs.reduce(
                (s, t) => s + (t.type === "income" ? t.amount : -t.amount),
                0
              );
              return (
                <div key={day}>
                  <div className="mb-1.5 flex items-baseline justify-between px-1.5">
                    <p className="text-[12px] font-bold text-muted">
                      {formatDayLabel(txs[0].date)}
                    </p>
                    {dayNet !== 0 && (
                      <p
                        className={`text-[11px] font-bold tabular-nums ${
                          dayNet > 0 ? "text-income" : "text-expense"
                        }`}
                      >
                        {formatMoney(dayNet, true)}
                      </p>
                    )}
                  </div>
                  <div className="divide-y divide-line rounded-[22px] border border-line bg-surface px-4">
                    {txs.map((tx) => (
                      <TransactionItem key={tx.id} tx={tx} onEdit={onEdit} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
