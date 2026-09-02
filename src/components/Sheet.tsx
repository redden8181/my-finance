import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const CLOSE_ANIM_MS = 220;
const CLOSE_THRESHOLD = 110;

/**
 * Нижняя шторка рендерится в document.body через Portal.
 * Это не даёт анимированным родителям ломать position: fixed в iOS Safari.
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
  const [entered, setEntered] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [closing, setClosing] = useState(false);
  const startY = useRef(0);
  const startTime = useRef(0);
  const moved = useRef(0);
  const closeTimer = useRef<number>(0);
  const swallowTimer = useRef<number>(0);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      setDragY(0);
      setDragging(false);
      setClosing(false);
      return;
    }

    setEntered(false);
    setDragY(0);
    setDragging(false);
    setClosing(false);

    // Два кадра гарантируют переход 100% → 0 даже в standalone Safari.
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setEntered(true));
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
    };
  }, [open]);

  useEffect(
    () => () => {
      window.clearTimeout(closeTimer.current);
      window.clearTimeout(swallowTimer.current);
    },
    []
  );

  const requestClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setDragging(false);
    setEntered(false);

    // Подавляем отложенный touch-click, чтобы строка под шторкой не открылась снова.
    const swallow = (event: MouseEvent) => {
      event.stopPropagation();
      event.preventDefault();
    };
    document.addEventListener("click", swallow, true);
    swallowTimer.current = window.setTimeout(() => {
      document.removeEventListener("click", swallow, true);
    }, 450);

    closeTimer.current = window.setTimeout(onClose, CLOSE_ANIM_MS);
  }, [closing, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, requestClose]);

  if (!open || typeof document === "undefined") return null;

  const onPointerDown = (event: React.PointerEvent) => {
    if (closing) return;
    startY.current = event.clientY;
    startTime.current = performance.now();
    moved.current = 0;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragging || closing) return;
    const delta = event.clientY - startY.current;
    moved.current = Math.max(moved.current, Math.abs(delta));
    setDragY(delta > 0 ? delta : delta / 6);
  };

  const onPointerUp = (event: React.PointerEvent) => {
    if (!dragging || closing) return;
    event.preventDefault();
    setDragging(false);

    const isTap = moved.current < 8 && performance.now() - startTime.current < 400;
    if (isTap || dragY > CLOSE_THRESHOLD) requestClose();
    else setDragY(0);
  };

  const progress = Math.min(1, Math.max(0, dragY / 320));
  const panelOffset =
    dragging || dragY !== 0 ? `${Math.max(dragY, -12)}px` : entered ? "0px" : "100%";
  const scrimOpacity = entered && !closing ? 1 - progress * 0.75 : 0;

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="presentation">
      <div
        className="absolute inset-0 backdrop-blur-[3px]"
        style={{
          background: "var(--sheet-scrim)",
          opacity: scrimOpacity,
          transition: dragging ? "none" : `opacity ${CLOSE_ANIM_MS}ms ease`,
        }}
        onClick={requestClose}
      />
      <div
        className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[430px]"
        style={{
          transform: `translate3d(0, ${panelOffset}, 0)`,
          WebkitTransform: `translate3d(0, ${panelOffset}, 0)`,
          transition: dragging
            ? "none"
            : `transform ${CLOSE_ANIM_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
          WebkitTransition: dragging
            ? "none"
            : `-webkit-transform ${CLOSE_ANIM_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`,
          willChange: "transform",
        }}
      >
        <div className="max-h-[88vh] max-h-[88dvh] overflow-y-auto no-scrollbar rounded-t-[26px] border-t border-line bg-surface pb-safe shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.5)]">
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
    </div>,
    document.body
  );
}