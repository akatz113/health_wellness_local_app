import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, CheckCircle2, AlertCircle, Clock, HelpCircle, ToggleLeft, ToggleRight } from 'lucide-react';

const PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly (3 months)' },
  { value: 'biannual', label: 'Every 6 months' },
  { value: 'yearly', label: 'Yearly' },
];

const NUTRITION_METRICS = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein', label: 'Protein', unit: 'g' },
  { key: 'carbs', label: 'Carbohydrates', unit: 'g' },
  { key: 'fat', label: 'Total Fat', unit: 'g' },
  { key: 'fiber', label: 'Fiber', unit: 'g' },
  { key: 'sugar', label: 'Sugar', unit: 'g' },
  { key: 'sodium', label: 'Sodium', unit: 'mg' },
  { key: 'potassium', label: 'Potassium', unit: 'mg' },
  { key: 'calcium', label: 'Calcium', unit: 'mg' },
  { key: 'iron', label: 'Iron', unit: 'mg' },
  { key: 'vitamin_c', label: 'Vitamin C', unit: 'mg' },
];

const SPECIALTY_SUGGESTIONS = [
  'Primary Care', 'Cardiology', 'Endocrinology', 'Gastroenterology',
  'Dermatology', 'Orthopedics', 'Neurology', 'Ophthalmology', 'Dentistry',
  'Mental Health', 'Physical Therapy',
];

const STATUS_CONFIG = {
  on_track:  { icon: CheckCircle2, bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  badge: 'bg-green-100 text-green-700',  label: 'On Track'  },
  due_soon:  { icon: Clock,        bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700', label: 'Due Soon'  },
  off_track: { icon: AlertCircle,  bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700',    label: 'Off Track' },
  no_data:   { icon: HelpCircle,   bg: 'bg-gray-50',   border: 'border-gray-200',   text: 'text-gray-500',   badge: 'bg-gray-100 text-gray-500',   label: 'No Data'   },
  manual:    { icon: CheckCircle2, bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-600',   badge: 'bg-blue-100 text-blue-600',   label: 'Manual'    },
  error:     { icon: AlertCircle,  bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700',    label: 'Error'     },
};

const CATEGORY_LABELS = {
  nutrition:   { label: 'Nutrition',   color: 'bg-green-100 text-green-700'   },
  appointment: { label: 'Appointment', color: 'bg-blue-100 text-blue-700'     },
  test:        { label: 'Lab Test',    color: 'bg-purple-100 text-purple-700' },
  exercise:    { label: 'Exercise',    color: 'bg-orange-100 text-orange-700' },
  general:     { label: 'General',     color: 'bg-gray-100 text-gray-600'     },
};

const EXERCISE_METRICS = [
  { key: 'sessions', label: 'Workout Sessions', unit: 'sessions', desc: 'Count how many times you work out' },
  { key: 'minutes',  label: 'Active Minutes',   unit: 'min',      desc: 'Total exercise duration'          },
  { key: 'streak',   label: 'Consecutive Days', unit: 'days',     desc: 'Keep a daily exercise streak'     },
];

const ACTIVITY_SUGGESTIONS = [
  'Running', 'Walking', 'Cycling', 'Swimming', 'Hiking',
  'Gym / Weight Training', 'Home HIIT', 'Yoga / Pilates',
];

const emptyForm = {
  title: '', category: 'test', metric_key: '', target_value: '', target_unit: '', period: 'yearly', notes: '',
};

function GoalCard({ goal, onEdit, onDelete, onToggle }) {
  const cfg = STATUS_CONFIG[goal.status] || STATUS_CONFIG.no_data;
  const Icon = cfg.icon;
  const cat = CATEGORY_LABELS[goal.category];

  // Progress bar for nutrition and exercise goals
  const showProgress = (goal.category === 'nutrition' || goal.category === 'exercise')
    && goal.current_value !== null && goal.target_value;
  const progressPct = showProgress ? Math.min((goal.current_value / goal.target_value) * 100, 100) : 0;

  return (
    <div className={`card border ${cfg.border} ${!goal.active ? 'opacity-50' : ''}`}>
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg flex-shrink-0 ${cfg.bg}`}>
            <Icon size={18} className={cfg.text} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h3 className="font-semibold text-gray-900">{goal.title}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat?.color}`}>{cat?.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>{cfg.label}</span>
                  <span className="text-xs text-gray-400 capitalize">{goal.period}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => onToggle(goal)} className={`btn-ghost p-1.5 ${goal.active ? 'text-green-500' : 'text-gray-400'}`} title={goal.active ? 'Disable goal' : 'Enable goal'}>
                  {goal.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </button>
                <button onClick={() => onEdit(goal)} className="btn-ghost p-1.5"><Pencil size={14} /></button>
                <button onClick={() => onDelete(goal.id)} className="btn-ghost p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
              </div>
            </div>

            <p className={`text-sm mt-2 ${cfg.text}`}>{goal.message}</p>

            {showProgress && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{goal.current_value?.toFixed(1)} {goal.target_unit}</span>
                  <span>Goal: {goal.target_value} {goal.target_unit}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${progressPct >= 100 ? 'bg-green-500' : progressPct >= 66 ? 'bg-blue-500' : 'bg-orange-400'}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}

            {goal.next_due && (
              <p className="text-xs text-gray-400 mt-2">Next due: {goal.next_due}</p>
            )}
            {goal.notes && (
              <p className="text-xs text-gray-400 mt-1 italic">{goal.notes}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');

  const load = async () => {
    const [goalsData, statusData] = await Promise.all([
      fetch('/api/goals').then(r => r.json()),
      fetch('/api/goals/status').then(r => r.json()),
    ]);
    const statusMap = Object.fromEntries(statusData.map(g => [g.id, g]));
    setGoals(goalsData);
    setStatuses(statusMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setShowForm(true); };
  const openEdit = (g) => { setForm({ ...g, target_value: g.target_value ?? '', metric_key: g.metric_key ?? '' }); setEditingId(g.id); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditingId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      target_value: form.target_value !== '' ? parseFloat(form.target_value) : null,
    };
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/goals/${editingId}` : '/api/goals';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setSaving(false);
    closeForm();
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this goal?')) return;
    await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    load();
  };

  const handleToggle = async (goal) => {
    await fetch(`/api/goals/${goal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...goal, active: goal.active ? 0 : 1 }),
    });
    load();
  };

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  // Auto-fill unit when nutrition metric changes
  const handleMetricChange = (e) => {
    const metric = NUTRITION_METRICS.find(m => m.key === e.target.value);
    setForm(f => ({ ...f, metric_key: e.target.value, target_unit: metric?.unit || f.target_unit }));
  };

  // Merge status into goals
  const goalsWithStatus = goals.map(g => ({ ...g, ...(statuses[g.id] || { status: 'no_data', message: 'Loading...', current_value: null, next_due: null }) }));
  const filtered = filterCategory ? goalsWithStatus.filter(g => g.category === filterCategory) : goalsWithStatus;

  const counts = { off_track: 0, due_soon: 0, on_track: 0, no_data: 0 };
  goalsWithStatus.filter(g => g.active).forEach(g => { if (counts[g.status] !== undefined) counts[g.status]++; });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Health Goals</h1>
          <p className="text-sm text-gray-500 mt-1">Track nutrition, exercise, appointments, and lab schedules</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add Goal</button>
      </div>

      {/* Summary row */}
      {goals.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Off Track', count: counts.off_track, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
            { label: 'Due Soon', count: counts.due_soon,  bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
            { label: 'On Track', count: counts.on_track,  bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
            { label: 'No Data',  count: counts.no_data,   bg: 'bg-gray-50',  text: 'text-gray-600', border: 'border-gray-200' },
          ].map(({ label, count, bg, text, border }) => (
            <div key={label} className={`rounded-xl border p-4 text-center ${bg} ${border}`}>
              <p className={`text-2xl font-bold ${text}`}>{count}</p>
              <p className={`text-xs font-medium mt-0.5 ${text}`}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
        {[['', 'All'], ['exercise', 'Exercise'], ['nutrition', 'Nutrition'], ['appointment', 'Appointments'], ['test', 'Lab Tests'], ['general', 'General']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilterCategory(val)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filterCategory === val ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >{label}</button>
        ))}
      </div>

      {/* Goals list */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-gray-400 text-sm">{goals.length === 0 ? 'No goals set up yet' : 'No goals in this category'}</p>
          {goals.length === 0 && (
            <div className="mt-4 space-y-2 text-xs text-gray-400 max-w-sm mx-auto">
              <p>Examples: "3 workouts per week", "150g protein daily", "HbA1c every 6 months", "Annual physical"</p>
            </div>
          )}
          <button className="btn-primary mt-4" onClick={openAdd}>Add your first goal</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(goal => (
            <GoalCard key={goal.id} goal={goal} onEdit={openEdit} onDelete={handleDelete} onToggle={handleToggle} />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Goal' : 'New Goal'}</h2>
              <button onClick={closeForm} className="btn-ghost p-1.5"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Goal Title *</label>
                <input className="input" value={form.title} onChange={set('title')} required placeholder="e.g. Annual Primary Care Visit" />
              </div>

              <div>
                <label className="label">Category *</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {[
                    ['test',        'Lab Test'   ],
                    ['appointment', 'Appointment'],
                    ['nutrition',   'Nutrition'  ],
                    ['exercise',    'Exercise'   ],
                    ['general',     'General'    ],
                  ].map(([val, label]) => (
                    <button
                      key={val} type="button"
                      onClick={() => setForm(f => ({
                        ...f,
                        category: val,
                        metric_key: val === 'exercise' ? 'sessions' : '',
                        target_value: '',
                        target_unit: val === 'exercise' ? 'sessions' : '',
                        period: val === 'exercise' ? 'weekly' : f.period,
                      }))}
                      className={`py-2 px-2 rounded-lg border text-sm font-medium transition-colors ${form.category === val ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'}`}
                    >{label}</button>
                  ))}
                </div>
              </div>

              {/* Category-specific fields */}
              {form.category === 'nutrition' && (
                <div className="space-y-3 bg-green-50 rounded-xl p-4 border border-green-100">
                  <div>
                    <label className="label">Nutrient</label>
                    <select className="input" value={form.metric_key} onChange={handleMetricChange} required>
                      <option value="">Select nutrient</option>
                      {NUTRITION_METRICS.map(m => <option key={m.key} value={m.key}>{m.label} ({m.unit})</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Target Amount</label>
                      <input type="number" min="0" step="any" className="input" value={form.target_value} onChange={set('target_value')} placeholder="e.g. 150" required />
                    </div>
                    <div>
                      <label className="label">Unit</label>
                      <input className="input" value={form.target_unit} onChange={set('target_unit')} placeholder="g, kcal, mg" />
                    </div>
                  </div>
                  <div>
                    <label className="label">Period</label>
                    <select className="input" value={form.period} onChange={set('period')}>
                      {PERIODS.slice(0, 3).map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {form.category === 'appointment' && (
                <div className="space-y-3 bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div>
                    <label className="label">Specialty / Type</label>
                    <input className="input" list="specialty-list" value={form.metric_key} onChange={set('metric_key')} placeholder="e.g. Primary Care, Cardiology" />
                    <datalist id="specialty-list">
                      {SPECIALTY_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                    </datalist>
                    <p className="text-xs text-gray-400 mt-1">Leave blank to match any appointment</p>
                  </div>
                  <div>
                    <label className="label">Frequency</label>
                    <select className="input" value={form.period} onChange={set('period')}>
                      {PERIODS.filter(p => p.value !== 'daily').map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {form.category === 'test' && (
                <div className="space-y-3 bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <div>
                    <label className="label">Test Name (partial match)</label>
                    <input className="input" value={form.metric_key} onChange={set('metric_key')} placeholder="e.g. HbA1c, Cholesterol, CBC" required />
                    <p className="text-xs text-gray-400 mt-1">Matches any test name containing this text</p>
                  </div>
                  <div>
                    <label className="label">How Often</label>
                    <select className="input" value={form.period} onChange={set('period')}>
                      {PERIODS.filter(p => p.value !== 'daily').map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {form.category === 'exercise' && (() => {
                // Parse metric_key: 'sessions', 'minutes', 'streak', or 'sessions:Running'
                const parts = (form.metric_key || 'sessions').split(':');
                const exMetric = parts[0] || 'sessions';
                const exActivity = parts[1] || '';
                const isStreak = exMetric === 'streak';

                const setExMetric = (m) => {
                  const unit = m === 'sessions' ? 'sessions' : m === 'minutes' ? 'min' : 'days';
                  setForm(f => ({ ...f, metric_key: exActivity ? `${m}:${exActivity}` : m, target_unit: unit }));
                };
                const setExActivity = (a) => {
                  setForm(f => ({ ...f, metric_key: a ? `${exMetric}:${a}` : exMetric }));
                };

                return (
                  <div className="space-y-3 bg-orange-50 rounded-xl p-4 border border-orange-100">
                    <div>
                      <label className="label">What to Track</label>
                      <div className="grid grid-cols-3 gap-2">
                        {EXERCISE_METRICS.map(m => (
                          <button key={m.key} type="button" onClick={() => setExMetric(m.key)}
                            className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors text-left ${exMetric === m.key ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-300 text-gray-600 hover:border-orange-400'}`}
                          >
                            <p>{m.label}</p>
                            <p className={`text-xs mt-0.5 ${exMetric === m.key ? 'text-orange-100' : 'text-gray-400'}`}>{m.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {!isStreak && (
                      <div>
                        <label className="label">Activity Type (optional)</label>
                        <input className="input" list="ex-activity-list" value={exActivity}
                          onChange={e => setExActivity(e.target.value)}
                          placeholder="Leave blank for any activity" />
                        <datalist id="ex-activity-list">
                          {ACTIVITY_SUGGESTIONS.map(a => <option key={a} value={a} />)}
                        </datalist>
                        <p className="text-xs text-gray-400 mt-1">e.g. "Running" — leave blank to count all workouts</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Target {exMetric === 'sessions' ? 'Sessions' : exMetric === 'minutes' ? 'Minutes' : 'Streak (days)'}</label>
                        <input type="number" min="1" className="input" value={form.target_value}
                          onChange={set('target_value')} placeholder={exMetric === 'sessions' ? 'e.g. 3' : exMetric === 'minutes' ? 'e.g. 150' : 'e.g. 7'} required />
                      </div>
                      {!isStreak && (
                        <div>
                          <label className="label">Period</label>
                          <select className="input" value={form.period} onChange={set('period')}>
                            {PERIODS.filter(p => !['biannual', 'yearly'].includes(p.value)).map(p =>
                              <option key={p.value} value={p.value}>{p.label}</option>
                            )}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {form.category === 'general' && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <label className="label">Frequency (for reference)</label>
                  <select className="input" value={form.period} onChange={set('period')}>
                    {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="label">Notes (optional)</label>
                <textarea className="input" rows={2} value={form.notes} onChange={set('notes')} placeholder="Any additional context..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update Goal' : 'Add Goal'}
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
