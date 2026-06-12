import { Link } from 'react-router-dom';

function formatHeight(inches) {
  if (!inches) return null;
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

export default function ProspectCard({ prospect, draggable, onEdit }) {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', prospect.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const meta = [
    prospect.position,
    prospect.grad_year ? `'${String(prospect.grad_year).slice(-2)}` : null,
    formatHeight(prospect.height_inches),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
      className={[
        'bg-white rounded-lg border border-slate-200 p-3 shadow-sm select-none',
        draggable ? 'cursor-grab active:cursor-grabbing hover:border-slate-300 hover:shadow-md transition-shadow' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          to={`/prospects/${prospect.id}`}
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-sm text-slate-900 hover:text-blue-600 transition-colors leading-snug"
        >
          {prospect.full_name}
        </Link>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-slate-300 hover:text-blue-500 text-xs transition-colors shrink-0 mt-0.5"
          >
            Edit
          </button>
        )}
      </div>

      {meta && (
        <p className="text-slate-500 text-xs mt-1">{meta}</p>
      )}

      {prospect.current_school && (
        <p className="text-slate-400 text-xs mt-0.5 truncate">{prospect.current_school}</p>
      )}

      {prospect.in_portal && (
        <span className="inline-flex items-center mt-2 bg-violet-100 text-violet-700 text-xs font-medium px-2 py-0.5 rounded-full">
          Portal
        </span>
      )}
    </div>
  );
}
