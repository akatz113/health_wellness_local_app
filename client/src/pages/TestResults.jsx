import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, ChevronDown, Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const STATUS_OPTIONS = ['normal', 'high', 'low', 'unknown'];
const CATEGORY_OPTIONS = ['Blood Work', 'Metabolic Panel', 'Lipid Panel', 'Thyroid', 'Urinalysis', 'Imaging', 'Other'];

const emptyForm = {
  test_name: '', value: '', unit: '', reference_range: '',
  status: 'unknown', test_date: '', lab_name: '', category: '', notes: '',
};

export default function TestResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterStatus) params.set('status', filterStatus);
    if (filterCategory) params.set('category', filterCategory);
    fetch(`/api/test-results?${params}`).then(r => r.json()).then(data => {
      setResults(data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [search, filterStatus, filterCategory]);

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const openEdit = (r) => {
    setForm({ ...r, test_date: r.test_date.slice(0, 10) });
    setEditingId(r.id);
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/test-results/${editingId}` : '/api/test-results';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    closeForm();
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this result?')) return;
    await fetch(`/api/test-results/${id}`, { method: 'DELETE' });
    load();
  };

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Lab Results</h1>
          <p className="text-sm text-stone-500 mt-1">Track your medical test results over time</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Result
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text" placeholder="Search tests..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input w-auto">
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input w-auto">
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Results table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-stone-400 text-sm">No results found</p>
            <button className="btn-primary mt-4" onClick={openAdd}>Add your first result</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  {['Test Name', 'Value', 'Reference Range', 'Status', 'Date', 'Lab', 'Category', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {results.map(r => (
                  <tr key={r.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-stone-900">
                      {r.test_name}
                      {r.notes && <p className="text-xs text-stone-400 font-normal mt-0.5 max-w-xs truncate">{r.notes}</p>}
                    </td>
                    <td className="px-4 py-3 font-semibold">{r.value} {r.unit}</td>
                    <td className="px-4 py-3 text-stone-500">{r.reference_range || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge-${r.status}`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-stone-500 whitespace-nowrap">
                      {format(parseISO(r.test_date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-stone-500">{r.lab_name || '—'}</td>
                    <td className="px-4 py-3 text-stone-500">{r.category || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(r)} className="btn-ghost p-1.5"><Pencil size={14} /></button>
                        <button onClick={() => handleDelete(r.id)} className="btn-ghost p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Result' : 'Add Lab Result'}</h2>
              <button onClick={closeForm} className="btn-ghost p-1.5"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="label">Test Name *</label>
                  <input className="input" value={form.test_name} onChange={set('test_name')} required placeholder="e.g. Hemoglobin A1C" />
                </div>
                <div>
                  <label className="label">Value *</label>
                  <input className="input" value={form.value} onChange={set('value')} required placeholder="e.g. 5.4" />
                </div>
                <div>
                  <label className="label">Unit</label>
                  <input className="input" value={form.unit} onChange={set('unit')} placeholder="e.g. %, mg/dL" />
                </div>
                <div>
                  <label className="label">Reference Range</label>
                  <input className="input" value={form.reference_range} onChange={set('reference_range')} placeholder="e.g. 4.0-5.6" />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={form.status} onChange={set('status')}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Test Date *</label>
                  <input type="date" className="input" value={form.test_date} onChange={set('test_date')} required />
                </div>
                <div>
                  <label className="label">Lab Name</label>
                  <input className="input" value={form.lab_name} onChange={set('lab_name')} placeholder="e.g. Quest Diagnostics" />
                </div>
                <div className="col-span-2">
                  <label className="label">Category</label>
                  <select className="input" value={form.category} onChange={set('category')}>
                    <option value="">Select category</option>
                    {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="label">Notes</label>
                  <textarea className="input" rows={3} value={form.notes} onChange={set('notes')} placeholder="Any additional notes..." />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update Result' : 'Add Result'}
                </button>
                <button type="button" className="btn-secondary" onClick={closeForm}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
