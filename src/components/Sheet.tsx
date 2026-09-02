import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const CLOSE_ANIM_MS = 220;
const CLOSE_THRESHOLD = 110;

/**
 * Нижняя шторка (bottom sheet).
 * Закрывается: свайпом вниз за грабер, тапом по граберу, тапом по затемнению и Esc.
 */
export function Sheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [closing, setClosing] = useState(false);
  const startY = useRef(0);
  const startTime = useRef(0);
  const moved = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number>(0);

  useEffect(() => {
    if (open) {
      setDragY(0);
      setDragging(false);
      setClosing(false);
    }
  }, [open]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  /**
   * Закрытие с анимацией. Гасит «призрачный» click, который браузер
   * присылает после pointerup — иначе он проваливается на элемент
   * под шторкой и тот снова её открывает.
   */
  const requestClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setDragging(false);

    const swallow = (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
    };
    document.addEventListener("click", swallow, true);
    window.setTimeout(() => document.removeEventListener("click", swallow, true), 450);

    closeTimer.current = window.setTimeout(() => {
      setClosing(false);
      onClose();
    }, CLOSE_ANIM_MS);
  }, [closing, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, requestClose]);

  if (!open) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    if (closing) return;
    startY.current = e.clientY;
    startTime.current = performance.now();
    moved.current = 0;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || closing) return;
    const delta = e.clientY - startY.current;
    moved.current = Math.max(moved.current, Math.abs(delta));
    setDragY(delta > 0 ? delta : delta / 6);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging || closing) return;
    e.preventDefault(); // подавляем синтетический mouse-click от тача
    setDragging(false);

    const isTap = moved.current < 8 && performance.now() - startTime.current < 400;
    const flung = dragY > CLOSE_THRESHOLD;

    if (isTap || flung) requestClose();
    else setDragY(0);
  };

  const offset = closing ? (panelRef.current?.offsetHeight || 600) : dragY;
  const progress = Math.min(1, Math.max(0, offset / 320));

  return (
    <div className="fixed inset-0 z-[70]">
      <div
        className="absolute inset-0 animate-fade backdrop-blur-[3px]"
        style={{
          background: "var(--sheet-scrim)",
          opacity: 1 - progress * 0.75,
          transition: dragging ? "none" : `opacity ${CLOSE_ANIM_MS}ms ease`,
        }}
        onClick={requestClose}
      />
      <div
        ref={panelRef}
        className={`absolute inset-x-0 bottom-0 mx-auto w-full max-w-[430px] ${
          dragging || closing ? "" : "animate-sheet"
        }`}
        style={{
          transform: `translateY(${Math.max(offset, -12)}px)`,
          transition: dragging
            ? "none"
            : `transform ${CLOSE_ANIM_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
        }}
      >
        <div className="max-h-[88dvh] overflow-y-auto no-scrollbar rounded-t-[26px] border-t border-line bg-surface pb-safe shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.5)]">
          {/* грабер — зона захвата для свайпа и тапа */}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="flex cursor-grab touch-none justify-center pt-3 pb-2 active:cursor-grabbing"
            role="button"
            aria-label="Закрыть"
          >
            <span
              className={`h-1.5 rounded-full transition-all duration-200 ${
                dragging ? "w-14 bg-muted" : "w-10 bg-line"
              }`}
            />
          </div>
          <div className="px-5 pb-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
