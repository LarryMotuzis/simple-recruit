import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Download, ExternalLink, Upload, Trash2, FileText } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.jsx';
import { api } from '../api/client.js';

const TABS = [
  { key: 'd1',      label: 'D1 NCAA',  autoSync: true },
  { key: 'd2',      label: 'D2 NCAA',  autoSync: false },
  { key: 'juco_d1', label: 'JUCO D1',  autoSync: false },
  { key: 'juco_d2', label: 'JUCO D2',  autoSync: false },
];

const POSITIONS = ['PG', 'SG', 'CG', 'Wing', 'SF', 'PF', 'F', 'C'];

const STATUS_BADGE = {
  Available: 'bg-green-100 text-green-700',
  Committed: 'bg-blue-100 text-blue-700',
  Enrolled:  'bg-violet-100 text-violet-700',
  Withdrawn: 'bg-slate-100 text-slate-500',
  Unknown:   'bg-slate-100 text-slate-500',
};

const CSV_TEMPLATE = `full_name,position,height,school,class,stars
John Smith,PG,6-2,Example Community College,Sophomore,3
Jane Doe,SG,5-11,Another College,Junior,`;

function StarRating({ stars }) {
  if (!stars) return <span className="text-slate-300 text-xs">—</span>;
  return (
    <span className="text-amber-400 text-sm tracking-tighter">
      {'★'.repeat(stars)}
      <span className="text-slate-200">{'★'.repeat(5 - stars)}</span>
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatLastSync(dateStr) {
  if (!dateStr) return 'Never synced';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map(line => {
    // Handle quoted fields with commas
    const values = [];
    let cur = '', inQuote = false;
    for (const ch of line + ',') {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { values.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  }).filter(row => row.full_name?.trim());
}

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'portal_import_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function Portal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('d1');
  const canEdit = user?.role === 'head_coach' || user?.role === 'assistant';

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Transfer Portal</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          D1 sourced from On3 · D2 &amp; JUCO via CSV import
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={[
              'px-4 py-2.5 text-sm font-medium rounded-t-lg -mb-px border border-transparent transition-colors',
              activeTab === tab.key
                ? 'border-slate-200 border-b-white bg-white text-blue-600'
                : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <TabContent
        key={activeTab}
        level={activeTab}
        canEdit={canEdit}
        navigate={navigate}
      />
    </div>
  );
}

function TabContent({ level, canEdit, navigate }) {
  const tab = TABS.find(t => t.key === level);
  const [entries, setEntries] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(null);
  const [error, setError] = useState('');
  const [syncResult, setSyncResult] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPosition, setFilterPosition] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { level };
      if (filterStatus) params.status = filterStatus;
      if (filterPosition) params.position = filterPosition;
      const data = await api.listPortal(params);
      setEntries(data.entries);
      setLastSync(data.lastSync);
    } catch (err) {
      setError(err.message || 'Failed to load portal feed');
    } finally {
      setLoading(false);
    }
  }, [level, filterStatus, filterPosition]);

  useEffect(() => { load(); }, [load]);

  const handleSync = async () => {
    setSyncing(true); setSyncResult(null); setError('');
    try {
      const result = await api.syncPortal();
      setSyncResult(result);
      await load();
    } catch (err) { setError(err.message || 'Sync failed'); }
    finally { setSyncing(false); }
  };

  const handleImport = async (entry) => {
    setImporting(entry.id); setError('');
    try {
      const { prospect } = await api.importPortalEntry(entry.id);
      setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, imported_prospect_id: prospect.id } : e));
      navigate(`/prospects/${prospect.id}`);
    } catch (err) { setError(err.message || 'Import failed'); }
    finally { setImporting(null); }
  };

  const visible = filterSearch
    ? entries.filter(e => e.full_name.toLowerCase().includes(filterSearch.toLowerCase()))
    : entries;

  const available = entries.filter(e => e.status === 'Available').length;
  const committed = entries.filter(e => e.status === 'Committed').length;

  return (
    <div>
      {/* D1 sync header / CSV upload header */}
      {tab.autoSync ? (
        <div className="flex items-start justify-between mb-6">
          <p className="text-slate-500 text-sm">
            Sourced from On3 · {formatLastSync(lastSync)}
          </p>
          {canEdit && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing…' : 'Sync portal'}
            </button>
          )}
        </div>
      ) : (
        canEdit && (
          <CsvImport level={level} onImported={load} />
        )
      )}

      {/* Sync result banner */}
      {syncResult && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-2.5 rounded-lg mb-4">
          Synced {syncResult.synced} entries — {syncResult.inserted} new, {syncResult.updated} updated
          <button onClick={() => setSyncResult(null)} className="ml-auto text-green-600 hover:text-green-800">✕</button>
        </div>
      )}

      {/* Stats */}
      {entries.length > 0 && (
        <div className="flex gap-4 mb-5">
          {[
            { label: 'Total', value: entries.length, color: 'text-slate-700' },
            { label: 'Available', value: available, color: 'text-green-600' },
            { label: 'Committed', value: committed, color: 'text-blue-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-lg border border-slate-200 px-4 py-3 text-center min-w-20">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          placeholder="Search by name…"
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          <option value="Available">Available</option>
          <option value="Committed">Committed</option>
          <option value="Enrolled">Enrolled</option>
          <option value="Withdrawn">Withdrawn</option>
        </select>
        <select
          value={filterPosition}
          onChange={e => setFilterPosition(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All positions</option>
          {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 mb-4">{error}</p>
      )}

      {/* Empty state */}
      {!loading && entries.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            {tab.autoSync
              ? <Download className="w-6 h-6 text-slate-400" />
              : <FileText className="w-6 h-6 text-slate-400" />
            }
          </div>
          <h3 className="text-slate-700 font-medium mb-1">No entries yet</h3>
          <p className="text-slate-400 text-sm">
            {tab.autoSync
              ? 'Click "Sync portal" to pull the latest transfer entries from On3.'
              : 'Upload a CSV to add players to this list.'}
          </p>
        </div>
      )}

      {/* Table */}
      {(loading || visible.length > 0) && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Loading…</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Name','Pos','Ht','Class','From','To','Stars','Status','Entered'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">{h}</th>
                  ))}
                  {canEdit && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-900">{e.full_name}</span>
                        {e.on3_slug && (
                          <a href={`https://www.on3.com/rivals/${e.on3_slug}/`} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-blue-500 transition-colors">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{e.position_abbr || '—'}</td>
                    <td className="px-4 py-3.5 text-slate-600">{e.height || '—'}</td>
                    <td className="px-4 py-3.5 text-slate-600">{e.class_rank || '—'}</td>
                    <td className="px-4 py-3.5 text-slate-600 max-w-32 truncate">{e.from_school || '—'}</td>
                    <td className="px-4 py-3.5 text-slate-600 max-w-32 truncate">{e.to_school || '—'}</td>
                    <td className="px-4 py-3.5"><StarRating stars={e.stars} /></td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_BADGE[e.status] ?? STATUS_BADGE.Unknown}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                      {formatDate(e.portal_entered_at)}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3.5 text-right">
                        {e.imported_prospect_id ? (
                          <span className="text-slate-300 text-xs">Imported</span>
                        ) : (
                          <button
                            onClick={() => handleImport(e)}
                            disabled={importing === e.id}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {importing === e.id ? 'Importing…' : '+ Add to board'}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function CsvImport({ level, onImported }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null); // parsed rows before submit
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [clearing, setClearing] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseCSV(ev.target.result);
      setPreview(rows);
      setResult(null);
      setError('');
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!preview?.length) return;
    setUploading(true); setError('');
    try {
      const res = await api.importCsv(level, preview);
      setResult(res);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = '';
      await onImported();
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Remove all CSV-imported entries for this level?')) return;
    setClearing(true);
    try {
      await api.clearCsvEntries(level);
      await onImported();
    } catch (err) {
      setError(err.message || 'Clear failed');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Import from CSV</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Columns: <span className="font-mono">full_name, position, height, school, class, stars</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Template
          </button>
          <button
            onClick={handleClear}
            disabled={clearing}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 border border-red-100 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {clearing ? 'Clearing…' : 'Clear all'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 border-dashed rounded-lg px-4 py-2.5 text-sm text-slate-600 transition-colors">
          <Upload className="w-4 h-4 text-slate-400" />
          Choose CSV file
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="sr-only" />
        </label>

        {preview && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">{preview.length} rows ready</span>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <button onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ''; }} className="text-slate-400 hover:text-slate-600 text-xs">Cancel</button>
          </div>
        )}
      </div>

      {/* Preview table (first 5 rows) */}
      {preview && preview.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-100">
          <table className="text-xs w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {Object.keys(preview[0]).map(k => (
                  <th key={k} className="text-left px-3 py-2 text-slate-500 font-medium capitalize">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {preview.slice(0, 5).map((row, i) => (
                <tr key={i}>
                  {Object.values(row).map((v, j) => (
                    <td key={j} className="px-3 py-2 text-slate-700">{v || '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {preview.length > 5 && (
            <p className="text-xs text-slate-400 px-3 py-2">…and {preview.length - 5} more rows</p>
          )}
        </div>
      )}

      {result && (
        <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 text-sm px-3 py-2 rounded-lg">
          Imported — {result.inserted} new, {result.updated} updated
          {result.errors?.length > 0 && <span className="text-amber-700"> · {result.errors.length} skipped</span>}
          <button onClick={() => setResult(null)} className="ml-auto text-green-600 hover:text-green-800 text-xs">✕</button>
        </div>
      )}

      {error && (
        <p className="mt-3 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}
    </div>
  );
}
