import { useRef, useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Download,
  Info,
  Moon,
  Pencil,
  Plus,
  Scale,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import { useAppStore } from "../store/StoreContext";
import { isSpecialCategoryId } from "../store/useStore";
import type { TransactionType } from "../types";
import { AdjustBalanceSheet } from "./AdjustBalanceSheet";

const APP_VERSION = "2.0";
const BUILD_TIME =
  typeof (globalThis as Record<string, unknown>).__BUILD_TIME__ === "string"
    ? ((globalThis as Record<string, unknown>).__BUILD_TIME__ as string)
    : "локальная сборка";

const HOLD_MS = 2500;

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const {
    settings,
    setTheme,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    moveCategory,
    exportData,
    importData,
    resetAllData,
  } = useAppStore();

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [newType, setNewType] = useState<TransactionType>("expense");
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [holdProgress, setHoldProgress] = useState(0);
  const holdRaf = useRef<number>(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2600);
  };

  const doExport = () => {
    try {
      const json = exportData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `koshelek-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      flash("Экспорт готов");
    } catch {
      flash("Не удалось экспортировать");
    }
  };

  const doImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importData(String(reader.result || ""));
      flash(ok ? "Данные восстановлены" : "Файл не подходит");
    };
    reader.onerror = () => flash("Не удалось прочитать файл");
    reader.readAsText(file);
  };

  const startHold = () => {
    const started = performance.now();
    const tick = (t: number) => {
      const p = (t - started) / HOLD_MS;
      if (p >= 1) {
        setHoldProgress(0);
        resetAllData();
        flash("Все данные удалены");
        return;
      }
      setHoldProgress(p);
      holdRaf.current = requestAnimationFrame(tick);
    };
    holdRaf.current = requestAnimationFrame(tick);
  };
  const cancelHold = () => {
    cancelAnimationFrame(holdRaf.current);
    setHoldProgress(0);
  };

  const startEdit = (id: string, name: string, icon: string) => {
    setEditingId(id);
    setEditName(name);
    setEditIcon(icon);
  };
  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    updateCategory(editingId, {
      name: editName.trim(),
      icon: [...editIcon.trim()][0] || "🏷️",
    });
    setEditingId(null);
  };

  // Служебные категории (долги, корректировка) полностью скрыты из настроек
  const visibleCategories = categories.filter(
    (c) => !c.isSpecial && !isSpecialCategoryId(c.id)
  );

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
          Настройки
        </h1>
        <span className="w-10" />
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 pb-10 no-scrollbar">
        {message && (
          <div className="animate-pop sticky top-1 z-10 mx-auto w-fit rounded-full bg-ink px-4 py-2 text-center text-[13px] font-bold text-bg shadow-lg">
            {message}
          </div>
        )}

        {/* theme */}
        <section className="animate-rise">
          <h2 className="mb-2.5 px-1 text-[11px] font-bold tracking-[0.18em] text-muted uppercase">
            Внешний вид
          </h2>
          <div className="relative grid grid-cols-2 rounded-full border border-line bg-surface p-1">
            <span
              className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-accent transition-transform duration-300"
              style={{ transform: settings.theme === "dark" ? "translateX(100%)" : "translateX(0)" }}
            />
            <button
              onClick={() => setTheme("light")}
              className={`relative z-10 flex h-10 items-center justify-center gap-2 rounded-full text-[13px] font-bold transition-colors ${
                settings.theme === "light" ? "text-on-accent" : "text-muted"
              }`}
            >
              <Sun size={15} />
              Светлая
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`relative z-10 flex h-10 items-center justify-center gap-2 rounded-full text-[13px] font-bold transition-colors ${
                settings.theme === "dark" ? "text-on-accent" : "text-muted"
              }`}
            >
              <Moon size={15} />
              Тёмная
            </button>
          </div>
        </section>

        {/* categories */}
        <section className="animate-rise" style={{ animationDelay: "60ms" }}>
          <div className="mb-2.5 flex items-center justify-between px-1">
            <h2 className="text-[11px] font-bold tracking-[0.18em] text-muted uppercase">
              Категории
            </h2>
            <button
              onClick={() => {
                setReorderMode((v) => !v);
                setEditingId(null);
              }}
              className={`press flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                reorderMode
                  ? "border-accent bg-accent-soft text-accent-ink"
                  : "border-line bg-surface text-muted"
              }`}
            >
              <ArrowUpDown size={12} />
              {reorderMode ? "Готово" : "Порядок"}
            </button>
          </div>
          <div className="space-y-4">
            {(["expense", "income"] as const).map((type) => {
              const group = visibleCategories.filter((c) => c.type === type);
              return (
                <div key={type}>
                  <p className="mb-1.5 px-1 text-[11px] font-bold tracking-[0.16em] text-muted uppercase">
                    {type === "expense" ? "Расходы" : "Доходы"}
                  </p>
                  <div className="divide-y divide-line rounded-[22px] border border-line bg-surface px-3.5">
                    {group.map((c, pos) => (
                      <div key={c.id} className="flex items-center gap-3 py-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-surface2 text-base">
                          {c.icon}
                        </span>
                        {editingId === c.id && !reorderMode ? (
                          <>
                            <input
                              value={editIcon}
                              onChange={(e) =>
                                setEditIcon([...e.target.value].slice(-1).join(""))
                              }
                              className="h-10 w-11 shrink-0 rounded-xl bg-surface2 text-center text-lg outline-none"
                            />
                            <input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                              autoFocus
                              className="h-10 min-w-0 flex-1 rounded-xl bg-surface2 px-3 text-sm font-bold outline-none"
                            />
                            <button
                              onClick={saveEdit}
                              className="press shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-on-accent"
                            >
                              Ок
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                              {c.name}
                            </span>
                            {reorderMode ? (
                              <span className="flex shrink-0 items-center gap-1">
                                <button
                                  onClick={() => moveCategory(c.id, -1)}
                                  disabled={pos === 0}
                                  className="press flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface2 disabled:opacity-30"
                                  aria-label="Выше"
                                >
                                  <ChevronUp size={15} />
                                </button>
                                <button
                                  onClick={() => moveCategory(c.id, 1)}
                                  disabled={pos === group.length - 1}
                                  className="press flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface2 disabled:opacity-30"
                                  aria-label="Ниже"
                                >
                                  <ChevronDown size={15} />
                                </button>
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(c.id, c.name, c.icon)}
                                  className="press flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface2"
                                  aria-label="Изменить категорию"
                                >
                                  <Pencil size={14} />
                                </button>
                                {confirmDeleteId === c.id ? (
                                  <button
                                    onClick={() => {
                                      deleteCategory(c.id);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="press shrink-0 rounded-full bg-expense px-2.5 py-1.5 text-[11px] font-bold text-on-accent"
                                  >
                                    Точно?
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDeleteId(c.id)}
                                    className="press flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface2"
                                    aria-label="Удалить категорию"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* new category */}
            <div className="space-y-2.5 rounded-[22px] border border-line bg-surface p-3.5">
              <div className="flex gap-2">
                {(["expense", "income"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setNewType(t)}
                    className={`press h-9 flex-1 rounded-full text-[13px] font-bold ${
                      newType === t ? "bg-accent text-on-accent" : "bg-surface2 text-muted"
                    }`}
                  >
                    {t === "expense" ? "Расход" : "Доход"}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newIcon}
                  onChange={(e) => setNewIcon([...e.target.value].slice(-1).join(""))}
                  placeholder="😀"
                  className="h-11 w-13 rounded-2xl bg-surface2 text-center text-lg outline-none"
                />
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Новая категория"
                  className="h-11 min-w-0 flex-1 rounded-2xl bg-surface2 px-4 text-sm font-bold outline-none placeholder:font-medium placeholder:text-muted"
                />
                <button
                  onClick={() => {
                    if (!newName.trim()) return;
                    addCategory({
                      name: newName.trim(),
                      icon: [...newIcon.trim()][0] || "🏷️",
                      type: newType,
                    });
                    setNewName("");
                    setNewIcon("");
                    flash("Категория добавлена");
                  }}
                  disabled={!newName.trim()}
                  className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-on-accent disabled:opacity-40"
                  aria-label="Добавить категорию"
                >
                  <Plus size={18} strokeWidth={2.8} />
                </button>
              </div>
              <p className="px-1 text-[11px] font-medium text-muted">
                Эмодзи можно вставить с клавиатуры телефона
              </p>
            </div>
          </div>
        </section>

        {/* data */}
        <section className="animate-rise" style={{ animationDelay: "120ms" }}>
          <h2 className="mb-2.5 px-1 text-[11px] font-bold tracking-[0.18em] text-muted uppercase">
            Данные
          </h2>
          <div className="divide-y divide-line rounded-[22px] border border-line bg-surface">
            <button
              onClick={() => setAdjustOpen(true)}
              className="press flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft">
                <Scale size={16} className="text-accent-ink" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold">Скорректировать баланс</span>
                <span className="block text-xs font-medium text-muted">
                  Если сумма в приложении отличается от реальной
                </span>
              </span>
            </button>
            <button
              onClick={doExport}
              className="press flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface2">
                <Download size={16} />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold">Экспорт в JSON</span>
                <span className="block text-xs font-medium text-muted">
                  Скачать резервную копию всех данных
                </span>
              </span>
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="press flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface2">
                <Upload size={16} />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold">Импорт из JSON</span>
                <span className="block text-xs font-medium text-muted">
                  Восстановить данные из резервной копии
                </span>
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) doImport(f);
                  e.target.value = "";
                }}
              />
            </button>
          </div>

          {/* hold to reset */}
          <button
            onPointerDown={startHold}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            onContextMenu={(e) => e.preventDefault()}
            className="relative mt-4 block h-13 w-full touch-none overflow-hidden rounded-2xl border border-expense/40 text-[15px] font-extrabold text-expense select-none"
          >
            <span
              className="absolute inset-y-0 left-0 bg-expense/20"
              style={{ width: `${holdProgress * 100}%` }}
            />
            <span className="relative">
              {holdProgress > 0 ? "Удерживайте…" : "Сбросить все данные (удерживать 2,5 сек)"}
            </span>
          </button>
        </section>

        {/* about */}
        <section className="animate-rise rounded-[22px] border border-line bg-surface p-4" style={{ animationDelay: "180ms" }}>
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface2">
              <Info size={16} className="text-muted" />
            </span>
            <div className="text-xs leading-relaxed font-medium text-muted">
              <p className="font-display text-[13px] font-semibold text-ink">Кошелёк</p>
              <p className="mt-0.5">
                Версия {APP_VERSION} · {BUILD_TIME}
              </p>
              <p className="mt-1.5">
                Все данные хранятся локально на этом устройстве. Работает офлайн после первой
                загрузки.
              </p>
            </div>
          </div>
        </section>
      </div>

      <AdjustBalanceSheet open={adjustOpen} onClose={() => setAdjustOpen(false)} />
    </div>
  );
}
