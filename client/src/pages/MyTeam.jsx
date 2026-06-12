import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, X, UserPlus, Pencil, Settings } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api/client.js';

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];
const YEARS = ['Fr', 'So', 'Jr', 'Sr', 'Grad'];
const DEPTH_LABELS = ['Starter', '2nd', '3rd'];

const COURT_POSITIONS = {
  PG:  { x: 50,  y: 20 },
  SG:  { x: 79,  y: 43 },
  SF:  { x: 21,  y: 43 },
  PF:  { x: 71,  y: 70 },
  C:   { x: 50,  y: 70 },
};

const DEFAULT_SETTINGS = {
  team_name: 'My Team',
  abbreviation: 'TEAM',
  primary_color: '#1e40af',
  secondary_color: '#ffffff',
};

function fmtHeight(inches) {
  if (!inches) return null;
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

function buildChart(players) {
  const chart = {};
  POSITIONS.forEach(pos => { chart[pos] = [null, null, null]; });
  for (const p of players) {
    if (p.chart_position && p.depth_order) {
      chart[p.chart_position][p.depth_order - 1] = p;
    }
  }
  return chart;
}


export default function MyTeam() {
  const { user } = useAuth();
  const canEdit = user?.role === 'head_coach' || user?.role === 'assistant';

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [addModal, setAddModal] = useState(false);
  const [editPlayer, setEditPlayer] = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [settingsModal, setSettingsModal] = useState(false);
  const [dragSource, setDragSource] = useState(null); // { position, depthOrder, player }
  const [dragOver, setDragOver] = useState(null);     // { position, depthOrder }
  const dragSourceRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rosterData, settingsData] = await Promise.all([
        api.getRoster(),
        api.getTeamSettings(),
      ]);
      setPlayers(rosterData.players);
      if (settingsData.settings) setSettings(settingsData.settings);
    } catch (err) {
      setError(err.message || 'Failed to load roster');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (id) => {
    if (!confirm('Remove this player from the roster?')) return;
    try {
      await api.removeFromRoster(id);
      setPlayers(prev => prev.filter(p => p.id !== id));
    } catch (err) { setError(err.message); }
  };

  const handleSetSlot = async (position, depthOrder, rosterId) => {
    try {
      const data = await api.setDepthChart(rosterId, position, depthOrder);
      setPlayers(data.players);
      setAssignModal(null);
    } catch (err) { setError(err.message); }
  };

  const handleClearSlot = async (position, depthOrder) => {
    try {
      const data = await api.setDepthChart(null, position, depthOrder);
      setPlayers(data.players);
    } catch (err) { setError(err.message); }
  };

  const handleDragStart = useCallback((position, depthOrder, player) => {
    dragSourceRef.current = { position, depthOrder, player };
    setDragSource({ position, depthOrder, player });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragSource(null);
    setDragOver(null);
    dragSourceRef.current = null;
  }, []);

  const handleDragOver = useCallback((position, depthOrder) => {
    setDragOver({ position, depthOrder });
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(null);
  }, []);

  const handleDrop = useCallback(async (targetPos, targetOrder) => {
    const src = dragSourceRef.current;
    setDragSource(null);
    setDragOver(null);
    dragSourceRef.current = null;
    if (!src) return;
    if (src.position === targetPos && src.depthOrder === targetOrder) return;

    const builtChart = buildChart(players);
    const targetPlayer = builtChart[targetPos][targetOrder - 1];

    try {
      let data;
      if (targetPlayer) {
        data = await api.swapDepthChart(
          { rosterId: src.player.id, position: src.position, depthOrder: src.depthOrder },
          { rosterId: targetPlayer.id, position: targetPos, depthOrder: targetOrder }
        );
      } else {
        data = await api.setDepthChart(src.player.id, targetPos, targetOrder);
      }
      setPlayers(data.players);
    } catch (err) {
      setError(err.message);
    }
  }, [players]);

  const chart = buildChart(players);
  const primaryColor = settings.primary_color || DEFAULT_SETTINGS.primary_color;

  // Darken primary for gradient
  const r0 = parseInt(primaryColor.slice(1,3),16);
  const g0 = parseInt(primaryColor.slice(3,5),16);
  const b0 = parseInt(primaryColor.slice(5,7),16);
  const darkPc = `#${Math.round(r0*0.65).toString(16).padStart(2,'0')}${Math.round(g0*0.65).toString(16).padStart(2,'0')}${Math.round(b0*0.65).toString(16).padStart(2,'0')}`;

  return (
    <div className="min-h-screen bg-slate-100">

      {/* ── Team Banner ── */}
      <div className="px-8 py-7" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${darkPc} 100%)` }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">My Team</p>
            <div className="flex items-center gap-2.5">
              <h1 className="text-3xl font-black text-white tracking-tight">{settings.team_name}</h1>
              {canEdit && (
                <button
                  onClick={() => setSettingsModal(true)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                  title="Team settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-white/50 text-sm mt-1">{players.length} players on roster</p>
          </div>
          {canEdit && (
            <button
              onClick={() => setAddModal(true)}
              className="flex items-center gap-2 bg-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md hover:bg-white/90 transition-colors"
              style={{ color: primaryColor }}
            >
              <UserPlus className="w-4 h-4" />
              Add player
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-8 py-6 space-y-6">

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400 text-sm">Loading…</div>
        ) : (
          <>
            {/* ── Depth Chart ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Depth Chart</h2>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/10">
                <div className="relative w-full" style={{ paddingBottom: '58%' }}>
                  <CourtSVG settings={settings} />
                  {POSITIONS.map(pos => {
                    const { x, y } = COURT_POSITIONS[pos];
                    return (
                      <div
                        key={pos}
                        className="absolute"
                        style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)', width: '18%' }}
                      >
                        <div className="flex justify-center mb-1.5">
                          <span className="bg-white/95 text-slate-800 text-xs font-black px-3 py-0.5 rounded-full shadow-md tracking-wider border border-white/60">
                            {pos}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          {[0, 1, 2].map(i => (
                            <DepthSlot
                              key={i}
                              player={chart[pos][i]}
                              depth={i}
                              canEdit={canEdit}
                              isDragging={dragSource?.position === pos && dragSource?.depthOrder === i + 1}
                              isDragOver={dragOver?.position === pos && dragOver?.depthOrder === i + 1}
                              onAssign={() => setAssignModal({ position: pos, depthOrder: i + 1 })}
                              onClear={() => handleClearSlot(pos, i + 1)}
                              onDragStart={() => handleDragStart(pos, i + 1, chart[pos][i])}
                              onDragEnd={handleDragEnd}
                              onDragOver={() => handleDragOver(pos, i + 1)}
                              onDragLeave={handleDragLeave}
                              onDrop={() => handleDrop(pos, i + 1)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* ── Roster ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Roster</h2>
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-400 font-medium">{players.length} players</span>
              </div>

              {players.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl py-16 flex flex-col items-center text-center shadow-sm">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                    <UserPlus className="w-7 h-7 text-slate-300" />
                  </div>
                  <p className="text-slate-600 font-semibold mb-1">No players yet</p>
                  <p className="text-slate-400 text-sm">Add players manually or import from your prospects.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {players.map(p => (
                    <PlayerCard
                      key={p.id}
                      player={p}
                      canEdit={canEdit}
                      primaryColor={primaryColor}
                      onEdit={() => setEditPlayer(p)}
                      onRemove={() => handleRemove(p.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {addModal && (
        <AddPlayerModal
          onClose={() => setAddModal(false)}
          onAdded={player => { setPlayers(prev => [...prev, player]); setAddModal(false); }}
        />
      )}

      {editPlayer && (
        <EditPlayerModal
          player={editPlayer}
          onClose={() => setEditPlayer(null)}
          onSaved={updated => {
            setPlayers(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
            setEditPlayer(null);
          }}
        />
      )}

      {assignModal && (
        <AssignModal
          position={assignModal.position}
          depthOrder={assignModal.depthOrder}
          players={players.filter(p => !p.chart_position || (p.chart_position === assignModal.position && p.depth_order === assignModal.depthOrder))}
          onAssign={id => handleSetSlot(assignModal.position, assignModal.depthOrder, id)}
          onClose={() => setAssignModal(null)}
        />
      )}

      {settingsModal && (
        <TeamSettingsModal
          settings={settings}
          onClose={() => setSettingsModal(false)}
          onSaved={updated => { setSettings(updated); setSettingsModal(false); }}
        />
      )}
    </div>
  );
}

// ── Depth Slot ──────────────────────────────────────────────────────────────

function DepthSlot({ player, depth, canEdit, isDragging, isDragOver, onAssign, onClear,
                     onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop }) {
  const depthStyle = depth === 0
    ? 'bg-white/95 border-white/80 shadow-md'
    : depth === 1
    ? 'bg-white/75 border-white/50 shadow-sm'
    : 'bg-white/50 border-white/30';

  const dragOverStyle = isDragOver ? 'ring-2 ring-white ring-offset-1 ring-offset-transparent scale-105' : '';

  if (player) {
    return (
      <div
        draggable={canEdit}
        onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.(); }}
        onDragEnd={onDragEnd}
        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragOver?.(); }}
        onDragLeave={onDragLeave}
        onDrop={e => { e.preventDefault(); onDrop?.(); }}
        className={`group relative rounded-lg border px-2 py-1.5 transition-all select-none
          ${depthStyle} ${dragOverStyle}
          ${isDragging ? 'opacity-40 scale-95' : ''}
          ${canEdit ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
        <p className="text-xs font-bold text-slate-900 truncate leading-tight">{player.full_name}</p>
        <p className="text-xs text-slate-500 leading-tight tabular-nums">
          {[fmtHeight(player.height_inches), player.year].filter(Boolean).join(' · ') || DEPTH_LABELS[depth]}
        </p>
        {canEdit && (
          <button
            onClick={e => { e.stopPropagation(); onClear(); }}
            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-slate-500 hover:bg-red-500 text-white rounded-full items-center justify-center hidden group-hover:flex transition-colors shadow-sm"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    );
  }

  const emptyDragOver = isDragOver
    ? 'border-white bg-white/30 text-white'
    : 'border-white/40 text-white/50 hover:border-white/80 hover:bg-white/20 hover:text-white/90';

  return canEdit ? (
    <button
      onClick={onAssign}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragOver?.(); }}
      onDragLeave={onDragLeave}
      onDrop={e => { e.preventDefault(); onDrop?.(); }}
      className={`w-full border border-dashed rounded-lg px-2 py-1.5 text-xs transition-all text-left ${emptyDragOver}`}
    >
      + {DEPTH_LABELS[depth]}
    </button>
  ) : (
    <div className="w-full border border-dashed border-white/20 rounded-lg px-2 py-1.5 text-xs text-white/30">
      {DEPTH_LABELS[depth]}
    </div>
  );
}

// ── Player Card ──────────────────────────────────────────────────────────────

function PlayerCard({ player, canEdit, primaryColor, onEdit, onRemove }) {
  const initials = player.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-start gap-3 hover:shadow-md hover:border-slate-300 transition-all shadow-sm">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
        style={{ backgroundColor: primaryColor }}
      >
        <span className="text-white text-sm font-bold">{initials}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            {player.prospect_id ? (
              <Link to={`/prospects/${player.prospect_id}`} className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors truncate block">
                {player.full_name}
              </Link>
            ) : (
              <p className="text-sm font-bold text-slate-900 truncate">{player.full_name}</p>
            )}
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {player.jersey_number && (
                <span className="text-xs font-mono text-slate-400">#{player.jersey_number}</span>
              )}
              {player.position && (
                <span className="text-xs font-semibold text-slate-500">{player.position}</span>
              )}
              {player.year && (
                <span className="text-xs text-slate-400">{player.year}</span>
              )}
              {player.height_inches && (
                <span className="text-xs text-slate-400">{fmtHeight(player.height_inches)}</span>
              )}
            </div>
          </div>

          {canEdit && (
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={onEdit} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={onRemove} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="mt-2">
          {player.chart_position ? (
            <span
              className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${primaryColor}18`, color: primaryColor, border: `1px solid ${primaryColor}35` }}
            >
              {player.chart_position} · {DEPTH_LABELS[player.depth_order - 1]}
            </span>
          ) : (
            <span className="text-xs text-slate-300">Not in depth chart</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Team Settings Modal ──────────────────────────────────────────────────────

function TeamSettingsModal({ settings, onClose, onSaved }) {
  const [form, setForm] = useState({
    teamName: settings.team_name || '',
    abbreviation: settings.abbreviation || '',
    primaryColor: settings.primary_color || '#1e40af',
    secondaryColor: settings.secondary_color || '#ffffff',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setError('');
    try {
      const { settings: updated } = await api.updateTeamSettings(form);
      onSaved(updated);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Team Settings" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <Field label="Team Name">
          <input
            autoFocus
            value={form.teamName}
            onChange={e => setForm(f => ({ ...f, teamName: e.target.value }))}
            placeholder="e.g. Lewis Flyers"
            className={inputCls}
          />
        </Field>
        <Field label="Abbreviation">
          <input
            value={form.abbreviation}
            onChange={e => setForm(f => ({ ...f, abbreviation: e.target.value.toUpperCase().slice(0, 8) }))}
            placeholder="e.g. FLYERS"
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Primary Color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.primaryColor}
                onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
              />
              <input
                value={form.primaryColor}
                onChange={e => setForm(f => ({ ...f, primaryColor: e.target.value }))}
                placeholder="#CC0000"
                className={`${inputCls} font-mono`}
              />
            </div>
          </Field>
          <Field label="Secondary Color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.secondaryColor}
                onChange={e => setForm(f => ({ ...f, secondaryColor: e.target.value }))}
                className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
              />
              <input
                value={form.secondaryColor}
                onChange={e => setForm(f => ({ ...f, secondaryColor: e.target.value }))}
                placeholder="#ffffff"
                className={`${inputCls} font-mono`}
              />
            </div>
          </Field>
        </div>

        {/* Preview swatch */}
        <div
          className="rounded-xl p-4 flex items-center justify-center font-black text-lg tracking-widest shadow-inner"
          style={{ backgroundColor: form.primaryColor, color: form.secondaryColor }}
        >
          {form.abbreviation || 'TEAM'}
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
          <button type="submit" disabled={submitting} className="flex-1 py-2.5 text-white text-sm font-semibold rounded-xl transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: form.primaryColor }}>
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Edit Player Modal ────────────────────────────────────────────────────────

function EditPlayerModal({ player, onClose, onSaved }) {
  const heightFtInit = player.height_inches ? Math.floor(player.height_inches / 12) : '';
  const heightInInit = player.height_inches ? player.height_inches % 12 : '';

  const [form, setForm] = useState({
    fullName: player.full_name || '',
    position: player.position || '',
    jerseyNumber: player.jersey_number || '',
    year: player.year || '',
    heightFt: heightFtInit,
    heightIn: heightInInit,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) return;
    setSubmitting(true); setError('');
    try {
      const heightInches = form.heightFt
        ? parseInt(form.heightFt) * 12 + parseInt(form.heightIn || 0)
        : null;
      const { player: updated } = await api.updateRosterPlayer(player.id, {
        fullName: form.fullName.trim(),
        position: form.position || null,
        jerseyNumber: form.jerseyNumber || null,
        year: form.year || null,
        heightInches,
      });
      onSaved(updated);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Edit Player" onClose={onClose}>
      <form onSubmit={handleSubmit} className="p-5 space-y-3">
        <Field label="Full Name *">
          <input
            autoFocus
            value={form.fullName}
            onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Position">
            <select value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} className={inputCls}>
              <option value="">—</option>
              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Year">
            <select value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} className={inputCls}>
              <option value="">—</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
          <Field label="Jersey #">
            <input value={form.jerseyNumber} onChange={e => setForm(f => ({ ...f, jerseyNumber: e.target.value }))} placeholder="0–99" className={inputCls} />
          </Field>
          <Field label="Height">
            <div className="flex gap-1.5">
              <input value={form.heightFt} onChange={e => setForm(f => ({ ...f, heightFt: e.target.value }))} placeholder="Ft" className={inputCls} />
              <input value={form.heightIn} onChange={e => setForm(f => ({ ...f, heightIn: e.target.value }))} placeholder="In" className={inputCls} />
            </div>
          </Field>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
          <button type="submit" disabled={!form.fullName.trim() || submitting} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Add Player Modal ─────────────────────────────────────────────────────────

function AddPlayerModal({ onClose, onAdded }) {
  const [tab, setTab] = useState('manual');
  const [prospects, setProspects] = useState([]);
  const [loadingProspects, setLoadingProspects] = useState(false);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ fullName: '', position: '', jerseyNumber: '', year: '', heightFt: '', heightIn: '' });

  useEffect(() => {
    if (tab === 'prospects') {
      setLoadingProspects(true);
      api.listProspects().then(d => setProspects(d.prospects)).finally(() => setLoadingProspects(false));
    }
  }, [tab]);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) return;
    setSubmitting(true); setError('');
    try {
      const heightInches = form.heightFt ? parseInt(form.heightFt) * 12 + parseInt(form.heightIn || 0) : null;
      const { player } = await api.addToRoster({ fullName: form.fullName, position: form.position || null, jerseyNumber: form.jerseyNumber || null, year: form.year || null, heightInches });
      onAdded(player);
    } catch (err) { setError(err.message); setSubmitting(false); }
  };

  const handleAddProspect = async (prospect) => {
    setSubmitting(true); setError('');
    try {
      const { player } = await api.addToRoster({ fullName: prospect.full_name, position: prospect.position || null, heightInches: prospect.height_inches || null, prospectId: prospect.id });
      onAdded(player);
    } catch (err) { setError(err.message); setSubmitting(false); }
  };

  const filtered = prospects.filter(p => p.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal title="Add Player to Roster" onClose={onClose}>
      <div className="flex border-b border-slate-100">
        {[['manual', 'New Player'], ['prospects', 'From Prospects']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === key ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="p-5">
        {tab === 'manual' ? (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <Field label="Full Name *">
              <input autoFocus value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="e.g. Marcus Johnson" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Position">
                <select value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} className={inputCls}>
                  <option value="">—</option>
                  {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Year">
                <select value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} className={inputCls}>
                  <option value="">—</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>
              <Field label="Jersey #">
                <input value={form.jerseyNumber} onChange={e => setForm(f => ({ ...f, jerseyNumber: e.target.value }))} placeholder="0–99" className={inputCls} />
              </Field>
              <Field label="Height">
                <div className="flex gap-1.5">
                  <input value={form.heightFt} onChange={e => setForm(f => ({ ...f, heightFt: e.target.value }))} placeholder="Ft" className={inputCls} />
                  <input value={form.heightIn} onChange={e => setForm(f => ({ ...f, heightIn: e.target.value }))} placeholder="In" className={inputCls} />
                </div>
              </Field>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button type="submit" disabled={!form.fullName.trim() || submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
              {submitting ? 'Adding…' : 'Add to Roster'}
            </button>
          </form>
        ) : (
          <div>
            <input autoFocus placeholder="Search prospects…" value={search} onChange={e => setSearch(e.target.value)} className={`${inputCls} mb-3`} />
            {loadingProspects ? (
              <p className="text-slate-400 text-sm text-center py-6">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No prospects found</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {filtered.map(p => (
                  <button key={p.id} onClick={() => handleAddProspect(p)} disabled={submitting}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 text-left transition-colors group disabled:opacity-50">
                    <div className="w-9 h-9 bg-linear-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-white text-xs font-bold">{p.full_name[0]}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{p.full_name}</p>
                      <p className="text-xs text-slate-400">{[p.position, p.current_school].filter(Boolean).join(' · ')}</p>
                    </div>
                    <Plus className="w-4 h-4 text-slate-300 group-hover:text-blue-500 shrink-0 ml-auto" />
                  </button>
                ))}
              </div>
            )}
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Assign Modal ─────────────────────────────────────────────────────────────

function AssignModal({ position, depthOrder, players, onAssign, onClose }) {
  const [search, setSearch] = useState('');
  const filtered = players.filter(p => p.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal title={`${position} · ${DEPTH_LABELS[depthOrder - 1]}`} onClose={onClose}>
      <div className="p-4">
        <input autoFocus placeholder="Search roster…" value={search} onChange={e => setSearch(e.target.value)} className={`${inputCls} mb-3`} />
        {filtered.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">No players available</p>
        ) : (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {filtered.map(p => (
              <button key={p.id} onClick={() => onAssign(p.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 text-left transition-colors group">
                <div className="w-9 h-9 bg-linear-to-br from-slate-400 to-slate-600 group-hover:from-blue-400 group-hover:to-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-all">
                  <span className="text-white text-xs font-bold">{p.jersey_number || p.full_name[0]}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{p.full_name}</p>
                  <p className="text-xs text-slate-400">{[p.position, fmtHeight(p.height_inches), p.year].filter(Boolean).join(' · ')}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Court SVG ────────────────────────────────────────────────────────────────

function CourtSVG({ settings = DEFAULT_SETTINGS }) {
  const primary = settings.primary_color || '#1e40af';
  const abbrev = settings.abbreviation || 'TEAM';

  // Darken primary for paint gradient bottom
  const r = parseInt(primary.slice(1, 3), 16);
  const g = parseInt(primary.slice(3, 5), 16);
  const b = parseInt(primary.slice(5, 7), 16);
  const darkR = Math.round(r * 0.7);
  const darkG = Math.round(g * 0.7);
  const darkB = Math.round(b * 0.7);
  const darkPrimary = `#${darkR.toString(16).padStart(2,'0')}${darkG.toString(16).padStart(2,'0')}${darkB.toString(16).padStart(2,'0')}`;

  return (
    <svg viewBox="0 0 600 348" className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d4863a" />
          <stop offset="100%" stopColor="#b8692a" />
        </linearGradient>
        <linearGradient id="paintGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={primary} stopOpacity="0.35" />
          <stop offset="100%" stopColor={darkPrimary} stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* Floor */}
      <rect width="600" height="348" fill="url(#floorGrad)" />

      {/* Wood grain lines */}
      {[30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(y => (
        <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="#c07828" strokeWidth="0.5" strokeOpacity="0.4" />
      ))}

      {/* Paint fill */}
      <rect x="203" y="210" width="194" height="128" fill="url(#paintGrad)" />

      <g stroke="#8B4513" strokeWidth="2" fill="none" strokeOpacity="0.9">
        {/* Boundary */}
        <rect x="18" y="10" width="564" height="328" rx="2" />

        {/* Three-point arc */}
        <path d="M 163,338 A 216,216 0 0,1 437,338" />
        <line x1="163" y1="288" x2="163" y2="338" />
        <line x1="437" y1="288" x2="437" y2="338" />

        {/* Paint border */}
        <rect x="203" y="210" width="194" height="128" />
        <line x1="203" y1="210" x2="397" y2="210" />

        {/* Free throw circle */}
        <ellipse cx="300" cy="210" rx="60" ry="60" strokeDasharray="10 7" />
        <path d="M 240,210 A 60,60 0 0,0 360,210" strokeDasharray="none" />

        {/* Restricted area arc */}
        <path d="M 271,338 A 30,30 0 0,1 329,338" />

        {/* Backboard */}
        <line x1="267" y1="332" x2="333" y2="332" strokeWidth="3" />

        {/* Basket */}
        <circle cx="300" cy="337" r="12" strokeWidth="2.5" />

        {/* Center circle at top */}
        <circle cx="300" cy="10" r="36" strokeDasharray="8 6" />
      </g>

      {/* Team name at center court */}
      <text
        x="300"
        y="118"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontSize="22"
        letterSpacing="4"
        fill={primary}
        fillOpacity="0.55"
        stroke={primary}
        strokeWidth="0.5"
        strokeOpacity="0.3"
        style={{ userSelect: 'none' }}
      >
        {abbrev}
      </text>

      {/* Decorative accent stripe at half court using primary color */}
      <line x1="18" y1="10" x2="582" y2="10" stroke={primary} strokeWidth="3" strokeOpacity="0.6" />
    </svg>
  );
}
