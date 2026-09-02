import { useMemo, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronLeft,
  CircleDollarSign,
  Plus,
  RotateCcw,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useAppStore } from "../store/StoreContext";
import type { DebtDirection } from "../types";
import {
  evaluateExpression,
  formatDateShort,
  formatMoney,
  pluralize,
} from "../utils/format";
import { NumberPad } from "./NumberPad";

export function DebtsScreen({ onClose }: { onClose: () => void }) {
  const { debts, addDebt, toggleDebtPaid, deleteDebt } = useAppStore();

  const [adding, setAdding] = useState(false);
  const [direction, setDirection] = useState<DebtDirection>("owed_to_me");
  const [name, setName] = useState("");
  const [expr, setExpr] = useState("");
  const [comment, setComment] = useState("");
  const [padVisible, setPadVisible] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [nameFocused, setNameFocused] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const result = useMemo(() => evaluateExpression(expr), [expr]);
  const canAdd = Boolean(name.trim()) && result !== null && result > 0;

  const open = useMemo(() => debts.filter((d) => !d.isPaid), [debts]);
  const closed = useMemo(
    () =>
      debts
        .filter((d) => d.isPaid)
        .sort((a, b) => new Date(b.paidAt || 0).getTime() - new Date(a.paidAt || 0).getTime()),
    [debts]
  );

  const iOweTotal = open.filter((d) => d.direction === "i_owe").reduce((s, d) => s + d.amount, 0);
  const owedTotal = open.filter((d) => d.direction === "owed_to_me").reduce((s, d) => s + d.amount, 0);

  /** Открыть калькулятор, предварительно убрав системную клавиатуру */
  const showPad = () => {
    const el = document.activeElement as HTMLElement | null;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) el.blur();
    setPadVisible(true);
  };

  /**
   * Галочка: сумма введена → прячем калькулятор и переходим к имени.
   * focus() вызывается СИНХРОННО внутри обработчика клика — iOS поднимает
   * клавиатуру только в рамках пользовательского жеста (setTimeout её ломает).
   */
  const confirmAmount = () => {
    nameRef.current?.focus({ preventScroll: true });
    setPadVisible(false);
  };

  const handleKey = (key: string) => {
    setExpr((prev) => {
      if (key === "backspace") return prev.slice(0, -1);
      if (key === ",") {
        if (prev.includes(",")) return prev;
        return (prev || "0") + ",";
      }
      if (prev.length >= 10) return prev;
      return prev + key;
    });
  };

  const submit = () => {
    if (!canAdd || result === null) return;
    addDebt({ direction, personName: name.trim(), amount: result, comment: comment.trim() });
    setName("");
    setExpr("");
    setComment("");
    setAdding(false);
    setPadVisible(true);
    setNameFocused(false);
  };

  const dayCount = (from: string, to?: string) => {
    const ms = new Date(to || new Date().toISOString()).getTime() - new Date(from).getTime();
    return Math.max(0, Math.floor(ms / 86400000));
  };

  return (
    <div className="fixed inset-0 z-[55] mx-auto flex h-dvh w-full max-w-[430px] animate-sheet flex-col bg-bg">
      <header className="flex items-center gap-3 px-5 pt-safe pb-3">
        <button
          onClick={onClose}
          className="press flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface"
          aria-label="Назад"
        >
          <ChevronLeft size={19} />
        </button>
        <h1 className="flex-1 text-center font-display text-[13px] font-semibold tracking-[0.18em] uppercase">
          Долги
        </h1>
        <span className="w-10" />
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-10 no-scrollbar">
        {/* summary */}
        <div className="grid animate-rise grid-cols-2 gap-2.5">
          <div className="rounded-[22px] border border-line bg-surface p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-expense-soft">
              <ArrowUpRight size={15} className="text-expense" strokeWidth={2.6} />
            </span>
            <p className="mt-2.5 text-[10px] font-bold tracking-[0.16em] text-muted uppercase">Я должен</p>
            <p className="font-display text-[17px] font-semibold text-expense tabular-nums">
              {formatMoney(iOweTotal)}
            </p>
          </div>
          <div className="rounded-[22px] border border-line bg-surface p-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-income-soft">
              <ArrowDownLeft size={15} className="text-income" strokeWidth={2.6} />
            </span>
            <p className="mt-2.5 text-[10px] font-bold tracking-[0.16em] text-muted uppercase">Мне должны</p>
            <p className="font-display text-[17px] font-semibold text-income tabular-nums">
              {formatMoney(owedTotal)}
            </p>
          </div>
        </div>

        {/* add */}
        <button
          onClick={() => {
            setAdding(true);
            setPadVisible(true);
            setConfirmDeleteId(null);
          }}
          className="press glow-accent animate-rise flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-[15px] font-bold text-on-accent"
        >
          <Plus size={18} strokeWidth={2.8} />
          Новый долг
        </button>

        {/* open debts */}
        {open.length > 0 && (
          <section className="animate-rise" style={{ animationDelay: "80ms" }}>
            <h2 className="mb-2.5 px-1 text-[11px] font-bold tracking-[0.18em] text-muted uppercase">
              Активные · {open.length}
            </h2>
            <div className="space-y-2.5">
              {open.map((d) => (
                <div key={d.id} className="rounded-[22px] border border-line bg-surface p-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                        d.direction === "owed_to_me" ? "bg-income-soft" : "bg-expense-soft"
                      }`}
                    >
                      <UserRound
                        size={19}
                        className={d.direction === "owed_to_me" ? "text-income" : "text-expense"}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold">{d.personName}</p>
                      <p className="text-xs font-medium text-muted">
                        {d.direction === "owed_to_me" ? "Вам должны" : "Вы должны"} · от{" "}
                        {formatDateShort(d.createdAt)}
                      </p>
                    </div>
                    <p
                      className={`font-display text-[15px] font-semibold tabular-nums ${
                        d.direction === "owed_to_me" ? "text-income" : "text-expense"
                      }`}
                    >
                      {formatMoney(d.amount)}
                    </p>
                  </div>
                  {d.comment ? (
                    <p className="mt-2 rounded-xl bg-surface2/60 px-3 py-2 text-xs font-medium text-muted">
                      {d.comment}
                    </p>
                  ) : null}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => toggleDebtPaid(d.id)}
                      className="press flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-income-soft text-[13px] font-bold text-income"
                    >
                      <Check size={15} strokeWidth={3} />
                      Погашен
                    </button>
                    {confirmDeleteId === d.id ? (
                      <button
                        onClick={() => {
                          deleteDebt(d.id);
                          setConfirmDeleteId(null);
                        }}
                        className="press flex h-10 items-center justify-center gap-1.5 rounded-xl bg-expense px-3 text-[13px] font-bold text-on-accent"
                      >
                        <Trash2 size={14} />
                        Точно?
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(d.id)}
                        className="press flex h-10 w-10 items-center justify-center rounded-xl bg-surface2 text-muted"
                        aria-label="Удалить долг"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* history */}
        {closed.length > 0 && (
          <section className="animate-rise" style={{ animationDelay: "140ms" }}>
            <h2 className="mb-2.5 px-1 text-[11px] font-bold tracking-[0.18em] text-muted uppercase">
              История
            </h2>
            <div className="space-y-2.5">
              {closed.map((d) => (
                <div key={d.id} className="rounded-[22px] border border-line bg-surface p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface2">
                      <CircleDollarSign size={18} className="text-muted" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate text-[15px] font-bold">
                        {d.personName}
                        <span className="rounded-full bg-income-soft px-2 py-0.5 text-[10px] font-bold text-income">
                          закрыт
                        </span>
                      </p>
                      <p className="text-xs font-medium text-muted">
                        {d.direction === "owed_to_me" ? "Вам вернули" : "Вы вернули"} ·{" "}
                        <span className="tabular-nums">{formatMoney(d.amount)}</span>
                      </p>
                    </div>
                  </div>

                  {/* timeline */}
                  <div className="mt-3 ml-5 space-y-0 border-l-2 border-line pl-4">
                    <div className="relative pb-2.5">
                      <span className="absolute top-1 -left-[21px] h-2 w-2 rounded-full bg-muted" />
                      <p className="text-xs font-medium text-muted">
                        Открыт · {formatDateShort(d.createdAt)}
                      </p>
                    </div>
                    <div className="relative">
                      <span className="absolute top-1 -left-[21px] h-2 w-2 rounded-full bg-income" />
                      <p className="text-xs font-bold text-ink">
                        Закрыт · {d.paidAt ? formatDateShort(d.paidAt) : "—"}
                        <span className="ml-1.5 font-medium text-muted">
                          ({dayCount(d.createdAt, d.paidAt)}{" "}
                          {pluralize(dayCount(d.createdAt, d.paidAt), "день", "дня", "дней")})
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => toggleDebtPaid(d.id)}
                      className="press flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-surface2 text-[13px] font-bold text-muted"
                    >
                      <RotateCcw size={14} />
                      Вернуть в активные
                    </button>
                    {confirmDeleteId === d.id ? (
                      <button
                        onClick={() => {
                          deleteDebt(d.id);
                          setConfirmDeleteId(null);
                        }}
                        className="press flex h-9 items-center justify-center gap-1 rounded-xl bg-expense px-3 text-[13px] font-bold text-on-accent"
                      >
                        Точно?
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(d.id)}
                        className="press flex h-9 w-9 items-center justify-center rounded-xl bg-surface2 text-muted"
                        aria-label="Удалить долг"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {open.length === 0 && closed.length === 0 && !adding && (
          <div className="flex flex-col items-center rounded-[26px] border border-dashed border-line bg-surface/40 px-6 py-12 text-center">
            <span className="glow-accent flex h-20 w-20 items-center justify-center rounded-full bg-accent-soft">
              <CircleDollarSign size={34} className="text-accent-ink" strokeWidth={1.8} />
            </span>
            <p className="mt-4 font-display text-[15px] font-semibold">Долгов нет</p>
            <p className="mt-1.5 max-w-[250px] text-sm font-medium text-muted">
              Здесь появятся записи, когда вы кому-то одолжите деньги или возьмёте в долг
            </p>
          </div>
        )}
      </div>

      {/* форма нового долга */}
      {adding && (
        <div className="fixed inset-0 z-[60] mx-auto flex h-dvh w-full max-w-[430px] animate-sheet flex-col bg-bg">
          <header className="flex items-center gap-3 px-5 pt-safe pb-3">
            <button
              onClick={() => setAdding(false)}
              className="press flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface"
              aria-label="Закрыть"
            >
              <X size={19} />
            </button>
            <h1 className="flex-1 text-center font-display text-[13px] font-semibold tracking-[0.18em] uppercase">
              Новый долг
            </h1>
            <span className="w-10" />
          </header>

          {/* направление */}
          <div className="px-5">
            <div className="relative grid grid-cols-2 rounded-full border border-line bg-surface p-1">
              <span
                className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full transition-all duration-300"
                style={{
                  transform: direction === "i_owe" ? "translateX(100%)" : "translateX(0)",
                  background: direction === "i_owe" ? "var(--expense)" : "var(--income)",
                }}
              />
              <button
                onClick={() => setDirection("owed_to_me")}
                className={`relative z-10 h-9.5 rounded-full text-[13px] font-bold transition-colors ${
                  direction === "owed_to_me" ? "text-on-accent" : "text-muted"
                }`}
              >
                Мне должны
              </button>
              <button
                onClick={() => setDirection("i_owe")}
                className={`relative z-10 h-9.5 rounded-full text-[13px] font-bold transition-colors ${
                  direction === "i_owe" ? "text-on-accent" : "text-muted"
                }`}
              >
                Я должен
              </button>
            </div>
          </div>

          {/* сумма */}
          <div className="relative z-20 px-5 pt-5 pb-3 text-center">
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
          </div>

          {/* поля */}
          <div className="relative flex-1 overflow-hidden">
            <div className="h-full space-y-2.5 overflow-y-auto px-5 pb-4 no-scrollbar">
              <div className="relative">
                <input
                  ref={nameRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => {
                    setPadVisible(false);
                    setNameFocused(true);
                  }}
                  onBlur={() => setNameFocused(false)}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  enterKeyHint="done"
                  placeholder="Имя человека"
                  className="h-12.5 w-full rounded-2xl border border-line bg-surface pl-4 pr-14 text-[15px] font-bold outline-none placeholder:font-medium placeholder:text-muted focus:border-accent"
                />
                {nameFocused && (
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => nameRef.current?.blur()}
                    className="press glow-accent animate-pop absolute top-1/2 right-2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-on-accent"
                    aria-label="Готово, скрыть клавиатуру"
                  >
                    <Check size={19} strokeWidth={3.2} />
                  </button>
                )}
              </div>
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onFocus={() => setPadVisible(false)}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                enterKeyHint="done"
                placeholder="Комментарий (необязательно)"
                className="h-12.5 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] font-bold outline-none placeholder:font-medium placeholder:text-muted focus:border-accent"
              />
              <p className="px-1 pt-1 text-xs font-medium text-muted">
                {direction === "owed_to_me"
                  ? "Сумма спишется с баланса — вы отдаёте деньги."
                  : "Сумма добавится к балансу — вы получаете деньги."}
              </p>
            </div>

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

          {/* клавиатура + действие */}
          <div
            className={`relative z-20 px-5 pt-3 pb-safe ${
              padVisible
                ? "pad-panel rounded-t-[26px] border-t border-line bg-surface"
                : "border-t border-line bg-bg"
            }`}
          >
            {padVisible && (
              <div className="animate-pop">
                <NumberPad onKey={handleKey} withOperators={false} />
              </div>
            )}

            {padVisible ? (
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={confirmAmount}
                className={`press mt-2.5 mb-1 flex h-14 w-full items-center justify-center rounded-2xl ${
                  result !== null && result > 0
                    ? "glow-accent bg-accent text-on-accent"
                    : "bg-surface2 text-muted"
                }`}
                aria-label="Готово, перейти к имени"
              >
                <Check size={28} strokeWidth={3.2} />
              </button>
            ) : (
              <button
                onClick={submit}
                disabled={!canAdd}
                className={`press mt-2.5 mb-1 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-extrabold ${
                  canAdd ? "glow-accent bg-accent text-on-accent" : "bg-surface2 text-muted"
                }`}
              >
                <Check size={18} strokeWidth={3.2} />
                Добавить долг
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
