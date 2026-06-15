interface Props {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function NumberPad({ value, onChange, className = '' }: Props) {
  const handleKey = (key: string) => {
    if (key === '⌫') {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === '.') {
      if (value.includes('.')) return;
      if (value === '') {
        onChange('0.');
        return;
      }
      onChange(value + '.');
      return;
    }
    // Number
    onChange(value + key);
  };

  // Custom layout: starts from 1 at top-left
  const keys: string[][] = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', '⌫'],
  ];

  return (
    <div className={`grid grid-cols-3 gap-1.5 ${className}`}>
      {keys.flat().map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => handleKey(key)}
          className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all text-xl font-medium text-gray-800 dark:text-gray-100 flex items-center justify-center"
        >
          {key === '⌫' ? (
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414A2 2 0 0110.828 5H21a2 2 0 012 2v10a2 2 0 01-2 2H10.828a2 2 0 01-1.414-.586L3 14z" />
            </svg>
          ) : (
            key
          )}
        </button>
      ))}
    </div>
  );
}
