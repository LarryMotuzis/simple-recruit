import { useState } from 'react';
import { api } from '../api/client.js';

const TAGS = ['Shooting', 'Ball IQ', 'Motor', 'Defense', 'Athleticism', 'Playmaking', 'Size'];

export default function EvaluationForm({ prospectId, onCreated, onError }) {
  const [rating, setRating] = useState(7);
  const [notes, setNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [saving, setSaving] = useState(false);

  const toggleTag = (tag) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { evaluation } = await api.createEvaluation(prospectId, {
        rating,
        notes: notes.trim() || undefined,
        tags: selectedTags.length ? selectedTags : undefined,
      });
      setNotes('');
      setSelectedTags([]);
      setRating(7);
      onCreated(evaluation);
    } catch (err) {
      onError(err.message || 'Failed to save evaluation');
    } finally {
      setSaving(false);
    }
  };

  const ratingColor =
    rating >= 8 ? 'text-green-600' : rating >= 6 ? 'text-blue-600' : rating >= 4 ? 'text-amber-600' : 'text-red-500';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Rating slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Rating
          </label>
          <span className={`text-xl font-bold tabular-nums ${ratingColor}`}>
            {rating}<span className="text-sm font-normal text-slate-400">/10</span>
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>1</span>
          <span>5</span>
          <span>10</span>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
          Attributes
        </label>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={[
                'px-3 py-1 text-xs font-medium rounded-full border transition-colors',
                selectedTags.includes(tag)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300',
              ].join(' ')}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
          Notes
        </label>
        <textarea
          placeholder="Notes from film session…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
      >
        {saving ? 'Saving…' : 'Log evaluation'}
      </button>
    </form>
  );
}
