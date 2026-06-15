import { useMemo } from 'react';

interface Props {
  data: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
}

export default function Sparkline({
  data,
  width = 120,
  height = 32,
  strokeWidth = 2,
  className = '',
}: Props) {
  const path = useMemo(() => {
    if (data.length < 2) return '';

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - strokeWidth * 2) - strokeWidth;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [data, width, height, strokeWidth]);

  const trend = useMemo(() => {
    if (data.length < 2) return 'neutral';
    const first = data.slice(0, Math.floor(data.length / 3)).reduce((a, b) => a + b, 0) / Math.floor(data.length / 3);
    const last = data.slice(-Math.floor(data.length / 3)).reduce((a, b) => a + b, 0) / Math.floor(data.length / 3);
    if (last > first * 1.05) return 'up';
    if (last < first * 0.95) return 'down';
    return 'neutral';
  }, [data]);

  const strokeColor = trend === 'up' 
    ? 'stroke-emerald-500' 
    : trend === 'down' 
    ? 'stroke-red-400' 
    : 'stroke-gray-400';

  const gradientId = `sparkline-gradient-${Math.random().toString(36).slice(2)}`;

  if (data.length < 2) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`} 
        style={{ width, height }}
      >
        <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
      </div>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop 
            offset="0%" 
            className={trend === 'up' ? 'stop-emerald-500/30' : trend === 'down' ? 'stop-red-400/30' : 'stop-gray-400/30'} 
            style={{ stopColor: trend === 'up' ? 'rgb(16 185 129 / 0.2)' : trend === 'down' ? 'rgb(248 113 113 / 0.2)' : 'rgb(156 163 175 / 0.2)' }}
          />
          <stop 
            offset="100%" 
            style={{ stopColor: 'transparent' }}
          />
        </linearGradient>
      </defs>
      
      {/* Fill area */}
      <path
        d={`${path} L ${width},${height} L 0,${height} Z`}
        fill={`url(#${gradientId})`}
      />
      
      {/* Line */}
      <path
        d={path}
        fill="none"
        className={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* End dot */}
      <circle
        cx={width}
        cy={height - ((data[data.length - 1] - Math.min(...data)) / (Math.max(...data) - Math.min(...data) || 1)) * (height - strokeWidth * 2) - strokeWidth}
        r={3}
        className={trend === 'up' ? 'fill-emerald-500' : trend === 'down' ? 'fill-red-400' : 'fill-gray-400'}
      />
    </svg>
  );
}
