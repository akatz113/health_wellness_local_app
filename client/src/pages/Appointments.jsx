import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format, parseISO, isFuture, isPast } from 'date-fns';

const STATUS_OPTIONS = ['upcoming', 'completed', 'cancelled'];
const SPECIALTY_OPTIONS = [
  'Primary Care', 'Cardiology', 'Endocrinology', 'Gastroenterology',
  'Dermatology', 'Orthopedics', 'Neurology', 'Ophthalmology',
  'Dentistry', 'Mental Health', 'Physical Therapy', 'Other',
];

const emptyForm = {
  title: '', doctor_name: '', specialty: '', appointment_date: '',
  location: '', notes: '', status: 'upcoming',
};

const statusIcon = { upcoming: Clock, completed: CheckCircle, cancelled: XCircle };
const statusColor = {
  upcoming: 'text-amber-700 bg-amber-50',
  completed: 'text-green-600 bg-green-50',
  cancelled: 'text-stone-400 bg-stone-100',
};

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('upcoming');

  const load = () => {
    const params = filterStatus ? `?status=${filterStatus}` : '';
    fetch(`/api/appointments${params}`).then(r => r.json()).then(data => {
      setAppointments(data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [filterStatus]);

  const openAdd = () => {
    const now = new Date();
    now.setMinutes(0);
    now.setHours(now.getHours() + 1);
    setForm({ ...emptyForm, appointment_date: now.toISOString().slice(0, 16) });
    setEditingId(null);
    setShowForm(true);
  };
  const openEdit = (a) => {
    setForm({ ...a, appointment_date: a.appointment_date.slice(0, 16) });
    setEditingId(a.id);
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/appointments/${editingId}` : '/api/appointments';
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
    if (!confirm('Delete this appointment?')) return;
    await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
    load();
  };

  const markComplete = async (appt) => {
    await fetch(`/api/appointments/${appt.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...appt, status: 'completed' }),
    });
    load();
  };

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Appointments</h1>
          <p className="text-sm text-stone-500 mt-1">Manage your medical appointments</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Appointment
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-stone-100 p-1 rounded-lg w-fit">
        {[['upcoming', 'Upcoming'], ['completed', 'Completed'], ['cancelled', 'Cancelled'], ['', 'All']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilterStatus(val)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filterStatus === val ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Appointments list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-stone-400 text-sm">No appointments found</p>
          <button className="btn-primary mt-4" onClick={openAdd}>Schedule an appointment</button>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map(appt => {
            const Icon = statusIcon[appt.status];
            const date = parseISO(appt.appointment_date);
            const isOverdue = appt.status === 'upcoming' && isPast(date);

            return (
              <div key={appt.id} className={`card p-5 flex items-start gap-4 ${isOverdue ? 'border-orange-200 bg-orange-50' : ''}`}>
                <div className={`p-2 rounded-lg flex-shrink-0 ${statusColor[appt.status]}`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-stone-900">{appt.title}</p>
                      <p className="text-sm text-stone-600 mt-0.5">
                        {appt.doctor_name && <span>{appt.doctor_name}</span>}
                        {appt.doctor_name && appt.specialty && <span className="mx-1">·</span>}
                        {appt.specialty && <span>{appt.specialty}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className={`text-sm font-medium ${isOverdue ? 'text-orange-600' : 'text-stone-700'}`}>
                          {format(date, 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-stone-400">{format(date, 'h:mm a')}</p>
                      </div>
                    </div>
                  </div>
                  {(appt.location || appt.notes) && (
                    <div className="mt-2 space-y-1">
                      {appt.location && <p className="text-xs text-stone-500">Location: {appt.location}</p>}
                      {appt.notes && <p className="text-xs text-stone-400 line-clamp-2">{appt.notes}</p>}
                    </div>
                  )}
                  {isOverdue && <p className="text-xs text-orange-600 font-medium mt-1">Overdue — mark as completed or update date</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {appt.status === 'upcoming' && (
                    <button onClick={() => markComplete(appt)} className="btn-ghost p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50" title="Mark complete">
                      <CheckCircle size={16} />
                    </button>
                  )}
                  <button onClick={() => openEdit(appt)} className="btn-ghost p-1.5"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(appt.id)} className="btn-ghost p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Appointment' : 'New Appointment'}</h2>
              <button onClick={closeForm} className="btn-ghost p-1.5"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Appointment Title *</label>
                <input className="input" value={form.title} onChange={set('title')} required placeholder="e.g. Annual Physical" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Doctor Name</label>
                  <input className="input" value={form.doctor_name} onChange={set('doctor_name')} placeholder="Dr. Smith" />
                </div>
                <div>
                  <label className="label">Specialty</label>
                  <select className="input" value={form.specialty} onChange={set('specialty')}>
                    <option value="">Select specialty</option>
                    {SPECIALTY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Date &amp; Time *</label>
                  <input type="datetime-local" className="input" value={form.appointment_date} onChange={set('appointment_date')} required />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={form.status} onChange={set('status')}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Location</label>
                <input className="input" value={form.location} onChange={set('location')} placeholder="Clinic name or address" />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={3} value={form.notes} onChange={set('notes')} placeholder="Things to discuss, prep instructions..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Add Appointment'}
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
