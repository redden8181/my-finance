import { useMemo, useRef, useState } from "react";
import { CalendarDays, Check, Plus, X } from "lucide-react";
import { useAppStore } from "../store/StoreContext";
import {
  evaluateExpression,
  formatMoney,
  hasOperator,
  takeLastGrapheme,
  toISODate,
} from "../utils/format";
import { NumberPad } from "./NumberPad";

/** Быстрый выбор срока: через сколько дней планируется трата */
const QUICK_DAYS = [
  { label: "Сегодня", days: 0 },
  { label: "Завтра", days: 1 },
  { label: "Неделя", days: 7 },
];

function isoFromDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function AddPlannedScreen({ onClose }: { onClose: () => void }) {
  const { addPlannedExpense, addCategory, getCategoriesByType } = useAppStore();

  const [expr, setExpr] = useState("");
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dateVal, setDateVal] = useState(isoFromDays(7));
  const [padVisible, setPadVisible] = useState(true);
  const [creatingCat, setCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  const categories = getCategoriesByType("expense");
  const result = useMemo(() => evaluateExpression(expr), [expr]);
  const valid = result !== null && result > 0 && Boolean(title.trim()) && Boolean(categoryId);

  const handleKey = (key: string) => {
    setExpr((prev) => {
      if (key === "backspace") return prev.slice(0, -1);
      if (["÷", "×", "−", "+"].includes(key)) {
        if (prev === "") return prev;
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
      if (prev.length >= 14) return prev;
      return prev + key;
    });
  };

  /** Галочка: прячем калькулятор и переводим курсор на название */
  const confirmAmount = () => {
    titleRef.current?.focus({ preventScroll: true });
    setPadVisible(false);
  };

  const saveCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    const created = addCategory({
      name,
      icon: [...newCatIcon.trim()][0] || "🏷️",
      type: "expense",
    });
    setCategoryId(created.id);
    setCreatingCat(false);
    setNewCatName("");
    setNewCatIcon("");
  };

  const save = () => {
    if (!valid || result === null) return;
    const [y, m, d] = dateVal.split("-").map(Number);
    addPlannedExpense({
      title: title.trim(),
      amount: result,
      categoryId,
      dueDate: new Date(y, m - 1, d, 12, 0, 0).toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] mx-auto flex h-dvh w-full max-w-[430px] animate-sheet flex-col overflow-x-hidden bg-bg">
      <header className="flex items-center gap-3 px-5 pt-safe pb-3">
        <button
          onClick={onClose}
          className="press flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface"
          aria-label="Закрыть"
        >
          <X size={19} />
        </button>
        <h1 className="flex-1 text-center font-display text-[13px] font-semibold tracking-[0.18em] uppercase">
          Планирую трату
        </h1>
        <span className="w-10" />
      </header>

      {/* сумма */}
      <div className="relative z-20 px-5 pt-4 pb-2 text-center">
        <button onClick={() => setPadVisible(true)} className="mx-auto block" aria-label="Показать клавиатуру">
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

      {/* поля */}
      <div className="relative flex-1 overflow-hidden">
        <div className="h-full space-y-5 overflow-y-auto px-5 pb-4 no-scrollbar">
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setPadVisible(false)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            enterKeyHint="done"
            placeholder="На что? Например: стрижка"
            className="h-12.5 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] font-bold outline-none placeholder:font-medium placeholder:text-muted focus:border-accent"
          />

          {/* срок */}
          <div>
            <p className="mb-2 text-[11px] font-bold tracking-[0.18em] text-muted uppercase">
              Когда планируете
            </p>
            <div className="flex items-center gap-2">
              {QUICK_DAYS.map((q) => {
                const iso = isoFromDays(q.days);
                const active = dateVal === iso;
                return (
                  <button
                    key={q.days}
                    onClick={() => setDateVal(iso)}
                    className={`press h-12 min-w-0 flex-1 truncate rounded-2xl border px-1 text-[12px] font-bold ${
                      active
                        ? "border-accent bg-accent-soft text-accent-ink"
                        : "border-line bg-surface text-muted"
                    }`}
                  >
                    {q.label}
                  </button>
                );
              })}
              <label
                className={`relative flex h-12 w-14 shrink-0 cursor-pointer items-center justify-center rounded-2xl border ${
                  QUICK_DAYS.some((q) => isoFromDays(q.days) === dateVal)
                    ? "border-line bg-surface text-muted"
                    : "border-accent bg-accent-soft text-accent-ink"
                }`}
              >
                <CalendarDays size={16} />
                <input
                  type="date"
                  value={dateVal}
                  min={toISODate(new Date())}
                  onFocus={() => setPadVisible(false)}
                  onChange={(e) => e.target.value && setDateVal(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
            </div>
          </div>

          {/* категория */}
          <div>
            <p className="mb-2 text-[11px] font-bold tracking-[0.18em] text-muted uppercase">
              Категория
            </p>
            {creatingCat ? (
              <div className="space-y-3 rounded-[22px] border border-line bg-surface p-4">
                <div className="flex gap-2">
                  <input
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(takeLastGrapheme(e.target.value))}
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

          <p className="rounded-xl bg-surface2/60 px-3 py-2.5 text-[11px] leading-relaxed font-medium text-muted">
            Баланс не изменится — это напоминание отложить деньги. Расход создастся, когда
            отметите трату выполненной.
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
            <NumberPad onKey={handleKey} />
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
            aria-label="Готово, перейти к названию"
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
            Запланировать
          </button>
        )}
      </div>
    </div>
  );
}
