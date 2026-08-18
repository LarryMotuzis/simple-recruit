import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Phone, Mail } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api/client.js';
import EvaluationForm from '../components/EvaluationForm.jsx';
import PriorityStars from '../components/PriorityStars.jsx';

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

function ContactGroup({ label, name, phone, email }) {
  if (!name && !phone && !email) return null;
  return (
    <div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</p>
      {name && <p className="text-sm font-medium text-slate-800 mb-1">{name}</p>}
      <div className="flex flex-col gap-1">
        {phone && (
          <a href={`tel:${phone}`} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 transition-colors">
            <Phone className="w-3.5 h-3.5" />
            {phone}
          </a>
        )}
        {email && (
          <a href={`mailto:${email}`} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 transition-colors">
            <Mail className="w-3.5 h-3.5" />
            {email}
          </a>
        )}
      </div>
    </div>
  );
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
  const canEval = !!user;
  const canDelete = user?.role === 'admin' || user?.role === 'head_coach';

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
            <PriorityStars value={prospect.priority} size="md" />
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

      {/* Contact card */}
      {(() => {
        const groups = [
          { label: 'Player', phone: prospect.contact_phone, email: prospect.contact_email },
          { label: 'Parent / Guardian', name: prospect.parent_name, phone: prospect.parent_phone, email: prospect.parent_email },
          { label: 'AAU Coach', name: prospect.aau_coach_name, phone: prospect.aau_coach_phone, email: prospect.aau_coach_email },
          { label: 'HS Coach', name: prospect.hs_coach_name, phone: prospect.hs_coach_phone, email: prospect.hs_coach_email },
        ];
        const hasAny = groups.some((g) => g.name || g.phone || g.email);
        return (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Contact</h2>
            {hasAny ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {groups.map((g) => (
                  <ContactGroup key={g.label} {...g} />
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm">No contact info yet.</p>
            )}
          </div>
        );
      })()}

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
                  {ev.author_name && (
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {ev.author_name}
                    </span>
                  )}
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
      {canDelete && (
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
