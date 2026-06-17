import { useEffect, useRef, useState } from 'react';
import { X, Check, UserPlus } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api/client.js';

const ROLE_OPTIONS = [
  { value: 'head_coach', label: 'Head Coach' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'viewer', label: 'Viewer' },
];

function AddUserModal({ onClose, onAdded }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('viewer');
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const nameRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) return;
    setSubmitting(true);
    setError('');
    try {
      const { user } = await api.createUser({ fullName: fullName.trim(), email: email.trim(), password, role });
      setSaved(true);
      setTimeout(() => { onAdded(user); onClose(); }, 900);
    } catch (err) {
      setError(err.message || 'Failed to create user');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full md:max-w-sm bg-white md:rounded-2xl rounded-t-2xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="px-5 pt-3 pb-2 flex items-center justify-between md:pt-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add staff member</h2>
            <p className="text-xs text-slate-400 mt-0.5">They can log in right away</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <input
              ref={nameRef}
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Mike Smith"
              autoComplete="off"
              className="w-full px-4 py-3.5 border border-slate-200 rounded-xl text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="mike@lewisu.edu"
              autoComplete="off"
              className="w-full px-4 py-3.5 border border-slate-200 rounded-xl text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 chars"
                autoComplete="new-password"
                className="w-full px-4 py-3.5 border border-slate-200 rounded-xl text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Role
              </label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full px-4 py-3.5 border border-slate-200 rounded-xl text-base text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={!fullName.trim() || !email.trim() || !password || submitting || saved}
            className="w-full py-4 rounded-xl text-base font-bold transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ backgroundColor: saved ? '#16a34a' : '#2563eb', color: '#fff' }}
          >
            {saved ? (
              <><Check className="w-5 h-5" /> Added!</>
            ) : submitting ? (
              'Adding…'
            ) : (
              'Add Staff Member'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    api.listUsers()
      .then(d => setUsers(d.users))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (userId, role) => {
    setSaving(userId);
    setError('');
    try {
      const { user: updated } = await api.updateUserRole(userId, role);
      setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, role: updated.role } : u));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  };

  const handleUserAdded = (newUser) => {
    setUsers(prev => [...prev, newUser].sort((a, b) => a.full_name.localeCompare(b.full_name)));
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="px-8 py-7 bg-slate-900 flex items-end justify-between">
        <div>
          <p className="text-white/50 text-xs font-bold uppercase tracking-widest mb-1">Admin</p>
          <h1 className="text-3xl font-black text-white tracking-tight">Manage Users</h1>
          <p className="text-white/50 text-sm mt-1">Set roles for your staff members</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors mb-0.5"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="px-8 py-8 max-w-2xl mx-auto">
        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-6">{error}</p>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24 text-slate-400 text-sm">Loading…</div>
        ) : (
          <div className="space-y-3">
            {users.map(u => {
              const isSelf = u.id === currentUser?.id;
              return (
                <div
                  key={u.id}
                  className="bg-white border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm"
                >
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">
                      {u.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {u.full_name}
                      {isSelf && <span className="ml-2 text-xs font-normal text-slate-400">(you)</span>}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                  </div>

                  <select
                    value={u.role}
                    disabled={isSelf || saving === u.id}
                    onChange={e => handleRoleChange(u.id, e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    {ROLE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onAdded={handleUserAdded}
        />
      )}
    </div>
  );
}
