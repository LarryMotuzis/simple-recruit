import { Star } from 'lucide-react';

const SIZES = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export default function PriorityStars({ value, onChange, size = 'sm' }) {
  const editable = !!onChange;
  if (!editable && !value) return null;

  const dims = SIZES[size] || SIZES.sm;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value >= n;
        const star = (
          <Star
            className={`${dims} ${filled ? 'fill-amber-400 text-amber-400' : 'fill-none text-slate-300'}`}
          />
        );
        if (!editable) return <span key={n}>{star}</span>;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            className="cursor-pointer"
            aria-label={`Set priority to ${n} star${n > 1 ? 's' : ''}`}
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}
