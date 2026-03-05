import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, X, Search, Tag } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const SOURCE_OPTIONS = ['personal', 'doctor', 'research', 'book', 'other'];
const SOURCE_COLORS = {
  doctor: 'bg-blue-100 text-blue-700',
  research: 'bg-purple-100 text-purple-700',
  personal: 'bg-gray-100 text-gray-600',
  book: 'bg-amber-100 text-amber-700',
  other: 'bg-slate-100 text-slate-600',
};

const emptyForm = { title: '', content: '', source: 'personal', tags: [] };

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [viewingNote, setViewingNote] = useState(null);

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterSource) params.set('source', filterSource);
    fetch(`/api/notes?${params}`).then(r => r.json()).then(data => {
      setNotes(data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [search, filterSource]);

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setTagInput(''); setShowForm(true); };
  const openEdit = (n) => { setForm({ ...n }); setEditingId(n.id); setTagInput(''); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/notes/${editingId}` : '/api/notes';
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
    if (!confirm('Delete this note?')) return;
    await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    setViewingNote(null);
    load();
  };

  const addTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase();
      if (!form.tags.includes(tag)) {
        setForm(f => ({ ...f, tags: [...f.tags, tag] }));
      }
      setTagInput('');
    }
  };

  const removeTag = (tag) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notes</h1>
          <p className="text-sm text-gray-500 mt-1">Knowledge from doctors, research, and personal insights</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Note
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Search notes..." value={search}
            onChange={e => setSearch(e.target.value)} className="input pl-9"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setFilterSource('')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${!filterSource ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
          >All</button>
          {SOURCE_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setFilterSource(filterSource === s ? '' : s)}
              className={`px-3 py-1 text-sm rounded-md capitalize transition-colors ${filterSource === s ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Notes grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-gray-400 text-sm">No notes found</p>
          <button className="btn-primary mt-4" onClick={openAdd}>Add your first note</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map(note => (
            <div
              key={note.id}
              className="card p-5 cursor-pointer hover:shadow-md transition-shadow flex flex-col"
              onClick={() => setViewingNote(note)}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">{note.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${SOURCE_COLORS[note.source] || SOURCE_COLORS.other}`}>
                  {note.source}
                </span>
              </div>
              <p className="text-sm text-gray-600 line-clamp-4 flex-1">{note.content}</p>
              {note.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {note.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      <Tag size={10} /> {tag}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-3">{format(parseISO(note.updated_at), 'MMM d, yyyy')}</p>
            </div>
          ))}
        </div>
      )}

      {/* View Note Modal */}
      {viewingNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewingNote(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-6 border-b gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${SOURCE_COLORS[viewingNote.source] || SOURCE_COLORS.other}`}>
                    {viewingNote.source}
                  </span>
                  <span className="text-xs text-gray-400">{format(parseISO(viewingNote.updated_at), 'MMM d, yyyy')}</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{viewingNote.title}</h2>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setViewingNote(null); openEdit(viewingNote); }} className="btn-ghost p-1.5"><Pencil size={16} /></button>
                <button onClick={() => handleDelete(viewingNote.id)} className="btn-ghost p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                <button onClick={() => setViewingNote(null)} className="btn-ghost p-1.5"><X size={18} /></button>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{viewingNote.content}</p>
              {viewingNote.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
                  {viewingNote.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                      <Tag size={12} /> {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Note' : 'New Note'}</h2>
              <button onClick={closeForm} className="btn-ghost p-1.5"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Title *</label>
                <input className="input" value={form.title} onChange={set('title')} required placeholder="Note title" />
              </div>
              <div>
                <label className="label">Source</label>
                <select className="input" value={form.source} onChange={set('source')}>
                  {SOURCE_OPTIONS.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Content *</label>
                <textarea className="input" rows={10} value={form.content} onChange={set('content')} required placeholder="Write your note here..." />
              </div>
              <div>
                <label className="label">Tags (press Enter to add)</label>
                <input
                  className="input"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={addTag}
                  placeholder="e.g. diet, medication, exercise"
                />
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1.5 text-sm bg-blue-100 text-blue-700 px-3 py-0.5 rounded-full">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-blue-900"><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update Note' : 'Add Note'}
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
