import { useId } from "react";

/** Мини-график баланса (area + line) */
export function Sparkline({ data, height = 56 }: { data: number[]; height?: number }) {
  const gid = useId();
  const w = 320;
  const h = height;
  const pad = 4;

  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (data.length - 1);

  const points = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });

  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${(w - pad).toFixed(1)},${h} L${pad},${h} Z`;

  const trendUp = data[data.length - 1] >= data[0];
  const color = trendUp ? "var(--income)" : "var(--expense)";
  const [lx, ly] = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-full w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lx} cy={ly} r="3.5" fill={color} stroke="var(--surface)" strokeWidth="1.5" />
    </svg>
  );
}
