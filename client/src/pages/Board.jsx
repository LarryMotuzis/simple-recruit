import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api/client.js';
import ProspectCard from '../components/ProspectCard.jsx';
import EditProspectModal from '../components/EditProspectModal.jsx';

const STAGES = [
  { key: 'keeping_tabs', label: 'Keeping Tabs', color: 'bg-slate-400' },
  { key: 'evaluating', label: 'Evaluating', color: 'bg-blue-500' },
  { key: 'offered', label: 'Offered', color: 'bg-amber-500' },
  { key: 'committed', label: 'Committed', color: 'bg-green-500' },
];

export default function Board() {
  const { user } = useAuth();
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dragOverStage, setDragOverStage] = useState(null);
  const [editing, setEditing] = useState(null);

  const canEdit = user?.role === 'head_coach' || user?.role === 'assistant';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { prospects } = await api.listProspects();
      setProspects(prospects);
    } catch (err) {
      setError(err.message || 'Failed to load prospects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    setDragOverStage(null);
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    const prospect = prospects.find((p) => p.id === id);
    if (!prospect || prospect.stage === targetStage) return;

    const previous = prospects;
    setProspects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, stage: targetStage } : p))
    );
    try {
      await api.changeStage(id, targetStage, 0);
    } catch (err) {
      setError(err.message || 'Failed to move prospect');
      setProspects(previous);
    }
  };

  const handleSaved = (updated) => {
    setProspects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setEditing(null);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-8 flex items-center justify-center text-slate-400 text-sm">
        Loading board…
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Board</h1>
        <p className="text-slate-500 text-sm mt-0.5">Drag prospects between stages</p>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 mb-5">
          {error}
        </p>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const cards = prospects.filter((p) => p.stage === stage.key);
          const isOver = dragOverStage === stage.key;

          return (
            <div
              key={stage.key}
              onDragOver={canEdit ? (e) => { e.preventDefault(); if (dragOverStage !== stage.key) setDragOverStage(stage.key); } : undefined}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={canEdit ? (e) => handleDrop(e, stage.key) : undefined}
              className={[
                'flex-1 min-w-70 rounded-xl border-2 transition-colors',
                isOver
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-transparent bg-slate-100',
              ].join(' ')}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                  <span className="text-sm font-semibold text-slate-700">{stage.label}</span>
                </div>
                <span className="text-xs font-semibold bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-full">
                  {cards.length}
                </span>
              </div>

              {/* Cards */}
              <div className="p-3 space-y-2 min-h-30">
                {cards.map((p) => (
                  <ProspectCard
                    key={p.id}
                    prospect={p}
                    draggable={canEdit}
                    onEdit={canEdit ? () => setEditing(p) : undefined}
                  />
                ))}
                {cards.length === 0 && (
                  <div className="flex items-center justify-center h-20 text-slate-300 text-sm">
                    Drop here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
