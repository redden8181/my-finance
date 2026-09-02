import { useMemo, useState } from "react";
import { CalendarDays, Check, Minus, Plus, Sparkles, X } from "lucide-react";
import { useAppStore } from "../store/StoreContext";
import { getQuickSpends } from "../store/useStore";
import type {
  RecurrencePeriod,
  Transaction,
  TransactionFlag,
  TransactionType,
} from "../types";
import {
  evaluateExpression,
  formatMoney,
  hasOperator,
  toISODate,
} from "../utils/format";
import { NumberPad } from "./NumberPad";

const FLAGS: { id: TransactionFlag; label: string }[] = [
  { id: "mandatory", label: "Обязательная" },
  { id: "spontaneous", label: "Спонтанная" },
  { id: "planned", label: "Запланированная" },
  { id: "regular", label: "Регулярная" },
];

const PERIODS: { id: RecurrencePeriod; label: string }[] = [
  { id: "daily", label: "Ежедневно" },
  { id: "weekly", label: "Еженедельно" },
  { id: "monthly", label: "Ежемесячно" },
  { id: "yearly", label: "Ежегодно" },
];

export function AddTransactionScreen({
  initial,
  onClose,
}: {
  initial?: Transaction | null;
  onClose: () => void;
}) {
  const { addTransaction, updateTransaction, addCategory, getCategoriesByType, transactions } =
    useAppStore();

  const editing = Boolean(initial);
  const [type, setType] = useState<TransactionType>(initial?.type || "expense");
  const [expr, setExpr] = useState<string>(initial ? String(initial.amount) : "");
  const [categoryId, setCategoryId] = useState<string>(initial?.categoryId || "");
  const [comment, setComment] = useState(initial?.comment || "");
  const [flag, setFlag] = useState<TransactionFlag>(initial?.flag || "planned");
  const [period, setPeriod] = useState<RecurrencePeriod>(initial?.recurrencePeriod || "monthly");
  const [dueDay, setDueDay] = useState<number>(initial?.dueDay || 15);
  const [dateVal, setDateVal] = useState<string>(
    initial ? toISODate(new Date(initial.date)) : toISODate(new Date())
  );
  const [creatingCat, setCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("");
  const [padVisible, setPadVisible] = useState(true);

  const categories = getCategoriesByType(type);
  const result = useMemo(() => evaluateExpression(expr), [expr]);
  const valid = result !== null && result > 0 && Boolean(categoryId);

  const quickSpends = useMemo(
    () => (editing || type !== "expense" ? [] : getQuickSpends(transactions, 6)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions, type, editing]
  );

  /** Открыть калькулятор, предварительно убрав системную клавиатуру */
  const showPad = () => {
    const el = document.activeElement as HTMLElement | null;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) el.blur();
    setPadVisible(true);
  };

  const handleKey = (key: string) => {
    setExpr((prev) => {
      if (key === "backspace") return prev.slice(0, -1);
      if (["÷", "×", "−", "+"].includes(key)) {
        if (prev === "") return key === "−" ? "−" : prev;
        const last = prev.slice(-1);
        if (["÷", "×", "−", "+"].includes(last)) return prev.slice(0, -1) + key;
        if (prev.length >= 18) return prev;
        return prev + key;
      }
      if (key === ",") {
        const parts = prev.split(/[÷×−+]/);
        if (parts[parts.length - 1].includes(",")) return prev;
        if (prev === "" || /[÷×−+]/.test(prev.slice(-1))) return prev + "0,";
        return prev + ",";
      }
      if (prev.replace(/[-]/, "").length >= 14) return prev;
      return prev + key;
    });
  };

  const switchType = (t: TransactionType) => {
    setType(t);
    const cat = getCategoriesByType(t).find((c) => c.id === categoryId);
    if (!cat) setCategoryId("");
    setCreatingCat(false);
  };

  const saveCategory = () => {
    const icon = [...newCatIcon.trim()][0] || "🏷️";
    const name = newCatName.trim();
    if (!name) return;
    const created = addCategory({ name, icon, type });
    setCategoryId(created.id);
    setCreatingCat(false);
    setNewCatName("");
    setNewCatIcon("");
  };

  const save = () => {
    if (!valid || result === null) return;
    const now = new Date();
    const [y, m, d] = dateVal.split("-").map(Number);
    const date = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
    const payload = {
      type,
      amount: result,
      categoryId,
      comment: comment.trim(),
      date: date.toISOString(),
      flag,
      recurrencePeriod: flag === "regular" ? period : undefined,
      dueDay: flag === "regular" && period === "monthly" ? dueDay : undefined,
    };
    if (editing && initial) {
      updateTransaction(initial.id, payload);
    } else {
      addTransaction(payload);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] mx-auto flex h-dvh w-full max-w-[430px] animate-sheet flex-col bg-bg">
      {/* header */}
      <header className="flex items-center gap-3 px-5 pt-safe pb-3">
        <button
          onClick={onClose}
          className="press flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface"
          aria-label="Закрыть"
        >
          <X size={19} />
        </button>
        <h1 className="flex-1 text-center font-display text-[13px] font-semibold tracking-[0.18em] uppercase">
          {editing ? "Изменить" : "Новая операция"}
        </h1>
        <span className="w-10" />
      </header>

      {/* type switch */}
      <div className="px-5">
        <div className="relative grid grid-cols-2 rounded-full border border-line bg-surface p-1">
          <span
            className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              transform: type === "income" ? "translateX(100%)" : "translateX(0)",
              background: type === "income" ? "var(--accent)" : "var(--expense)",
            }}
          />
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              onClick={() => switchType(t)}
              className={`relative z-10 h-9.5 rounded-full text-[13px] font-bold transition-colors duration-300 ${
                type === t ? "text-on-accent" : "text-muted"
              }`}
            >
              {t === "expense" ? "Расход" : "Доход"}
            </button>
          ))}
        </div>
      </div>

      {/* amount */}
      <div className="relative z-20 px-5 pt-5 pb-2 text-center">
        <button
          onClick={showPad}
          className="mx-auto block"
          aria-label="Показать клавиатуру"
        >
          <p
            className={`min-h-13 font-display text-[40px] leading-none font-semibold tracking-tight ${
              expr ? "text-ink" : "text-muted/40"
            }`}
          >
            {expr || "0"}
            <span className="ml-1.5 text-[22px] text-muted">₽</span>
          </p>
        </button>
        <p className="mt-1 h-5 text-sm font-bold text-accent-ink tabular-nums">
          {hasOperator(expr) && result !== null ? `= ${formatMoney(result)}` : ""}
        </p>
      </div>

      {/* scrollable form */}
      <div className="relative flex-1 overflow-hidden">
        <div className="h-full space-y-5 overflow-y-auto px-5 pt-1 pb-4 no-scrollbar">
        {/* quick spends */}
        {quickSpends.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.18em] text-muted uppercase">
              <Sparkles size={12} />
              Быстрые траты
            </p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {quickSpends.map((q, i) => {
                const cat = categories.find((c) => c.id === q.categoryId);
                if (!cat) return null;
                const active = categoryId === q.categoryId && expr === String(q.amount);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setCategoryId(q.categoryId);
                      setExpr(String(q.amount));
                    }}
                    className={`press flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-bold ${
                      active
                        ? "border-accent bg-accent-soft text-accent-ink"
                        : "border-line bg-surface text-ink"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span className="tabular-nums">{formatMoney(q.amount)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* categories */}
        <div>
          <p className="mb-2 text-[11px] font-bold tracking-[0.18em] text-muted uppercase">
            Категория
          </p>
          {creatingCat ? (
            <div className="space-y-3 rounded-[22px] border border-line bg-surface p-4">
              <div className="flex gap-2">
                <input
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon([...e.target.value].slice(-1).join(""))}
                  onFocus={() => setPadVisible(false)}
                  placeholder="😀"
                  className="h-12 w-14 rounded-2xl bg-surface2 text-center text-xl outline-none"
                />
                <input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onFocus={() => setPadVisible(false)}
                  onKeyDown={(e) => e.key === "Enter" && saveCategory()}
                  enterKeyHint="done"
                  placeholder="Название категории"
                  autoFocus
                  className="h-12 flex-1 rounded-2xl bg-surface2 px-4 text-[15px] font-bold outline-none placeholder:font-medium placeholder:text-muted"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCreatingCat(false)}
                  className="press h-11 rounded-2xl bg-surface2 text-sm font-bold text-muted"
                >
                  Отмена
                </button>
                <button
                  onClick={saveCategory}
                  disabled={!newCatName.trim()}
                  className="press h-11 rounded-2xl bg-accent text-sm font-bold text-on-accent disabled:opacity-40"
                >
                  Создать
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {categories.map((c) => {
                const active = categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategoryId(c.id)}
                    className={`press flex aspect-[0.95] flex-col items-center justify-center gap-1 rounded-[20px] border p-1.5 ${
                      active
                        ? "border-accent bg-accent-soft shadow-[0_0_0_1px_var(--accent),0_8px_28px_-10px_var(--accent)]"
                        : "border-line bg-surface"
                    }`}
                  >
                    <span className="text-[22px] leading-none">{c.icon}</span>
                    <span
                      className={`w-full truncate text-center text-[10px] leading-tight font-bold ${
                        active ? "text-accent-ink" : "text-ink"
                      }`}
                    >
                      {c.name}
                    </span>
                  </button>
                );
              })}
              <button
                onClick={() => {
                  setCreatingCat(true);
                  setPadVisible(false);
                }}
                className="press flex aspect-[0.95] flex-col items-center justify-center gap-1 rounded-[20px] border border-dashed border-muted/50 p-1.5 text-muted"
              >
                <Plus size={20} strokeWidth={2.5} />
                <span className="text-[10px] font-bold">Создать</span>
              </button>
            </div>
          )}
        </div>

        {/* flags */}
        <div>
          <p className="mb-2 text-[11px] font-bold tracking-[0.18em] text-muted uppercase">
            Метка
          </p>
          <div className="flex flex-wrap gap-2">
            {FLAGS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFlag(f.id)}
                className={`press rounded-full border px-3.5 py-2 text-[13px] font-bold ${
                  flag === f.id
                    ? "border-accent bg-accent-soft text-accent-ink"
                    : "border-line bg-surface text-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* recurrence */}
        {flag === "regular" && (
          <div className="space-y-3 rounded-[22px] border border-line bg-surface p-4">
            <div className="flex flex-wrap gap-2">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`press rounded-full px-3.5 py-2 text-[13px] font-bold ${
                    period === p.id
                      ? "bg-accent text-on-accent"
                      : "bg-surface2 text-muted"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {period === "monthly" && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">День платежа</p>
                  <p className="text-xs font-medium text-muted">Напомним за 10 дней до срока</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDueDay((d) => Math.max(1, d - 1))}
                    className="press flex h-9 w-9 items-center justify-center rounded-full bg-surface2"
                    aria-label="Меньше"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center font-display text-[17px] font-semibold tabular-nums">
                    {dueDay}
                  </span>
                  <button
                    onClick={() => setDueDay((d) => Math.min(31, d + 1))}
                    className="press flex h-9 w-9 items-center justify-center rounded-full bg-surface2"
                    aria-label="Больше"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* comment + date */}
        <div className="grid gap-2.5">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onFocus={() => setPadVisible(false)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            enterKeyHint="done"
            placeholder="Комментарий (необязательно)"
            className="h-12.5 rounded-2xl border border-line bg-surface px-4 text-[15px] font-bold outline-none placeholder:font-medium placeholder:text-muted focus:border-accent"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDateVal(toISODate(new Date()))}
              className={`press h-12.5 flex-1 rounded-2xl border text-sm font-bold ${
                dateVal === toISODate(new Date())
                  ? "border-accent bg-accent-soft text-accent-ink"
                  : "border-line bg-surface text-muted"
              }`}
            >
              Сегодня
            </button>
            <button
              onClick={() => {
                const y = new Date();
                y.setDate(y.getDate() - 1);
                setDateVal(toISODate(y));
              }}
              className="press h-12.5 flex-1 rounded-2xl border border-line bg-surface text-sm font-bold text-muted"
            >
              Вчера
            </button>
            <label className="relative flex h-12.5 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-line bg-surface text-sm font-bold text-muted">
              <CalendarDays size={16} />
              <input
                type="date"
                value={dateVal}
                max={toISODate(new Date())}
                onFocus={() => setPadVisible(false)}
                onChange={(e) => e.target.value && setDateVal(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              {dateVal === toISODate(new Date()) ? "Дата" : dateVal.split("-").reverse().slice(0, 2).join(".")}
            </label>
          </div>
        </div>
        </div>

        {/* затемнение фона, пока открыт калькулятор */}
        {padVisible && (
          <button
            onClick={() => setPadVisible(false)}
            className="absolute inset-0 z-10 animate-fade cursor-default"
            style={{ background: "var(--focus-scrim)" }}
            aria-label="Скрыть клавиатуру"
            tabIndex={-1}
          />
        )}
      </div>

      {/* pad + save */}
      <div
        className={`relative z-20 px-5 pt-3 pb-safe ${
          padVisible
            ? "pad-panel rounded-t-[26px] border-t border-line bg-surface"
            : "border-t border-line bg-bg"
        }`}
      >
        {padVisible && (
          <div className="animate-pop">
            <NumberPad onKey={handleKey} />
          </div>
        )}

        {padVisible ? (
          <button
            onClick={() => setPadVisible(false)}
            className={`press mt-2.5 mb-1 flex h-14 w-full items-center justify-center rounded-2xl ${
              result !== null && result > 0
                ? "glow-accent bg-accent text-on-accent"
                : "bg-surface2 text-muted"
            }`}
            aria-label="Готово, скрыть клавиатуру"
          >
            <Check size={28} strokeWidth={3.2} />
          </button>
        ) : (
          <button
            onClick={save}
            disabled={!valid}
            className={`press mt-2.5 mb-1 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-extrabold ${
              valid ? "glow-accent bg-accent text-on-accent" : "bg-surface2 text-muted"
            }`}
          >
            <Check size={18} strokeWidth={3.2} />
            {editing ? "Сохранить" : type === "income" ? "Добавить доход" : "Добавить расход"}
          </button>
        )}
      </div>
    </div>
  );
}
