export const ANSWER_STYLES = [
  {
    bg: 'bg-[#e21b3c]',
    hover: 'hover:bg-[#c81533]',
    ring: 'ring-[#e21b3c]',
    hex: '#e21b3c',
    label: 'Merah',
    shape: 'triangle',
  },
  {
    bg: 'bg-[#1368ce]',
    hover: 'hover:bg-[#0f57ad]',
    ring: 'ring-[#1368ce]',
    hex: '#1368ce',
    label: 'Biru',
    shape: 'diamond',
  },
  {
    bg: 'bg-[#d89e00]',
    hover: 'hover:bg-[#bd8a00]',
    ring: 'ring-[#d89e00]',
    hex: '#d89e00',
    label: 'Kuning',
    shape: 'circle',
  },
  {
    bg: 'bg-[#26890c]',
    hover: 'hover:bg-[#1f720a]',
    ring: 'ring-[#26890c]',
    hex: '#26890c',
    label: 'Hijau',
    shape: 'square',
  },
];

export function AnswerShape({ index, className = 'w-6 h-6' }) {
  const shape = ANSWER_STYLES[index % 4].shape;
  if (shape === 'triangle') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <polygon points="12,3 22,20 2,20" />
      </svg>
    );
  }
  if (shape === 'diamond') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <polygon points="12,2 22,12 12,22 2,12" />
      </svg>
    );
  }
  if (shape === 'circle') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
    </svg>
  );
}
