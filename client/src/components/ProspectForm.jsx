import { useState } from 'react';
import { api } from '../api/client.js';

const POSITIONS = ['PG', 'SG', 'Combo Guard', 'Wing', 'Forward', 'C'];

const blank = {
  fullName: '',
  position: '',
  secondaryPosition: '',
  gradYear: '',
  heightFeet: '',
  heightInches: '',
  region: '',
  currentSchool: '',
  notes: '',
  inPortal: false,
};

const inputClass =
  'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white';

const labelClass = 'block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5';

export default function ProspectForm({ onCreated, onError }) {
  const [form, setForm] = useState(blank);
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.fullName.trim()) { onError?.('Name is required'); return; }
    setSubmitting(true);
    onError?.('');

    const totalInches =
      form.heightFeet || form.heightInches
        ? Number(form.heightFeet || 0) * 12 + Number(form.heightInches || 0)
        : undefined;

    try {
      const { prospect } = await api.createProspect({
        fullName: form.fullName.trim(),
        position: form.position || undefined,
        secondaryPosition: form.secondaryPosition || undefined,
        gradYear: form.gradYear ? Number(form.gradYear) : undefined,
        heightInches: totalInches,
        region: form.region || undefined,
        currentSchool: form.currentSchool || undefined,
        notes: form.notes.trim() || undefined,
        inPortal: form.inPortal,
      });
      setForm(blank);
      onCreated?.(prospect);
    } catch (err) {
      onError?.(err.message || 'Failed to create prospect');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h3 className="text-base font-semibold text-slate-900 mb-5">New prospect</h3>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          {/* Name — full width */}
          <div className="col-span-2">
            <label className={labelClass}>Name *</label>
            <input
              value={form.fullName}
              onChange={set('fullName')}
              placeholder="Full name"
              className={inputClass}
            />
          </div>

          {/* Primary position */}
          <div>
            <label className={labelClass}>Primary Position</label>
            <select value={form.position} onChange={set('position')} className={inputClass}>
              <option value="">—</option>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Secondary position */}
          <div>
            <label className={labelClass}>Secondary Position</label>
            <select value={form.secondaryPosition} onChange={set('secondaryPosition')} className={inputClass}>
              <option value="">—</option>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>HS Grad Year</label>
            <input
              type="number"
              value={form.gradYear}
              onChange={set('gradYear')}
              placeholder="2026"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Height</label>
            <div className="flex gap-2">
              <input type="number" value={form.heightFeet} onChange={set('heightFeet')} placeholder="ft" className={inputClass} />
              <input type="number" value={form.heightInches} onChange={set('heightInches')} placeholder="in" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Region / State</label>
            <input value={form.region} onChange={set('region')} placeholder="IL" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Current School</label>
            <input value={form.currentSchool} onChange={set('currentSchool')} placeholder="Oak Park HS" className={inputClass} />
          </div>
        </div>

        {/* Notes — full width */}
        <div className="mt-4">
          <label className={labelClass}>Notes</label>
          <textarea
            value={form.notes}
            onChange={set('notes')}
            placeholder="e.g. Strong handle, needs work on off-ball movement…"
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="flex items-center gap-2.5 mt-4">
          <input
            id="portal"
            type="checkbox"
            checked={form.inPortal}
            onChange={(e) => setForm((f) => ({ ...f, inPortal: e.target.checked }))}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="portal" className="text-sm text-slate-700 cursor-pointer">
            In transfer portal
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {submitting ? 'Saving…' : 'Save prospect'}
          </button>
        </div>
      </form>
    </div>
  );
}
