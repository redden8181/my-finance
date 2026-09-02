import { Delete } from "lucide-react";

/**
 * Цифровая клавиатура с калькулятором.
 * Раскладка 1→2→3 сверху вниз, операторы в правой колонке.
 */
export function NumberPad({
  onKey,
  withOperators = true,
}: {
  onKey: (key: string) => void;
  withOperators?: boolean;
}) {
  const rows: string[][] = withOperators
    ? [
        ["1", "2", "3", "÷"],
        ["4", "5", "6", "×"],
        ["7", "8", "9", "−"],
        [",", "0", "backspace", "+"],
      ]
    : [
        ["1", "2", "3"],
        ["4", "5", "6"],
        ["7", "8", "9"],
        [",", "0", "backspace"],
      ];

  return (
    <div
      className="grid grid-cols-4 gap-2 select-none"
      style={withOperators ? undefined : { gridTemplateColumns: "repeat(3, 1fr)" }}
    >
      {rows.flat().map((key) => {
        const isOp = ["÷", "×", "−", "+"].includes(key);
        const isDel = key === "backspace";
        return (
          <button
            key={key}
            type="button"
            onClick={() => onKey(key)}
            className={`press flex h-14 items-center justify-center rounded-[18px] border font-display text-[20px] font-medium ${
              isOp
                ? "border-accent/30 bg-accent-soft text-accent-ink"
                : isDel
                  ? "border-transparent bg-transparent text-muted"
                  : "border-line bg-surface text-ink"
            }`}
            aria-label={isDel ? "Стереть" : key}
          >
            {isDel ? <Delete size={22} strokeWidth={2.2} /> : key}
          </button>
        );
      })}
    </div>
  );
}
