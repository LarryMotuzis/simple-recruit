import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api/client.js';
import { ratingTrend } from '../lib/metrics.js';
import RatingChart from '../components/RatingChart.jsx';
import EvaluationForm from '../components/EvaluationForm.jsx';

const STAGE_BADGE = {
  keeping_tabs: 'bg-slate-100 text-slate-600',
  evaluating: 'bg-blue-100 text-blue-700',
  offered: 'bg-amber-100 text-amber-700',
  committed: 'bg-green-100 text-green-700',
};
const STAGE_LABELS = { keeping_tabs: 'Keeping Tabs', evaluating: 'Evaluating', offered: 'Offered', committed: 'Committed' };

function formatHeight(inches) {
  if (!inches) return null;
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ProspectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [prospect, setProspect] = useState(null);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const canEval = user?.role === 'head_coach' || user?.role === 'assistant';

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [{ prospect }, { evaluations }] = await Promise.all([
          api.getProspect(id),
          api.listEvaluations(id),
        ]);
        setProspect(prospect);
        setEvaluations(evaluations);
      } catch (err) {
        setError(err.message || 'Failed to load prospect');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleEvalCreated = (newEval) => setEvaluations((prev) => [...prev, newEval]);

  const handleRemove = async () => {
    if (!confirm(`Remove ${prospect.full_name} from prospects? This cannot be undone.`)) return;
    try {
      await api.removeProspect(id);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to remove prospect');
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-8 flex items-center justify-center text-slate-400 text-sm">
        Loading…
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 sm:p-8">
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      </div>
    );
  }
  if (!prospect) return null;

  const trendData = ratingTrend(evaluations);
  const latestRating = evaluations.length ? evaluations[evaluations.length - 1].rating : null;

  const positionDisplay = prospect.secondary_position
    ? `${prospect.position} / ${prospect.secondary_position}`
    : prospect.position;

  const metaParts = [
    positionDisplay,
    prospect.grad_year ? `Class of ${prospect.grad_year}` : null,
    formatHeight(prospect.height_inches),
    prospect.current_school,
    prospect.region,
  ].filter(Boolean);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-slate-900">{prospect.full_name}</h1>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STAGE_BADGE[prospect.stage]}`}>
              {STAGE_LABELS[prospect.stage]}
            </span>
            {prospect.in_portal && (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700">
                Portal
              </span>
            )}
            {latestRating !== null && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                Latest: {latestRating}/10
              </span>
            )}
          </div>
        </div>
        {metaParts.length > 0 && (
          <p className="text-slate-500 text-sm">{metaParts.join(' · ')}</p>
        )}
      </div>

      {/* Notes card */}
      {prospect.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1.5">Notes</p>
          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{prospect.notes}</p>
        </div>
      )}

      {/* Rating chart card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Rating trend</h2>
        <RatingChart data={trendData} />
      </div>

      {/* Log evaluation */}
      {canEval && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Log evaluation</h2>
          <EvaluationForm
            prospectId={id}
            onCreated={handleEvalCreated}
            onError={setError}
          />
        </div>
      )}

      {/* Evaluation history */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">
          Evaluation history
          <span className="ml-2 text-slate-400 font-normal">({evaluations.length})</span>
        </h2>

        {evaluations.length === 0 ? (
          <p className="text-slate-400 text-sm">No evaluations logged yet.</p>
        ) : (
          <div className="space-y-4">
            {[...evaluations].reverse().map((ev) => (
              <div key={ev.id} className="border-l-2 border-blue-200 pl-4">
                <div className="flex items-baseline gap-3 flex-wrap mb-1">
                  <span className="font-bold text-slate-900 text-base tabular-nums">
                    {ev.rating}
                    <span className="text-slate-400 font-normal text-sm">/10</span>
                  </span>
                  <span className="text-slate-500 text-xs">{formatDate(ev.eval_date)}</span>
                  <span className="text-slate-400 text-xs">{ev.author_name}</span>
                </div>

                {ev.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {ev.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {ev.notes && (
                  <p className="text-slate-600 text-sm leading-relaxed">{ev.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Danger zone */}
      {canEval && (
        <div className="border border-red-100 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-700">Remove prospect</p>
            <p className="text-xs text-slate-400 mt-0.5">Permanently removes this prospect from your board.</p>
          </div>
          <button
            onClick={handleRemove}
            className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
