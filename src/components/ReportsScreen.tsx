import { useMemo, useState } from "react";
import {
  Check,
  FileCheck,
  HeartPulse,
  Inbox,
  Lock,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useAppStore } from "../store/StoreContext";
import { FLAG_LABELS, getMonthStats } from "../store/useStore";
import type { MonthlyReport } from "../types";
import { daysInMonth, formatMoney, MONTH_NAMES } from "../utils/format";
import { Sheet } from "./Sheet";

function healthOf(rate: number | null): { label: string; cls: string } {
  if (rate === null) return { label: "Недостаточно данных", cls: "text-muted" };
  if (rate >= 30) return { label: "Отлично", cls: "text-income" };
  if (rate >= 10) return { label: "Стабильно", cls: "text-accent-ink" };
  if (rate >= 0) return { label: "Внимание", cls: "text-orange-500" };
  return { label: "Риск перерасхода", cls: "text-expense" };
}

export function ReportsScreen() {
  const { transactions, monthlyReports, closeCurrentMonth, getCategoryById } = useAppStore();
  const [confirming, setConfirming] = useState(false);
  const [detail, setDetail] = useState<MonthlyReport | null>(null);
  const [justClosed, setJustClosed] = useState(false);

  const now = new Date();
  const stats = useMemo(
    () => getMonthStats(transactions, now.getFullYear(), now.getMonth()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions]
  );

  const dim = daysInMonth(now.getFullYear(), now.getMonth());
  const day = now.getDate();
  const projectedExpenses = day > 0 ? Math.round((stats.expense / day) * dim) : stats.expense;
  const projectedNet = stats.income - projectedExpenses;
  const savingsRate = stats.income > 0 ? Math.round((stats.net / stats.income) * 100) : null;
  const health = healthOf(savingsRate);

  const topExpenses = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of stats.list) {
      if (t.type !== "expense") continue;
      map.set(t.categoryId, (map.get(t.categoryId) || 0) + t.amount);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [stats.list]);

  const history = useMemo(
    () => [...monthlyReports].sort((a, b) => b.year - a.year || b.month - a.month),
    [monthlyReports]
  );

  return (
    <div className="space-y-5">
      {/* live report */}
      <section className="glow-card animate-rise relative overflow-hidden rounded-[26px] border border-line bg-surface p-5" style={{ animationDelay: "120ms" }}>
        <div
          className="pointer-events-none absolute -top-20 -right-16 h-44 w-44 rounded-full blur-[70px]"
          style={{ background: "var(--orb-1)" }}
        />
        <div className="relative flex items-center justify-between">
          <h2 className="font-display text-[14px] font-semibold tracking-[0.1em] uppercase">
            {MONTH_NAMES[now.getMonth()]} {now.getFullYear()}
          </h2>
          <span className="rounded-full border border-accent/40 bg-accent-soft px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] text-accent-ink uppercase">
            Текущий
          </span>
        </div>

        <div className="relative mt-4 space-y-2.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-muted">
              <TrendingUp size={14} className="text-income" />
              Доходы
            </span>
            <span className="font-bold text-income tabular-nums">{formatMoney(stats.income)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-muted">
              <TrendingDown size={14} className="text-expense" />
              Расходы
            </span>
            <span className="font-bold text-expense tabular-nums">{formatMoney(stats.expense)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-line pt-2.5">
            <span className="font-medium text-muted">Баланс месяца</span>
            <span
              className={`font-display text-[15px] font-semibold tabular-nums ${
                stats.net >= 0 ? "text-income" : "text-expense"
              }`}
            >
              {formatMoney(stats.net, true)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted">Прогноз к концу месяца</span>
            <span
              className={`font-bold tabular-nums ${
                projectedNet >= 0 ? "text-income" : "text-expense"
              }`}
            >
              ≈ {formatMoney(projectedNet, true)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted">Норма сбережений</span>
            <span className="font-bold tabular-nums">
              {savingsRate === null ? "—" : `${savingsRate}%`}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-muted">
              <HeartPulse size={14} />
              Финансовое здоровье
            </span>
            <span className={`flex items-center gap-1.5 font-bold ${health.cls}`}>
              <span className="h-2 w-2 rounded-full bg-current" />
              {health.label}
            </span>
          </div>
        </div>

        {topExpenses.length > 0 && (
          <div className="relative mt-4 border-t border-line pt-3.5">
            <p className="mb-2 text-[11px] font-bold tracking-[0.18em] text-muted uppercase">
              Топ расходов
            </p>
            <div className="space-y-1.5">
              {topExpenses.map(([catId, total], i) => {
                const cat = getCategoryById(catId);
                return (
                  <div key={catId} className="flex items-center gap-2 text-sm">
                    <span className="w-4 font-display text-[10px] font-semibold text-accent-ink">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{cat?.icon || "🏷️"}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{cat?.name || "Без категории"}</span>
                    <span className="font-bold tabular-nums">{formatMoney(total)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="relative mt-4">
          {justClosed ? (
            <div className="animate-pop flex h-12 items-center justify-center gap-2 rounded-2xl bg-income-soft text-sm font-bold text-income">
              <Check size={16} strokeWidth={3} />
              Отчёт создан
            </div>
          ) : confirming ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setConfirming(false)}
                className="press h-12 rounded-2xl bg-surface2 text-sm font-bold text-muted"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  closeCurrentMonth();
                  setConfirming(false);
                  setJustClosed(true);
                  setTimeout(() => setJustClosed(false), 2500);
                }}
                className="press flex h-12 items-center justify-center gap-1.5 rounded-2xl bg-accent text-sm font-bold text-on-accent"
              >
                <Lock size={14} strokeWidth={2.6} />
                Подтвердить
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="press flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-surface2 text-sm font-bold"
            >
              <FileCheck size={16} />
              Закрыть месяц вручную
            </button>
          )}
        </div>
      </section>

      {/* history */}
      <section className="animate-rise" style={{ animationDelay: "200ms" }}>
        <h2 className="mb-2.5 px-1 text-[11px] font-bold tracking-[0.18em] text-muted uppercase">
          Закрытые месяцы
        </h2>
        {history.length === 0 ? (
          <div className="flex flex-col items-center rounded-[26px] border border-dashed border-line bg-surface/40 px-6 py-10 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface2">
              <Inbox size={26} className="text-muted" strokeWidth={1.8} />
            </span>
            <p className="mt-3 text-sm font-bold">Пока нет закрытых месяцев</p>
            <p className="mt-1 max-w-[250px] text-xs font-medium text-muted">
              Отчёт появится автоматически 1-го числа следующего месяца
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {history.map((r) => (
              <button
                key={r.id}
                onClick={() => setDetail(r)}
                className="press flex w-full items-center gap-3 rounded-[22px] border border-line bg-surface p-4 text-left"
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                    r.balance >= 0 ? "bg-income-soft" : "bg-expense-soft"
                  }`}
                >
                  {r.balance >= 0 ? (
                    <TrendingUp size={19} className="text-income" />
                  ) : (
                    <TrendingDown size={19} className="text-expense" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold">
                    {MONTH_NAMES[r.month]} {r.year}
                  </span>
                  <span className="block text-xs font-medium text-muted tabular-nums">
                    +{formatMoney(r.totalIncome)} · −{formatMoney(r.totalExpenses)}
                  </span>
                </span>
                <span
                  className={`font-display text-[14px] font-semibold tabular-nums ${
                    r.balance >= 0 ? "text-income" : "text-expense"
                  }`}
                >
                  {formatMoney(r.balance, true)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* report detail */}
      <Sheet open={detail !== null} onClose={() => setDetail(null)}>
        {detail && (
          <div className="animate-pop">
            <h3 className="font-display text-[16px] font-semibold tracking-[0.06em]">
              {MONTH_NAMES[detail.month]} {detail.year}
            </h3>
            <div className="mt-4 space-y-2.5 rounded-2xl border border-line bg-surface2/40 p-4 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-muted">Остаток на начало</span>
                <span className="font-bold tabular-nums">{formatMoney(detail.carryoverFromPrevious)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-muted">Доходы</span>
                <span className="font-bold text-income tabular-nums">{formatMoney(detail.totalIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-muted">Расходы</span>
                <span className="font-bold text-expense tabular-nums">{formatMoney(detail.totalExpenses)}</span>
              </div>
              <div className="flex justify-between border-t border-line pt-2.5">
                <span className="font-bold">Итог месяца</span>
                <span
                  className={`font-display text-[14px] font-semibold tabular-nums ${
                    detail.balance >= 0 ? "text-income" : "text-expense"
                  }`}
                >
                  {formatMoney(detail.balance, true)}
                </span>
              </div>
            </div>

            {detail.categoryBreakdown.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-[11px] font-bold tracking-[0.18em] text-muted uppercase">
                  По категориям
                </p>
                <div className="space-y-1.5">
                  {detail.categoryBreakdown.map((c) => (
                    <div key={`${c.categoryId}-${c.type}`} className="flex items-center gap-2 text-sm">
                      <span>{c.categoryIcon}</span>
                      <span className="min-w-0 flex-1 truncate font-semibold">
                        {c.categoryName}
                        <span
                          className={`ml-1.5 text-[10px] font-bold ${
                            c.type === "income" ? "text-income" : "text-expense"
                          }`}
                        >
                          {c.type === "income" ? "доход" : "расход"}
                        </span>
                      </span>
                      <span
                        className={`font-bold tabular-nums ${
                          c.type === "income" ? "text-income" : "text-ink"
                        }`}
                      >
                        {formatMoney(c.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detail.flagBreakdown.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-[11px] font-bold tracking-[0.18em] text-muted uppercase">
                  По меткам
                </p>
                <div className="flex flex-wrap gap-2">
                  {detail.flagBreakdown.map((f) => (
                    <span
                      key={f.flag}
                      className="rounded-full border border-line bg-surface2/60 px-3 py-1.5 text-xs font-bold tabular-nums"
                    >
                      {FLAG_LABELS[f.flag]} · {formatMoney(f.total)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
