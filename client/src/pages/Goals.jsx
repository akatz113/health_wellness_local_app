import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, CheckCircle2, AlertCircle, Clock, HelpCircle, ToggleLeft, ToggleRight, Trophy, Square, CheckSquare, ChevronDown, ChevronUp, Calendar } from 'lucide-react';

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
  no_data:   { icon: HelpCircle,   bg: 'bg-stone-50',   border: 'border-stone-200',   text: 'text-stone-500',   badge: 'bg-stone-100 text-stone-500',   label: 'No Data'   },
  manual:    { icon: CheckCircle2, bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-700',   label: 'Manual'    },
  error:     { icon: AlertCircle,  bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700',    label: 'Error'     },
};

const CATEGORY_LABELS = {
  nutrition:   { label: 'Nutrition',   color: 'bg-green-100 text-green-700'   },
  appointment: { label: 'Appointment', color: 'bg-amber-100 text-amber-800'     },
  test:        { label: 'Lab Test',    color: 'bg-purple-100 text-purple-700' },
  exercise:    { label: 'Exercise',    color: 'bg-orange-100 text-orange-700' },
  general:     { label: 'General',     color: 'bg-stone-100 text-stone-600'     },
};


const emptyForm = {
  title: '', category: 'test', metric_key: '', target_value: '', target_unit: '', period: 'yearly', notes: '',
};

// ─── GoalCard (unchanged) ────────────────────────────────────────────────────

function GoalCard({ goal, onEdit, onDelete, onToggle }) {
  const cfg = STATUS_CONFIG[goal.status] || STATUS_CONFIG.no_data;
  const Icon = cfg.icon;
  const cat = CATEGORY_LABELS[goal.category];

  const isSimpleExercise = goal.category === 'exercise' && (!goal.metric_key || goal.metric_key.startsWith('['));
  let exerciseTags = [];
  if (isSimpleExercise && goal.metric_key) {
    try { exerciseTags = JSON.parse(goal.metric_key); } catch {}
  }

  const showProgress = (goal.category === 'nutrition' || (goal.category === 'exercise' && !isSimpleExercise))
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
                <h3 className="font-semibold text-stone-900">{goal.title}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat?.color}`}>{cat?.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>{cfg.label}</span>
                  {!isSimpleExercise && <span className="text-xs text-stone-400 capitalize">{goal.period}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => onToggle(goal)} className={`btn-ghost p-1.5 ${goal.active ? 'text-green-500' : 'text-stone-400'}`} title={goal.active ? 'Disable goal' : 'Enable goal'}>
                  {goal.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </button>
                <button onClick={() => onEdit(goal)} className="btn-ghost p-1.5"><Pencil size={14} /></button>
                <button onClick={() => onDelete(goal.id)} className="btn-ghost p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
              </div>
            </div>

            <p className={`text-sm mt-2 ${cfg.text}`}>{goal.message}</p>

            {isSimpleExercise && exerciseTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {exerciseTags.map((tag, i) => (
                  <span key={i} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{tag}</span>
                ))}
              </div>
            )}

            {showProgress && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs text-stone-500">
                  <span>{goal.current_value?.toFixed(1)} {goal.target_unit}</span>
                  <span>Goal: {goal.target_value} {goal.target_unit}</span>
                </div>
                <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${progressPct >= 100 ? 'bg-green-500' : progressPct >= 66 ? 'bg-amber-600' : 'bg-orange-400'}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}

            {goal.next_due && (
              <p className="text-xs text-stone-400 mt-2">Next due: {goal.next_due}</p>
            )}
            {goal.notes && (
              <p className="text-xs text-stone-400 mt-1 italic">{goal.notes}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ChallengeCard ───────────────────────────────────────────────────────────

function ChallengeCard({ challenge, onCheckIn, onEdit, onDelete, onToggle }) {
  const [expanded, setExpanded] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState(null);

  const today = new Date().toISOString().slice(0, 10);
  const items = challenge.items || [];
  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;
  const allDone = totalCount > 0 && completedCount === totalCount;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const startDate = challenge.start_date;
  const endDate = challenge.end_date;
  const daysSinceStart = startDate ? Math.floor((new Date(today) - new Date(startDate)) / 86400000) + 1 : null;
  const totalDays = startDate && endDate ? Math.floor((new Date(endDate) - new Date(startDate)) / 86400000) + 1 : null;

  const loadHistory = async () => {
    if (history) { setShowHistory(!showHistory); return; }
    const days = totalDays ? Math.min(totalDays, 90) : 30;
    const data = await fetch(`/api/challenges/${challenge.id}/history?days=${days}`).then(r => r.json());
    setHistory(data);
    setShowHistory(true);
  };

  return (
    <div className={`card border ${allDone ? 'border-green-200' : 'border-indigo-200'} ${!challenge.active ? 'opacity-50' : ''}`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-lg flex-shrink-0 ${allDone ? 'bg-green-50' : 'bg-indigo-50'}`}>
              <Trophy size={18} className={allDone ? 'text-green-600' : 'text-indigo-600'} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-stone-900">{challenge.title}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700">Challenge</span>
                {allDone && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">All Done Today</span>}
              </div>
              {challenge.description && (
                <p className="text-sm text-stone-500 mt-1">{challenge.description}</p>
              )}
              <div className="flex items-center gap-3 mt-1 text-xs text-stone-400">
                {startDate && <span>Started {startDate}</span>}
                {endDate && <span>Ends {endDate}</span>}
                {daysSinceStart !== null && <span>Day {daysSinceStart}{totalDays ? ` of ${totalDays}` : ''}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => onToggle(challenge)} className={`btn-ghost p-1.5 ${challenge.active ? 'text-green-500' : 'text-stone-400'}`} title={challenge.active ? 'Disable' : 'Enable'}>
              {challenge.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            </button>
            <button onClick={() => onEdit(challenge)} className="btn-ghost p-1.5"><Pencil size={14} /></button>
            <button onClick={() => onDelete(challenge.id)} className="btn-ghost p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></button>
            <button onClick={() => setExpanded(!expanded)} className="btn-ghost p-1.5">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Today's progress bar */}
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-xs text-stone-500">
            <span>Today&apos;s progress</span>
            <span>{completedCount} / {totalCount}</span>
          </div>
          <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${allDone ? 'bg-green-500' : progressPct >= 50 ? 'bg-indigo-500' : 'bg-indigo-300'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Checklist items */}
        {expanded && (
          <div className="mt-4 space-y-1.5">
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => onCheckIn(item.id, today, !item.completed)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  item.completed
                    ? 'bg-green-50 hover:bg-green-100'
                    : 'bg-stone-50 hover:bg-stone-100'
                }`}
              >
                {item.completed
                  ? <CheckSquare size={18} className="text-green-600 flex-shrink-0" />
                  : <Square size={18} className="text-stone-400 flex-shrink-0" />
                }
                <span className={`text-sm flex-1 ${item.completed ? 'text-green-700 line-through' : 'text-stone-700'}`}>
                  {item.title}
                </span>
                {item.target_value && (
                  <span className="text-xs text-stone-400">{item.target_value} {item.target_unit || ''} / {item.period}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* History toggle */}
        <div className="mt-3 flex">
          <button onClick={loadHistory} className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
            <Calendar size={12} /> {showHistory ? 'Hide history' : 'View history'}
          </button>
        </div>

        {/* History grid */}
        {showHistory && history && (
          <div className="mt-3 overflow-x-auto">
            <div className="flex gap-0.5 min-w-0">
              {history.map(day => {
                const pct = day.totalCount > 0 ? day.completedCount / day.totalCount : 0;
                const bg = pct === 0 ? 'bg-stone-200' : pct < 1 ? 'bg-indigo-300' : 'bg-green-500';
                const dateLabel = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                return (
                  <div key={day.date} className="group relative flex flex-col items-center">
                    <div className={`w-4 h-4 rounded-sm ${bg}`} />
                    <div className="absolute bottom-full mb-1 hidden group-hover:block bg-stone-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                      {dateLabel}: {day.completedCount}/{day.totalCount}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-stone-400 mt-1">
              <span>{history.length} days</span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-stone-200 inline-block" /> None</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-indigo-300 inline-block" /> Partial</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" /> All</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Challenge Form Modal ────────────────────────────────────────────────────

const emptyChallengeForm = {
  title: '',
  description: '',
  start_date: new Date().toISOString().slice(0, 10),
  end_date: '',
  items: [{ title: '', item_type: 'checklist', target_value: '', target_unit: '', period: 'daily' }],
};

function ChallengeFormModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || emptyChallengeForm);
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const updateItem = (idx, field, value) => {
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) => i === idx ? { ...item, [field]: value } : item),
    }));
  };

  const addItem = () => {
    setForm(f => ({
      ...f,
      items: [...f.items, { title: '', item_type: 'checklist', target_value: '', target_unit: '', period: 'daily' }],
    }));
  };

  const removeItem = (idx) => {
    if (form.items.length <= 1) return;
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      ...form,
      items: form.items.filter(i => i.title.trim()).map(i => ({
        ...i,
        target_value: i.target_value !== '' ? parseFloat(i.target_value) : null,
      })),
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{initial?.id ? 'Edit Challenge' : 'New Challenge'}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Challenge Name *</label>
            <input className="input" value={form.title} onChange={set('title')} required placeholder="e.g. 75 Hard, 30-Day Reset" />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={set('description')} placeholder="What is this challenge about?" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" value={form.start_date} onChange={set('start_date')} />
            </div>
            <div>
              <label className="label">End Date (optional)</label>
              <input type="date" className="input" value={form.end_date} onChange={set('end_date')} />
            </div>
          </div>

          {/* Challenge Items */}
          <div>
            <label className="label">Daily Tasks / Rules *</label>
            <p className="text-xs text-stone-400 mb-2">Add each task or rule you need to check off each day</p>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="bg-indigo-50 rounded-xl p-3 border border-indigo-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      className="input flex-1"
                      value={item.title}
                      onChange={e => updateItem(idx, 'title', e.target.value)}
                      placeholder={`e.g. ${['2 workouts', 'No desserts', '1 gallon of water', '10 pages of reading', 'No fast food', 'No alcohol'][idx % 6]}`}
                      required={idx === 0}
                    />
                    {form.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="btn-ghost p-1.5 text-red-400 hover:text-red-600">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {/* Optional: target value for quantifiable items */}
                  <div className="flex items-center gap-2">
                    <select
                      className="input text-xs py-1.5 w-28"
                      value={item.item_type}
                      onChange={e => updateItem(idx, 'item_type', e.target.value)}
                    >
                      <option value="checklist">Checklist</option>
                      <option value="metric">Has a target</option>
                    </select>
                    {item.item_type === 'metric' && (
                      <>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="input text-xs py-1.5 w-20"
                          value={item.target_value}
                          onChange={e => updateItem(idx, 'target_value', e.target.value)}
                          placeholder="Target"
                        />
                        <input
                          className="input text-xs py-1.5 w-24"
                          value={item.target_unit}
                          onChange={e => updateItem(idx, 'target_unit', e.target.value)}
                          placeholder="Unit"
                        />
                        <select
                          className="input text-xs py-1.5 w-24"
                          value={item.period}
                          onChange={e => updateItem(idx, 'period', e.target.value)}
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                        </select>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem} className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              <Plus size={14} /> Add another task
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving...' : initial?.id ? 'Update Challenge' : 'Create Challenge'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Goals Page ─────────────────────────────────────────────────────────

export default function Goals() {
  const [activeTab, setActiveTab] = useState('goals');

  // Goals state
  const [goals, setGoals] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [exTags, setExTags] = useState([]);
  const [exTagInput, setExTagInput] = useState('');

  // Challenges state
  const [challenges, setChallenges] = useState([]);
  const [challengesLoading, setChallengesLoading] = useState(true);
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState(null);

  const loadGoals = async () => {
    const [goalsData, statusData] = await Promise.all([
      fetch('/api/goals').then(r => r.json()),
      fetch('/api/goals/status').then(r => r.json()),
    ]);
    const statusMap = Object.fromEntries(statusData.map(g => [g.id, g]));
    setGoals(goalsData);
    setStatuses(statusMap);
    setLoading(false);
  };

  const loadChallenges = async () => {
    const data = await fetch('/api/challenges').then(r => r.json());
    setChallenges(data);
    setChallengesLoading(false);
  };

  useEffect(() => { loadGoals(); loadChallenges(); }, []);

  // ─── Goal handlers ──────────────────────────────────────────────────────

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setExTags([]); setExTagInput(''); setShowForm(true); };
  const openEdit = (g) => {
    setForm({ ...g, target_value: g.target_value ?? '', metric_key: g.metric_key ?? '' });
    setEditingId(g.id);
    if (g.category === 'exercise' && g.metric_key && g.metric_key.startsWith('[')) {
      try { setExTags(JSON.parse(g.metric_key)); } catch { setExTags([]); }
    } else { setExTags([]); }
    setExTagInput('');
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditingId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      metric_key: form.category === 'exercise' ? JSON.stringify(exTags) : form.metric_key,
      target_value: form.category === 'exercise' ? null : (form.target_value !== '' ? parseFloat(form.target_value) : null),
      target_unit: form.category === 'exercise' ? null : form.target_unit,
      period: form.category === 'exercise' ? 'yearly' : form.period,
    };
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/goals/${editingId}` : '/api/goals';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setSaving(false);
    closeForm();
    loadGoals();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this goal?')) return;
    await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    loadGoals();
  };

  const handleToggle = async (goal) => {
    await fetch(`/api/goals/${goal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...goal, active: goal.active ? 0 : 1 }),
    });
    loadGoals();
  };

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleMetricChange = (e) => {
    const metric = NUTRITION_METRICS.find(m => m.key === e.target.value);
    setForm(f => ({ ...f, metric_key: e.target.value, target_unit: metric?.unit || f.target_unit }));
  };

  // ─── Challenge handlers ─────────────────────────────────────────────────

  const handleSaveChallenge = async (data) => {
    const method = data.id ? 'PUT' : 'POST';
    const url = data.id ? `/api/challenges/${data.id}` : '/api/challenges';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    setShowChallengeForm(false);
    setEditingChallenge(null);
    loadChallenges();
  };

  const handleDeleteChallenge = async (id) => {
    if (!confirm('Delete this challenge and all its history?')) return;
    await fetch(`/api/challenges/${id}`, { method: 'DELETE' });
    loadChallenges();
  };

  const handleToggleChallenge = async (ch) => {
    await fetch(`/api/challenges/${ch.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...ch, active: ch.active ? 0 : 1 }),
    });
    loadChallenges();
  };

  const handleCheckIn = async (itemId, date, completed) => {
    await fetch('/api/challenges/check-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challenge_item_id: itemId, check_date: date, completed }),
    });
    loadChallenges();
  };

  const openEditChallenge = (ch) => {
    setEditingChallenge({
      ...ch,
      items: ch.items.map(i => ({
        ...i,
        target_value: i.target_value ?? '',
        target_unit: i.target_unit ?? '',
      })),
    });
    setShowChallengeForm(true);
  };

  // ─── Derived data ───────────────────────────────────────────────────────

  const goalsWithStatus = goals.map(g => ({ ...g, ...(statuses[g.id] || { status: 'no_data', message: 'Loading...', current_value: null, next_due: null }) }));
  const filtered = filterCategory ? goalsWithStatus.filter(g => g.category === filterCategory) : goalsWithStatus;

  const counts = { off_track: 0, due_soon: 0, on_track: 0, no_data: 0 };
  goalsWithStatus.filter(g => g.active).forEach(g => { if (counts[g.status] !== undefined) counts[g.status]++; });

  const activeChallenges = challenges.filter(c => c.active);
  const inactiveChallenges = challenges.filter(c => !c.active);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Health Goals</h1>
          <p className="text-sm text-stone-500 mt-1">Track nutrition, exercise, appointments, and lab schedules</p>
        </div>
        {activeTab === 'goals' ? (
          <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add Goal</button>
        ) : (
          <button className="btn-primary" onClick={() => { setEditingChallenge(null); setShowChallengeForm(true); }}>
            <Plus size={16} /> New Challenge
          </button>
        )}
      </div>

      {/* Goals / Challenges tab toggle */}
      <div className="flex gap-1 bg-stone-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('goals')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
            activeTab === 'goals' ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Goals
          {goals.length > 0 && <span className="text-xs bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded-full">{goals.length}</span>}
        </button>
        <button
          onClick={() => setActiveTab('challenges')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
            activeTab === 'challenges' ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          <Trophy size={14} /> Challenges
          {challenges.length > 0 && <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">{challenges.length}</span>}
        </button>
      </div>

      {/* ════════════════ GOALS TAB ════════════════ */}
      {activeTab === 'goals' && (
        <>
          {/* Summary row */}
          {goals.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Off Track', count: counts.off_track, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
                { label: 'Due Soon', count: counts.due_soon,  bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
                { label: 'On Track', count: counts.on_track,  bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
                { label: 'No Data',  count: counts.no_data,   bg: 'bg-stone-50',  text: 'text-stone-600', border: 'border-stone-200' },
              ].map(({ label, count, bg, text, border }) => (
                <div key={label} className={`rounded-xl border p-4 text-center ${bg} ${border}`}>
                  <p className={`text-2xl font-bold ${text}`}>{count}</p>
                  <p className={`text-xs font-medium mt-0.5 ${text}`}>{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-1 bg-stone-100 p-1 rounded-lg w-fit flex-wrap">
            {[['', 'All'], ['exercise', 'Exercise'], ['nutrition', 'Nutrition'], ['appointment', 'Appointments'], ['test', 'Lab Tests'], ['general', 'General']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilterCategory(val)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${filterCategory === val ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}
              >{label}</button>
            ))}
          </div>

          {/* Goals list */}
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="card text-center py-16">
              <p className="text-stone-400 text-sm">{goals.length === 0 ? 'No goals set up yet' : 'No goals in this category'}</p>
              {goals.length === 0 && (
                <div className="mt-4 space-y-2 text-xs text-stone-400 max-w-sm mx-auto">
                  <p>Examples: &ldquo;3 workouts per week&rdquo;, &ldquo;150g protein daily&rdquo;, &ldquo;HbA1c every 6 months&rdquo;, &ldquo;Annual physical&rdquo;</p>
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

          {/* Add/Edit Goal Modal */}
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
                          onClick={() => {
                            setForm(f => ({
                              ...f,
                              category: val,
                              metric_key: '',
                              target_value: '',
                              target_unit: '',
                              period: f.period,
                            }));
                            setExTags([]);
                            setExTagInput('');
                          }}
                          className={`py-2 px-1.5 rounded-lg border text-xs font-medium transition-colors text-center leading-tight ${form.category === val ? 'bg-amber-700 text-white border-amber-600' : 'border-stone-300 text-stone-600 hover:border-amber-400'}`}
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
                    <div className="space-y-3 bg-amber-50 rounded-xl p-4 border border-amber-100">
                      <div>
                        <label className="label">Specialty / Type</label>
                        <input className="input" list="specialty-list" value={form.metric_key} onChange={set('metric_key')} placeholder="e.g. Primary Care, Cardiology" />
                        <datalist id="specialty-list">
                          {SPECIALTY_SUGGESTIONS.map(s => <option key={s} value={s} />)}
                        </datalist>
                        <p className="text-xs text-stone-400 mt-1">Leave blank to match any appointment</p>
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
                        <p className="text-xs text-stone-400 mt-1">Matches any test name containing this text</p>
                      </div>
                      <div>
                        <label className="label">How Often</label>
                        <select className="input" value={form.period} onChange={set('period')}>
                          {PERIODS.filter(p => p.value !== 'daily').map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                      </div>
                    </div>
                  )}

                  {form.category === 'exercise' && (
                    <div className="space-y-3 bg-orange-50 rounded-xl p-4 border border-orange-100">
                      <p className="text-xs text-stone-500">Write your goal in the title above (e.g. &ldquo;Run a 5k by Summer&rdquo;). Add optional tags to categorize it.</p>
                      <div>
                        <label className="label">Tags (optional)</label>
                        {exTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {exTags.map((tag, i) => (
                              <span key={i} className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 text-xs font-medium px-2.5 py-1 rounded-full">
                                {tag}
                                <button type="button" onClick={() => setExTags(t => t.filter((_, j) => j !== i))} className="hover:text-orange-900">
                                  <X size={11} />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input
                            className="input flex-1"
                            value={exTagInput}
                            onChange={e => setExTagInput(e.target.value)}
                            onKeyDown={e => {
                              if ((e.key === 'Enter' || e.key === ',') && exTagInput.trim()) {
                                e.preventDefault();
                                const tag = exTagInput.trim().replace(/,$/, '');
                                if (tag && !exTags.includes(tag)) setExTags(t => [...t, tag]);
                                setExTagInput('');
                              }
                            }}
                            placeholder="e.g. Zone 2, Lifting — press Enter to add"
                          />
                          <button
                            type="button"
                            className="btn-secondary text-sm px-3"
                            onClick={() => {
                              const tag = exTagInput.trim();
                              if (tag && !exTags.includes(tag)) setExTags(t => [...t, tag]);
                              setExTagInput('');
                            }}
                          >Add</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {form.category === 'general' && (
                    <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
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
        </>
      )}

      {/* ════════════════ CHALLENGES TAB ════════════════ */}
      {activeTab === 'challenges' && (
        <>
          {challengesLoading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : challenges.length === 0 ? (
            <div className="card text-center py-16">
              <Trophy size={40} className="mx-auto text-indigo-300 mb-3" />
              <p className="text-stone-400 text-sm">No challenges yet</p>
              <div className="mt-3 space-y-1 text-xs text-stone-400 max-w-sm mx-auto">
                <p>Create a multi-category challenge like &ldquo;75 Hard&rdquo; with daily tasks to check off:</p>
                <p>2 workouts, diet rules, water intake, reading goals, and more.</p>
              </div>
              <button className="btn-primary mt-4" onClick={() => { setEditingChallenge(null); setShowChallengeForm(true); }}>
                Create your first challenge
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeChallenges.length > 0 && (
                <div className="space-y-3">
                  {activeChallenges.map(ch => (
                    <ChallengeCard
                      key={ch.id}
                      challenge={ch}
                      onCheckIn={handleCheckIn}
                      onEdit={openEditChallenge}
                      onDelete={handleDeleteChallenge}
                      onToggle={handleToggleChallenge}
                    />
                  ))}
                </div>
              )}
              {inactiveChallenges.length > 0 && (
                <div>
                  <p className="text-xs text-stone-400 uppercase tracking-wider font-medium mb-2">Inactive</p>
                  <div className="space-y-3">
                    {inactiveChallenges.map(ch => (
                      <ChallengeCard
                        key={ch.id}
                        challenge={ch}
                        onCheckIn={handleCheckIn}
                        onEdit={openEditChallenge}
                        onDelete={handleDeleteChallenge}
                        onToggle={handleToggleChallenge}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Challenge Form Modal */}
          {showChallengeForm && (
            <ChallengeFormModal
              initial={editingChallenge}
              onSave={handleSaveChallenge}
              onClose={() => { setShowChallengeForm(false); setEditingChallenge(null); }}
            />
          )}
        </>
      )}
    </div>
  );
}
