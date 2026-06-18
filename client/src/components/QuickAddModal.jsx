import { useState, useRef, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { api } from '../api/client.js';

const POSITIONS = ['PG', 'SG', 'Combo Guard', 'Wing', 'Forward', 'C'];
const PROSPECT_TYPES = [
  { value: 'high_school', label: 'HS' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'juco', label: 'JUCO' },
];

export default function QuickAddModal({ onClose }) {
  const [name, setName]       = useState('');
  const [position, setPosition] = useState('');
  const [school, setSchool]   = useState('');
  const [prospectType, setProspectType] = useState('high_school');
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');
  const nameRef = useRef(null);

  useEffect(() => {
    // slight delay so the modal animation finishes before keyboard pops
    const t = setTimeout(() => nameRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setSubmitting(true);
    setError('');
    try {
      await api.createProspect({
        fullName: name.trim(),
        position: position || undefined,
        currentSchool: school.trim() || undefined,
        prospectType,
      });
      setSaved(true);
      setTimeout(onClose, 900);
    } catch (err) {
      setError(err.message || 'Failed to save');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Sheet — slides up from bottom on mobile, centered modal on desktop */}
      <div
        className="relative w-full md:max-w-sm bg-white md:rounded-2xl rounded-t-2xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="px-5 pt-3 pb-2 flex items-center justify-between md:pt-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Quick add</h2>
            <p className="text-xs text-slate-400 mt-0.5">Fill in more details later</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-6 space-y-4">
          {/* Type */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            {PROSPECT_TYPES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setProspectType(value)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  prospectType === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Name — autofocused */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Name *
            </label>
            <input
              ref={nameRef}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Marcus Johnson"
              autoComplete="off"
              className="w-full px-4 py-3.5 border border-slate-200 rounded-xl text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Position */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Position
              </label>
              <select
                value={position}
                onChange={e => setPosition(e.target.value)}
                className="w-full px-4 py-3.5 border border-slate-200 rounded-xl text-base text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">—</option>
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* School */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                School
              </label>
              <input
                value={school}
                onChange={e => setSchool(e.target.value)}
                placeholder="Oak Park HS"
                autoComplete="off"
                className="w-full px-4 py-3.5 border border-slate-200 rounded-xl text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={!name.trim() || submitting || saved}
            className="w-full py-4 rounded-xl text-base font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ backgroundColor: saved ? '#16a34a' : '#2563eb', color: '#fff' }}
          >
            {saved ? (
              <><Check className="w-5 h-5" /> Saved!</>
            ) : submitting ? (
              'Saving…'
            ) : (
              'Add Prospect'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
