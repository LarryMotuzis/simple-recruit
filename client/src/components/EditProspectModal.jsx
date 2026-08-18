import { useState } from 'react';
import { X } from 'lucide-react';
import { api } from '../api/client.js';
import PriorityStars from './PriorityStars.jsx';

const POSITIONS = ['PG', 'SG', 'Combo Guard', 'Wing', 'Forward', 'C'];

const PROSPECT_TYPES = [
  { value: 'high_school', label: 'High School' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'juco', label: 'JUCO' },
];

const inputClass =
  'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white';

const labelClass = 'block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5';

export default function EditProspectModal({ prospect, onSaved, onClose }) {
  const [form, setForm] = useState({
    prospectType: prospect.prospect_type || 'high_school',
    fullName: prospect.full_name || '',
    position: prospect.position || '',
    secondaryPosition: prospect.secondary_position || '',
    gradYear: prospect.grad_year || '',
    heightFeet: prospect.height_inches ? Math.floor(prospect.height_inches / 12) : '',
    heightInches: prospect.height_inches ? prospect.height_inches % 12 : '',
    weightLbs: prospect.weight_lbs || '',
    region: prospect.region || '',
    currentSchool: prospect.current_school || '',
    contactPhone: prospect.contact_phone || '',
    contactEmail: prospect.contact_email || '',
    parentName: prospect.parent_name || '',
    parentPhone: prospect.parent_phone || '',
    parentEmail: prospect.parent_email || '',
    aauCoachName: prospect.aau_coach_name || '',
    aauCoachPhone: prospect.aau_coach_phone || '',
    aauCoachEmail: prospect.aau_coach_email || '',
    hsCoachName: prospect.hs_coach_name || '',
    hsCoachPhone: prospect.hs_coach_phone || '',
    hsCoachEmail: prospect.hs_coach_email || '',
    priority: prospect.priority || null,
    notes: prospect.notes || '',
    inPortal: prospect.in_portal || false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!form.fullName.trim()) { setError('Name is required'); return; }
    setSubmitting(true);
    setError('');

    const totalInches =
      form.heightFeet || form.heightInches
        ? Number(form.heightFeet || 0) * 12 + Number(form.heightInches || 0)
        : null;

    try {
      const { prospect: updated } = await api.updateProspect(prospect.id, {
        prospectType: form.prospectType,
        fullName: form.fullName.trim(),
        position: form.position || null,
        secondaryPosition: form.secondaryPosition || null,
        gradYear: form.prospectType === 'high_school' ? (form.gradYear ? Number(form.gradYear) : null) : null,
        heightInches: totalInches,
        weightLbs: form.weightLbs ? Number(form.weightLbs) : null,
        region: form.region || null,
        currentSchool: form.currentSchool || null,
        contactPhone: form.contactPhone.trim() || null,
        contactEmail: form.contactEmail.trim() || null,
        parentName: form.parentName.trim() || null,
        parentPhone: form.parentPhone.trim() || null,
        parentEmail: form.parentEmail.trim() || null,
        aauCoachName: form.aauCoachName.trim() || null,
        aauCoachPhone: form.aauCoachPhone.trim() || null,
        aauCoachEmail: form.aauCoachEmail.trim() || null,
        hsCoachName: form.hsCoachName.trim() || null,
        hsCoachPhone: form.hsCoachPhone.trim() || null,
        hsCoachEmail: form.hsCoachEmail.trim() || null,
        priority: form.priority || null,
        notes: form.notes.trim() || null,
        inPortal: form.prospectType === 'transfer' ? form.inPortal : false,
      });
      onSaved?.(updated);
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="text-base font-semibold text-slate-900">Edit prospect</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-6 py-5">
          {/* Type selector */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden mb-5">
            {PROSPECT_TYPES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, prospectType: value }))}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  form.prospectType === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div className="col-span-2">
              <label className={labelClass}>Name *</label>
              <input value={form.fullName} onChange={set('fullName')} className={inputClass} />
            </div>

            {/* Priority */}
            <div className="col-span-2">
              <label className={labelClass}>Priority</label>
              <PriorityStars
                size="lg"
                value={form.priority}
                onChange={(priority) => setForm((f) => ({ ...f, priority }))}
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

            {form.prospectType === 'high_school' && (
              <div>
                <label className={labelClass}>HS Class</label>
                <select value={form.gradYear} onChange={set('gradYear')} className={inputClass}>
                  <option value="">—</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                </select>
              </div>
            )}

            <div>
              <label className={labelClass}>Height</label>
              <div className="flex gap-2">
                <input type="number" value={form.heightFeet} onChange={set('heightFeet')} placeholder="ft" className={inputClass} />
                <input type="number" value={form.heightInches} onChange={set('heightInches')} placeholder="in" className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Weight (lbs)</label>
              <input type="number" value={form.weightLbs} onChange={set('weightLbs')} placeholder="185" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Region / State</label>
              <input value={form.region} onChange={set('region')} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Current School</label>
              <input value={form.currentSchool} onChange={set('currentSchool')} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Phone</label>
              <input type="tel" value={form.contactPhone} onChange={set('contactPhone')} placeholder="(555) 000-0000" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={form.contactEmail} onChange={set('contactEmail')} placeholder="player@email.com" className={inputClass} />
            </div>
          </div>

          {/* Additional contacts */}
          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Parent / Guardian</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>Name</label>
                <input value={form.parentName} onChange={set('parentName')} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input type="tel" value={form.parentPhone} onChange={set('parentPhone')} placeholder="(555) 000-0000" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={form.parentEmail} onChange={set('parentEmail')} placeholder="parent@email.com" className={inputClass} />
              </div>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">AAU Coach</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>Name</label>
                <input value={form.aauCoachName} onChange={set('aauCoachName')} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input type="tel" value={form.aauCoachPhone} onChange={set('aauCoachPhone')} placeholder="(555) 000-0000" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={form.aauCoachEmail} onChange={set('aauCoachEmail')} placeholder="coach@email.com" className={inputClass} />
              </div>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">HS Coach</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>Name</label>
                <input value={form.hsCoachName} onChange={set('hsCoachName')} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input type="tel" value={form.hsCoachPhone} onChange={set('hsCoachPhone')} placeholder="(555) 000-0000" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={form.hsCoachEmail} onChange={set('hsCoachEmail')} placeholder="coach@email.com" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Notes */}
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

          {form.prospectType === 'transfer' && (
            <div className="flex items-center gap-2.5 mt-4">
              <input
                id="edit-portal"
                type="checkbox"
                checked={form.inPortal}
                onChange={(e) => setForm((f) => ({ ...f, inPortal: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="edit-portal" className="text-sm text-slate-700 cursor-pointer">
                In transfer portal
              </label>
            </div>
          )}

          {error && (
            <p className="mt-3 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 mt-5">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
