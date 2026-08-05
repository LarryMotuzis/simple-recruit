import { useState } from 'react';
import { api } from '../api/client.js';

const FIELDS = [
  { key: 'points', label: 'PTS' },
  { key: 'rebounds', label: 'REB' },
  { key: 'assists', label: 'AST' },
  { key: 'fgMade', label: 'FGM' },
  { key: 'fgAttempted', label: 'FGA' },
];

const EMPTY = { points: '', rebounds: '', assists: '', fgMade: '', fgAttempted: '' };

export default function BoxScoreForm({ prospectId, onCreated, onError }) {
  const [gameDate, setGameDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [stats, setStats] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const setField = (key, value) => setStats((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { gameDate };
      for (const { key } of FIELDS) {
        if (stats[key] !== '') payload[key] = Number(stats[key]);
      }
      const { statEntry } = await api.createStatEntry(prospectId, payload);
      setStats(EMPTY);
      onCreated(statEntry);
    } catch (err) {
      onError(err.message || 'Failed to save box score');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
          Game date
        </label>
        <input
          type="date"
          value={gameDate}
          onChange={(e) => setGameDate(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-5 gap-2">
        {FIELDS.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
              {label}
            </label>
            <input
              type="number"
              min={0}
              value={stats[key]}
              onChange={(e) => setField(key, e.target.value)}
              className="w-full px-2 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
      >
        {saving ? 'Saving…' : 'Log box score'}
      </button>
    </form>
  );
}
