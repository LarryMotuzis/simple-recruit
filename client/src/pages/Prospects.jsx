import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, X, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api/client.js';
import ProspectForm from '../components/ProspectForm.jsx';
import EditProspectModal from '../components/EditProspectModal.jsx';

const STAGE_LABELS = { keeping_tabs: 'Keeping Tabs', evaluating: 'Evaluating', offered: 'Offered', committed: 'Committed' };

const STAGE_BADGE = {
  keeping_tabs: 'bg-slate-100 text-slate-600',
  evaluating: 'bg-blue-100 text-blue-700',
  offered: 'bg-amber-100 text-amber-700',
  committed: 'bg-green-100 text-green-700',
};

function formatHeight(inches) {
  if (!inches) return '—';
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

export default function Prospects() {
  const { user } = useAuth();
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [position, setPosition] = useState('');
  const [heightMin, setHeightMin] = useState('');
  const [heightMax, setHeightMax] = useState('');
  const [gradYear, setGradYear] = useState('');

  const canEdit = user?.role === 'head_coach' || user?.role === 'assistant';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search) params.search = search;
      if (stage) params.stage = stage;
      if (position) params.position = position;
      if (heightMin) params.heightMin = heightMin;
      if (heightMax) params.heightMax = heightMax;
      if (activeTab !== 'all') params.prospectType = activeTab;
      if (activeTab === 'high_school' && gradYear) params.gradYear = gradYear;
      const { prospects } = await api.listProspects(params);
      setProspects(prospects);
    } catch (err) {
      setError(err.message || 'Failed to load prospects');
    } finally {
      setLoading(false);
    }
  }, [search, stage, position, heightMin, heightMax, activeTab, gradYear]);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (p) => { setProspects((prev) => [p, ...prev]); setShowForm(false); };
  const handleSaved = (updated) => {
    setProspects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setEditing(null);
  };

  const handleRemove = async (p) => {
    if (!confirm(`Remove ${p.full_name} from prospects? This cannot be undone.`)) return;
    try {
      await api.removeProspect(p.id);
      setProspects((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err) {
      setError(err.message || 'Failed to remove prospect');
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Prospects</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {loading ? '…' : `${prospects.length} prospect${prospects.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span className="hidden sm:inline">{showForm ? 'Cancel' : 'Add prospect'}</span>
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-5">
          <ProspectForm onCreated={handleCreated} onError={setError} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-5">
        {[['all', 'All'], ['high_school', 'High School'], ['transfer', 'Transfer'], ['juco', 'JUCO']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => { setActiveTab(val); setGradYear(''); }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === val
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-44"
        >
          <option value="">All stages</option>
          {Object.entries(STAGE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-40"
        >
          <option value="">All positions</option>
          <option value="PG">PG</option>
          <option value="SG">SG</option>
          <option value="Combo Guard">Combo Guard</option>
          <option value="Wing">Wing</option>
          <option value="Forward">Forward</option>
          <option value="C">C</option>
        </select>
        {activeTab === 'high_school' && (
          <select
            value={gradYear}
            onChange={(e) => setGradYear(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-36"
          >
            <option value="">All classes</option>
            <option value="2025">Class of 2025</option>
            <option value="2026">Class of 2026</option>
            <option value="2027">Class of 2027</option>
            <option value="2028">Class of 2028</option>
          </select>
        )}
        <select
          value={heightMin}
          onChange={(e) => setHeightMin(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Min height</option>
          <option value="66">5'6"</option>
          <option value="69">5'9"</option>
          <option value="72">6'0"</option>
          <option value="75">6'3"</option>
          <option value="78">6'6"</option>
          <option value="81">6'9"</option>
        </select>
        <select
          value={heightMax}
          onChange={(e) => setHeightMax(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Max height</option>
          <option value="69">5'9"</option>
          <option value="72">6'0"</option>
          <option value="75">6'3"</option>
          <option value="78">6'6"</option>
          <option value="81">6'9"</option>
          <option value="84">7'0"</option>
        </select>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 mb-4">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Loading…</div>
      ) : prospects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-16 text-slate-400">
          <p className="text-sm">No prospects yet.</p>
          {canEdit && (
            <button onClick={() => setShowForm(true)} className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium">
              Add your first prospect →
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── Mobile card list ── */}
          <div className="sm:hidden space-y-2">
            {prospects.map((p) => (
              <Link
                key={p.id}
                to={`/prospects/${p.id}`}
                className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3.5 shadow-sm active:bg-slate-50 transition-colors"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-bold">
                    {p.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                  </span>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900 truncate">{p.full_name}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STAGE_BADGE[p.stage]}`}>
                      {STAGE_LABELS[p.stage]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    {[p.secondary_position ? `${p.position}/${p.secondary_position}` : p.position, formatHeight(p.height_inches), p.current_school].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                {/* Chevron */}
                <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>

          {/* ── Desktop table ── */}
          <div className="hidden sm:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Pos</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">
                    {activeTab === 'high_school' ? 'Class' : 'Grad'}
                  </th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Height</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">School</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Status</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Stage</th>
                  {canEdit && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prospects.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      <Link to={`/prospects/${p.id}`} className="text-blue-600 hover:text-blue-700 hover:underline">
                        {p.full_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {p.position ? (p.secondary_position ? `${p.position} / ${p.secondary_position}` : p.position) : '—'}
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      {p.grad_year
                        ? activeTab === 'high_school'
                          ? <span className="inline-flex items-center bg-sky-100 text-sky-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">{p.grad_year}</span>
                          : <span className="text-slate-600">{p.grad_year}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{formatHeight(p.height_inches)}</td>
                    <td className="px-4 py-3.5 text-slate-600 hidden md:table-cell">{p.current_school || '—'}</td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      {p.in_portal ? (
                        <span className="inline-flex items-center bg-violet-100 text-violet-700 text-xs font-medium px-2.5 py-0.5 rounded-full">Portal</span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${STAGE_BADGE[p.stage]}`}>
                        {STAGE_LABELS[p.stage]}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => setEditing(p)} className="text-slate-400 hover:text-blue-600 text-xs font-medium transition-colors">Edit</button>
                          <button onClick={() => handleRemove(p)} className="text-slate-300 hover:text-red-500 transition-colors" title="Remove prospect">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editing && (
        <EditProspectModal
          prospect={editing}
          onSaved={handleSaved}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
