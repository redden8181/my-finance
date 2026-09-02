import { useMemo, useState } from "react";
import { ChartPie, ChevronLeft, ChevronRight, FileBarChart } from "lucide-react";
import { useAppStore } from "../store/StoreContext";
import { getMonthStats } from "../store/useStore";
import type { Transaction } from "../types";
import { formatMoney, MONTH_NAMES } from "../utils/format";
import { ReportsScreen } from "./ReportsScreen";
import { TransactionItem } from "./TransactionItem";

type Mode = "all" | "expense" | "income";

const PALETTE = [
  "#d3ff4d", "#7bd5f5", "#ff9e7a", "#c9a7ff", "#ffd166",
  "#6ee7b7", "#f0abfc", "#93c5fd", "#fca5a5", "#bef264",
];

function Donut({ segments }: { segments: { value: number; color: string }[] }) {
  const size = 216;
  const stroke = 30;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);

  if (total <= 0) {
    return (
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full">
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="var(--surface2)" strokeWidth={stroke}
        />
      </svg>
    );
  }

  let acc = 0;
  const gap = segments.length > 1 ? 2.5 : 0;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full">
      {segments.map((s, i) => {
        const arc = (s.value / total) * C;
        const drawn = Math.max(arc - gap, 0.8);
        const offset = -acc - gap / 2;
        acc += arc;
        return (
          <circle
            key={i}
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={s.color} strokeWidth={stroke}
            strokeDasharray={`${drawn} ${C - drawn}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease" }}
          />
        );
      })}
    </svg>
  );
}

export function AnalyticsScreen({ onEdit }: { onEdit: (tx: Transaction) => void }) {
  const { transactions, getCategoryById } = useAppStore();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [subTab, setSubTab] = useState<"overview" | "reports">("overview");
  const [mode, setMode] = useState<Mode>("all");

  const isCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth();

  const prevMonth = () =>
    setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 }));
  const nextMonth = () =>
    setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 }));

  const stats = useMemo(
    () => getMonthStats(transactions, cursor.year, cursor.month),
    [transactions, cursor]
  );

  const categoryRows = useMemo(() => {
    // Группировка по паре «категория + тип», чтобы долги
    // (одна служебная категория на оба направления) не склеивались
    const map = new Map<string, { total: number; type: "income" | "expense" }>();
    for (const t of stats.list) {
      const key = `${t.categoryId}|${t.type}`;
      const entry = map.get(key);
      if (entry) entry.total += t.amount;
      else map.set(key, { total: t.amount, type: t.type });
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [stats.list]);

  const filteredRows = categoryRows.filter(([, v]) => mode === "all" || v.type === mode);

  const donutSegments = useMemo(() => {
    if (mode === "all") {
      return [
        { value: stats.income, color: "var(--income)" },
        { value: stats.expense, color: "var(--expense)" },
      ];
    }
    return filteredRows.map(([, v], i) => ({
      value: v.total,
      color: PALETTE[i % PALETTE.length],
    }));
  }, [mode, stats, filteredRows]);

  const groupTotal = (type: "income" | "expense") => (type === "income" ? stats.income : stats.expense);

  return (
    <div className="space-y-5 pb-36">
      {/* month nav */}
      <div className="animate-rise flex items-center justify-between rounded-full border border-line bg-surface p-1.5">
        <button
          onClick={prevMonth}
          className="press flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface2"
          aria-label="Предыдущий месяц"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="font-display text-[13px] font-semibold tracking-[0.12em] uppercase">
          {MONTH_NAMES[cursor.month]} {cursor.year}
        </p>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="press flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface2 disabled:opacity-30"
          aria-label="Следующий месяц"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* sub tabs */}
      <div className="relative grid animate-rise grid-cols-2 rounded-full border border-line bg-surface p-1" style={{ animationDelay: "60ms" }}>
        <span
          className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-accent transition-transform duration-300"
          style={{ transform: subTab === "reports" ? "translateX(100%)" : "translateX(0)" }}
        />
        <button
          onClick={() => setSubTab("overview")}
          className={`relative z-10 flex h-9 items-center justify-center gap-1.5 rounded-full text-[13px] font-bold transition-colors ${
            subTab === "overview" ? "text-on-accent" : "text-muted"
          }`}
        >
          <ChartPie size={14} />
          Обзор
        </button>
        <button
          onClick={() => setSubTab("reports")}
          className={`relative z-10 flex h-9 items-center justify-center gap-1.5 rounded-full text-[13px] font-bold transition-colors ${
            subTab === "reports" ? "text-on-accent" : "text-muted"
          }`}
        >
          <FileBarChart size={14} />
          Отчёты
        </button>
      </div>

      {subTab === "reports" ? (
        <ReportsScreen />
      ) : (
        <>
          {/* overview card */}
          <section className="animate-rise rounded-[26px] border border-line bg-surface p-5" style={{ animationDelay: "120ms" }}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-muted">Доходы</span>
              <span className="font-display text-[17px] font-semibold text-income tabular-nums">
                {formatMoney(stats.income)}
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-sm font-medium text-muted">Расходы</span>
              <span className="font-display text-[17px] font-semibold text-expense tabular-nums">
                {formatMoney(stats.expense)}
              </span>
            </div>
            <div className="mt-4 flex h-2.5 gap-1 overflow-hidden rounded-full">
              {stats.income + stats.expense === 0 ? (
                <div className="h-full w-full rounded-full bg-surface2" />
              ) : (
                <>
                  <div
                    className="h-full rounded-full bg-income transition-all duration-500"
                    style={{ width: `${(stats.income / (stats.income + stats.expense)) * 100}%` }}
                  />
                  <div
                    className="h-full rounded-full bg-expense transition-all duration-500"
                    style={{ width: `${(stats.expense / (stats.income + stats.expense)) * 100}%` }}
                  />
                </>
              )}
            </div>
            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-sm font-bold">Итого</span>
              <span
                className={`font-display text-[20px] font-semibold tabular-nums ${
                  stats.net > 0 ? "text-income" : stats.net < 0 ? "text-expense" : "text-ink"
                }`}
              >
                {formatMoney(stats.net, true)}
              </span>
            </div>
          </section>

          {/* mode toggle */}
          <div className="relative grid animate-rise grid-cols-3 rounded-full border border-line bg-surface p-1" style={{ animationDelay: "180ms" }}>
            <span
              className="absolute inset-y-1 left-1 w-[calc((100%-8px)/3)] rounded-full bg-accent transition-transform duration-300"
              style={{
                transform:
                  mode === "all" ? "translateX(0)" : mode === "expense" ? "translateX(100%)" : "translateX(200%)",
              }}
            />
            {(
              [
                ["all", "Все"],
                ["expense", "Расходы"],
                ["income", "Доходы"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className={`relative z-10 h-9 rounded-full text-[13px] font-bold transition-colors ${
                  mode === id ? "text-on-accent" : "text-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* donut */}
          <section className="glow-card animate-rise rounded-[26px] border border-line bg-surface p-5" style={{ animationDelay: "240ms" }}>
            <div className="relative mx-auto h-54 w-54">
              <Donut segments={donutSegments} />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                {mode === "all" ? (
                  <>
                    <span
                      className={`font-display text-[21px] leading-none font-semibold ${
                        stats.net >= 0 ? "text-income" : "text-expense"
                      }`}
                    >
                      {formatMoney(Math.abs(stats.net))}
                    </span>
                    <span className="mt-1.5 text-[10px] font-bold tracking-[0.18em] text-muted uppercase">
                      {stats.net >= 0 ? "накоплено" : "перерасход"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-display text-[21px] leading-none font-semibold">
                      {formatMoney(mode === "expense" ? stats.expense : stats.income)}
                    </span>
                    <span className="mt-1.5 text-[10px] font-bold tracking-[0.18em] text-muted uppercase">
                      {mode === "expense" ? "расходы" : "доходы"}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* category list */}
            <div className="mt-6 space-y-3.5">
              {filteredRows.length === 0 && (
                <p className="py-4 text-center text-sm font-medium text-muted">
                  В этом месяце операций нет
                </p>
              )}
              {filteredRows.map(([rowKey, v], i) => {
                const catId = rowKey.split("|")[0];
                const cat = getCategoryById(catId);
                const total = groupTotal(v.type) || 1;
                const pct = Math.round((v.total / total) * 100);
                return (
                  <div key={rowKey}>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface2 text-base">
                        {cat?.icon || "🏷️"}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {cat?.name || "Без категории"}
                        {mode === "all" && (
                          <span
                            className={`ml-1.5 text-[10px] font-bold ${
                              v.type === "income" ? "text-income" : "text-expense"
                            }`}
                          >
                            {v.type === "income" ? "доход" : "расход"}
                          </span>
                        )}
                      </span>
                      <span className="font-display text-[13px] font-medium tabular-nums">
                        {formatMoney(v.total)}
                      </span>
                      <span className="w-10 text-right text-xs font-bold text-muted tabular-nums">
                        {pct}%
                      </span>
                    </div>
                    <div className="mt-1.5 ml-11.5 h-1.5 overflow-hidden rounded-full bg-surface2">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          background:
                            mode === "all"
                              ? v.type === "income"
                                ? "var(--income)"
                                : "var(--expense)"
                              : PALETTE[i % PALETTE.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* transactions of month */}
          {stats.list.length > 0 && (
            <section className="animate-rise" style={{ animationDelay: "300ms" }}>
              <h2 className="mb-2.5 px-1 text-[11px] font-bold tracking-[0.18em] text-muted uppercase">
                Операции месяца
              </h2>
              <div className="divide-y divide-line rounded-[22px] border border-line bg-surface px-4">
                {[...stats.list]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((tx) => (
                    <TransactionItem key={tx.id} tx={tx} onEdit={onEdit} />
                  ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
