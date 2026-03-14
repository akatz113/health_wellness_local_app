import { useEffect, useState, useRef } from 'react';
import {
  Plus, Trash2, X, Save, BookOpen, Eye, Pencil, GripVertical,
  Settings,
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CATEGORIES = [
  { key: 'cardio', label: 'Cardio', color: 'bg-sky-500', lightBg: 'bg-sky-50', lightText: 'text-sky-700', border: 'border-sky-200' },
  { key: 'strength', label: 'Strength', color: 'bg-orange-500', lightBg: 'bg-orange-50', lightText: 'text-orange-700', border: 'border-orange-200' },
  { key: 'flexibility', label: 'Flexibility & Rehab', color: 'bg-green-500', lightBg: 'bg-green-50', lightText: 'text-green-700', border: 'border-green-200' },
];

const ACTIVITY_TEMPLATES = {
  cardio: [
    { name: 'Running', icon: '🏃', defaultMin: 30 },
    { name: 'Cycling', icon: '🚴', defaultMin: 45 },
    { name: 'Swimming', icon: '🏊', defaultMin: 30 },
    { name: 'Walking', icon: '🚶', defaultMin: 30 },
    { name: 'HIIT', icon: '💪', defaultMin: 20 },
    { name: 'Jump Rope', icon: '🤸', defaultMin: 15 },
    { name: 'Rowing', icon: '🚣', defaultMin: 30 },
    { name: 'Stair Climber', icon: '🪜', defaultMin: 20 },
  ],
  strength: [
    { name: 'Upper Body', icon: '💪', defaultMin: 45 },
    { name: 'Lower Body', icon: '🦵', defaultMin: 45 },
    { name: 'Push Day', icon: '🏋️', defaultMin: 60 },
    { name: 'Pull Day', icon: '🏋️', defaultMin: 60 },
    { name: 'Leg Day', icon: '🦵', defaultMin: 60 },
    { name: 'Full Body', icon: '💪', defaultMin: 45 },
    { name: 'Core', icon: '🎯', defaultMin: 20 },
    { name: 'Arms', icon: '💪', defaultMin: 30 },
  ],
  flexibility: [
    { name: 'Yoga', icon: '🧘', defaultMin: 30 },
    { name: 'Stretching', icon: '🤸', defaultMin: 15 },
    { name: 'Pilates', icon: '🧘', defaultMin: 30 },
    { name: 'Foam Rolling', icon: '🧴', defaultMin: 15 },
    { name: 'Physical Therapy', icon: '🏥', defaultMin: 30 },
    { name: 'Mobility Work', icon: '🤸', defaultMin: 20 },
  ],
};

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 75, 90];

function getCategoryConfig(cat) {
  return CATEGORIES.find(c => c.key === cat) || CATEGORIES[0];
}

// ─── Workout Block ───────────────────────────────────────────────────────────

function WorkoutBlock({ block, onRemove, onUpdateDuration, draggable, onDragStart, onDragEnd }) {
  const cat = getCategoryConfig(block.category);
  return (
    <div
      className={`rounded-lg border ${cat.border} ${cat.lightBg} p-2.5 flex items-center gap-2 group ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {draggable && <GripVertical size={14} className="text-stone-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${cat.lightText}`}>{block.activity_type}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <select
            className="text-xs bg-white/80 border border-stone-200 rounded px-1.5 py-0.5"
            value={block.duration_minutes}
            onChange={e => onUpdateDuration(parseInt(e.target.value))}
          >
            {DURATION_OPTIONS.map(d => (
              <option key={d} value={d}>{d} min</option>
            ))}
          </select>
          <span className={`text-xs px-1.5 py-0.5 rounded ${cat.color} text-white`}>{cat.label}</span>
        </div>
      </div>
      {onRemove && (
        <button onClick={onRemove} className="btn-ghost p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ─── Exercise Goals Banner ────────────────────────────────────────────────────

function ExerciseGoalsBanner({ weekGoals, planTotals, onEdit }) {
  const hasAnyGoal = CATEGORIES.some(cat => weekGoals[cat.key] > 0);
  return (
    <div className="card border border-stone-200">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-stone-800">Weekly Exercise Goals</span>
          {!hasAnyGoal && (
            <span className="ml-2 text-xs text-stone-400">— no goals set yet</span>
          )}
        </div>
        <button onClick={onEdit} className="btn-ghost p-1.5 text-stone-400 hover:text-stone-700" title="Edit goals">
          <Settings size={15} />
        </button>
      </div>
      <div className="p-3 space-y-2">
        {CATEGORIES.map(cat => {
          const target = weekGoals[cat.key] || 0;
          const planned = planTotals[cat.key] || 0;
          const pct = target > 0 ? Math.min((planned / target) * 100, 100) : 0;
          const met = target > 0 && planned >= target;
          return (
            <div key={cat.key} className={`rounded-lg border px-3 py-2 ${cat.lightBg} ${cat.border}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${cat.lightText}`}>{cat.label}</span>
                <span className="text-xs text-stone-500">
                  {target > 0
                    ? <>{planned}<span className="text-stone-400"> / {target} min</span>{met && <span className="ml-1 text-green-600 font-bold">✓</span>}</>
                    : <span className="text-stone-400 italic">no goal</span>}
                </span>
              </div>
              <div className="h-1.5 bg-white/80 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${met ? 'bg-green-500' : cat.color}`}
                  style={{ width: target > 0 ? `${pct}%` : '0%' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Goal Editor Modal ────────────────────────────────────────────────────────

function GoalEditorModal({ weekGoals, onSave, onClose }) {
  const [draft, setDraft] = useState({
    cardio: weekGoals.cardio ?? '',
    strength: weekGoals.strength ?? '',
    flexibility: weekGoals.flexibility ?? '',
  });

  const set = (key, val) => setDraft(prev => ({ ...prev, [key]: val }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Weekly Exercise Goals</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5">
          <p className="text-xs text-stone-500">
            Set optional weekly minute targets. Set to 0 for categories you don't want to track.
          </p>
          {CATEGORIES.map(cat => {
            const val = Number(draft[cat.key]) || 0;
            return (
              <div key={cat.key}>
                <div className="flex items-center justify-between mb-2">
                  <label className={`text-sm font-medium ${cat.lightText}`}>{cat.label}</label>
                  <span className={`text-sm font-semibold ${val > 0 ? cat.lightText : 'text-stone-400'}`}>
                    {val > 0 ? `${val} min / week` : 'No goal'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="300"
                  step="15"
                  value={val}
                  onChange={e => set(cat.key, e.target.value)}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: cat.key === 'cardio' ? '#0ea5e9' : cat.key === 'strength' ? '#f97316' : '#22c55e' }}
                />
                <div className="flex justify-between text-xs text-stone-300 mt-1">
                  <span>0</span>
                  <span>1h</span>
                  <span>2h</span>
                  <span>3h</span>
                  <span>4h</span>
                  <span>5h</span>
                </div>
              </div>
            );
          })}
          <div className="flex gap-3 pt-1">
            <button className="btn-primary flex-1" onClick={() => onSave(draft)}>Save Goals</button>
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Exercise() {
  const [activeView, setActiveView] = useState('plan'); // 'plan' | 'saved'
  const [weekGoals, setWeekGoals] = useState({ cardio: null, strength: null, flexibility: null });
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [exerciseGoalsList, setExerciseGoalsList] = useState([]);

  // Planner state - blocks organized by day (0-6)
  const [planBlocks, setPlanBlocks] = useState(() => DAYS.map(() => []));
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  // Saved plans state
  const [savedPlans, setSavedPlans] = useState([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [viewingPlan, setViewingPlan] = useState(null);

  // Drag state
  const dragData = useRef(null);

  // Activity picker
  const [showPicker, setShowPicker] = useState(false);
  const [pickerDay, setPickerDay] = useState(0);
  const [pickerCategory, setPickerCategory] = useState('cardio');

  // Custom tiles (persisted to localStorage)
  const [customTemplates, setCustomTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ex_custom_tiles') || '[]'); }
    catch { return []; }
  });
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customDraft, setCustomDraft] = useState({ name: '', category: 'cardio' });

  // Pending template — click pill → pick which day
  const [pendingTemplate, setPendingTemplate] = useState(null);

  const saveCustomTemplate = () => {
    if (!customDraft.name.trim()) return;
    const updated = [...customTemplates, { name: customDraft.name.trim(), category: customDraft.category }];
    setCustomTemplates(updated);
    localStorage.setItem('ex_custom_tiles', JSON.stringify(updated));
    setCustomDraft({ name: '', category: 'cardio' });
    setShowCustomForm(false);
  };

  const deleteCustomTemplate = (idx) => {
    const updated = customTemplates.filter((_, i) => i !== idx);
    setCustomTemplates(updated);
    localStorage.setItem('ex_custom_tiles', JSON.stringify(updated));
  };

  // Load exercise week goals and goals-tab exercise goals
  useEffect(() => {
    fetch('/api/exercise/goals').then(r => r.json()).then(setWeekGoals);
    fetch('/api/goals').then(r => r.json()).then(data => {
      setExerciseGoalsList(data.filter(g => g.category === 'exercise' && g.active));
    }).catch(() => {});
  }, []);

  const saveWeekGoals = async (draft) => {
    const payload = {
      cardio: Number(draft.cardio) > 0 ? Number(draft.cardio) : null,
      strength: Number(draft.strength) > 0 ? Number(draft.strength) : null,
      flexibility: Number(draft.flexibility) > 0 ? Number(draft.flexibility) : null,
    };
    try {
      const r = await fetch('/api/exercise/goals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`Server error: ${r.status}`);
      const saved = await r.json();
      setWeekGoals(saved);
      setShowGoalEditor(false);
    } catch (err) {
      alert(`Could not save goals: ${err.message}\n\nMake sure the server is running (restart npm run dev if you recently changed server files).`);
    }
  };

  // Load saved plans
  const loadPlans = async () => {
    const data = await fetch('/api/exercise/plans').then(r => r.json());
    setSavedPlans(data);
    setSavedLoading(false);
  };

  useEffect(() => { loadPlans(); }, []);

  // ─── Plan block manipulation ────────────────────────────────────────────

  const addBlock = (dayIdx, activity_type, category, duration_minutes) => {
    setPlanBlocks(prev => {
      const updated = prev.map(d => [...d]);
      updated[dayIdx] = [...updated[dayIdx], {
        _key: Date.now() + Math.random(),
        activity_type,
        category,
        duration_minutes,
        day_of_week: dayIdx,
      }];
      return updated;
    });
  };

  const removeBlock = (dayIdx, blockIdx) => {
    setPlanBlocks(prev => {
      const updated = prev.map(d => [...d]);
      updated[dayIdx] = updated[dayIdx].filter((_, i) => i !== blockIdx);
      return updated;
    });
  };

  const updateBlockDuration = (dayIdx, blockIdx, newDuration) => {
    setPlanBlocks(prev => {
      const updated = prev.map(d => [...d]);
      updated[dayIdx] = updated[dayIdx].map((b, i) =>
        i === blockIdx ? { ...b, duration_minutes: newDuration } : b
      );
      return updated;
    });
  };

  // ─── Drag and drop ──────────────────────────────────────────────────────

  const handleDragStart = (dayIdx, blockIdx) => (e) => {
    dragData.current = { type: 'block', fromDay: dayIdx, blockIdx };
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTemplateDragStart = (name, category, duration) => (e) => {
    dragData.current = { type: 'template', name, category, duration };
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (toDayIdx) => (e) => {
    e.preventDefault();
    if (!dragData.current) return;

    if (dragData.current.type === 'template') {
      const { name, category, duration } = dragData.current;
      addBlock(toDayIdx, name, category, duration);
      dragData.current = null;
      return;
    }

    const { fromDay, blockIdx } = dragData.current;
    if (fromDay === toDayIdx) return;

    setPlanBlocks(prev => {
      const updated = prev.map(d => [...d]);
      const [moved] = updated[fromDay].splice(blockIdx, 1);
      moved.day_of_week = toDayIdx;
      updated[toDayIdx] = [...updated[toDayIdx], moved];
      return updated;
    });
    dragData.current = null;
  };

  const handleDragEnd = () => {
    dragData.current = null;
  };

  // ─── Plan totals ───────────────────────────────────────────────────────

  const allBlocks = planBlocks.flat();
  const planTotals = { cardio: 0, strength: 0, flexibility: 0 };
  allBlocks.forEach(b => {
    if (planTotals[b.category] !== undefined) planTotals[b.category] += b.duration_minutes;
  });
  const totalMinutes = allBlocks.reduce((s, b) => s + b.duration_minutes, 0);

  // ─── Save / Edit plan ──────────────────────────────────────────────────

  const openSaveForm = () => {
    if (!editingPlanId) {
      setPlanName('');
      setPlanDescription('');
    }
    setShowSaveForm(true);
  };

  const handleSavePlan = async () => {
    if (!planName.trim()) return;
    setSavingPlan(true);

    const blocks = planBlocks.flatMap((dayBlocks, dayIdx) =>
      dayBlocks.map((b, sortIdx) => ({
        day_of_week: dayIdx,
        activity_type: b.activity_type,
        category: b.category,
        duration_minutes: b.duration_minutes,
        sort_order: sortIdx,
      }))
    );

    const payload = { name: planName.trim(), description: planDescription.trim() || null, blocks };

    if (editingPlanId) {
      await fetch(`/api/exercise/plans/${editingPlanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/exercise/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    setSavingPlan(false);
    setShowSaveForm(false);
    loadPlans();
  };

  const handleDeletePlan = async (id) => {
    if (!confirm('Delete this workout plan?')) return;
    await fetch(`/api/exercise/plans/${id}`, { method: 'DELETE' });
    loadPlans();
  };

  const handleEditPlan = (plan) => {
    const blocks = DAYS.map(() => []);
    (plan.blocks || []).forEach(b => {
      blocks[b.day_of_week] = [...(blocks[b.day_of_week] || []), {
        ...b,
        _key: Date.now() + Math.random(),
      }];
    });
    setPlanBlocks(blocks);
    setPlanName(plan.name);
    setPlanDescription(plan.description || '');
    setEditingPlanId(plan.id);
    setActiveView('plan');
  };

  const clearPlan = () => {
    setPlanBlocks(DAYS.map(() => []));
    setPlanName('');
    setPlanDescription('');
    setEditingPlanId(null);
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Workout Planner</h1>
          <p className="text-sm text-stone-500 mt-1">Drag and drop to build your weekly schedule</p>
        </div>
        {activeView === 'plan' && allBlocks.length > 0 && (
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={clearPlan}>Clear</button>
            <button className="btn-primary" onClick={openSaveForm}>
              <Save size={16} /> {editingPlanId ? 'Update' : 'Save'} Plan
            </button>
          </div>
        )}
      </div>

      {/* Side-by-side: exercise goals (left) + weekly minutes (right) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
        {/* Left: exercise goals from Goals tab */}
        <div className="card border border-orange-100 bg-orange-50 px-4 py-3 h-full">
          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-2">Custom Exercise Goals</p>
          {exerciseGoalsList.length === 0 ? (
            <p className="text-sm text-orange-300 italic">No exercise goals yet — add one from the Goals tab.</p>
          ) : (
            <div className="space-y-3">
              {exerciseGoalsList.map(g => {
                let tags = [];
                if (g.metric_key && g.metric_key.startsWith('[')) {
                  try { tags = JSON.parse(g.metric_key); } catch {}
                }
                return (
                  <div key={g.id} className="flex items-start gap-2">
                    <span className="text-orange-400 mt-0.5 flex-shrink-0">•</span>
                    <div>
                      <span className="text-sm text-stone-800 font-medium">{g.title}</span>
                      {g.notes && <p className="text-xs text-stone-500 mt-0.5">{g.notes}</p>}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tags.map((tag, i) => (
                            <span key={i} className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: weekly minute goals */}
        <ExerciseGoalsBanner weekGoals={weekGoals} planTotals={planTotals} onEdit={() => setShowGoalEditor(true)} />
      </div>

      {/* View toggle */}
      <div className="flex gap-1 bg-stone-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveView('plan')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
            activeView === 'plan' ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          <Plus size={14} /> Build a Week
        </button>
        <button
          onClick={() => setActiveView('saved')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
            activeView === 'saved' ? 'bg-white shadow text-stone-900' : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          <BookOpen size={14} /> Saved Plans
          {savedPlans.length > 0 && <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">{savedPlans.length}</span>}
        </button>
      </div>

      {/* ════════════ PLAN VIEW ════════════ */}
      {activeView === 'plan' && (
        <>
          {/* Editing indicator */}
          {editingPlanId && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
              <p className="text-sm text-amber-800">Editing: <strong>{planName}</strong></p>
              <button className="btn-secondary text-sm py-1.5" onClick={clearPlan}>Start Fresh</button>
            </div>
          )}

          {/* Total summary */}
          {allBlocks.length > 0 && (
            <div className="flex items-center gap-4 text-sm text-stone-600">
              <span className="font-semibold">{totalMinutes} min total</span>
              <span>|</span>
              <span className="text-sky-600">Cardio: {planTotals.cardio} min</span>
              <span className="text-orange-600">Strength: {planTotals.strength} min</span>
              <span className="text-green-600">Flexibility: {planTotals.flexibility} min</span>
            </div>
          )}

          {/* Weekly grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {DAYS.map((day, dayIdx) => {
              const dayBlocks = planBlocks[dayIdx] || [];
              const dayMinutes = dayBlocks.reduce((s, b) => s + b.duration_minutes, 0);

              return (
                <div
                  key={day}
                  className="card border border-stone-200 min-h-[200px] flex flex-col"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop(dayIdx)}
                >
                  {/* Day header */}
                  <div className="px-3 py-2 border-b bg-stone-50 flex items-center justify-between">
                    <span className="text-sm font-semibold text-stone-700">{DAYS_SHORT[dayIdx]}</span>
                    {dayMinutes > 0 && (
                      <span className="text-xs text-stone-400">{dayMinutes}m</span>
                    )}
                  </div>

                  {/* Blocks */}
                  <div className="p-2 flex-1 space-y-1.5">
                    {dayBlocks.map((block, blockIdx) => (
                      <WorkoutBlock
                        key={block._key || blockIdx}
                        block={block}
                        draggable
                        onDragStart={handleDragStart(dayIdx, blockIdx)}
                        onDragEnd={handleDragEnd}
                        onRemove={() => removeBlock(dayIdx, blockIdx)}
                        onUpdateDuration={(d) => updateBlockDuration(dayIdx, blockIdx, d)}
                      />
                    ))}
                  </div>

                  {/* Add button */}
                  <div className="p-2 pt-0">
                    <button
                      onClick={() => { setPickerDay(dayIdx); setShowPicker(true); }}
                      className="w-full py-1.5 border-2 border-dashed border-stone-200 rounded-lg text-xs text-stone-400 hover:border-amber-300 hover:text-amber-600 transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick-add templates */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-stone-700">Quick Add — drag onto a day, or click to pick a day</p>
              <button
                onClick={() => setShowCustomForm(true)}
                className="btn-ghost text-xs text-stone-500 hover:text-stone-700 flex items-center gap-1 px-2 py-1"
              >
                <Plus size={12} /> Custom tile
              </button>
            </div>
            <div className="space-y-3">
              {CATEGORIES.map(cat => {
                const allTiles = [
                  ...ACTIVITY_TEMPLATES[cat.key].map(t => ({ name: t.name, duration: t.defaultMin, isCustom: false })),
                  ...customTemplates.filter(t => t.category === cat.key).map(t => ({ name: t.name, duration: 30, isCustom: true })),
                ];
                return (
                  <div key={cat.key}>
                    <p className={`text-xs font-semibold ${cat.lightText} uppercase tracking-wide mb-1.5`}>{cat.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {allTiles.map((tile, tileIdx) => (
                        <div key={`${tile.name}-${tileIdx}`} className="relative group/tile">
                          <button
                            draggable
                            onDragStart={handleTemplateDragStart(tile.name, cat.key, tile.duration)}
                            onDragEnd={handleDragEnd}
                            onClick={() => setPendingTemplate({ name: tile.name, category: cat.key, duration: tile.duration })}
                            className={`text-sm ${cat.lightBg} ${cat.lightText} hover:opacity-80 px-3 py-1.5 rounded-full transition-colors font-medium border ${cat.border} cursor-grab active:cursor-grabbing`}
                          >
                            {tile.name}
                          </button>
                          {tile.isCustom && (
                            <button
                              onClick={() => {
                                const idx = customTemplates.findIndex(ct => ct.name === tile.name && ct.category === cat.key);
                                if (idx !== -1) deleteCustomTemplate(idx);
                              }}
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-xs items-center justify-center hidden group-hover/tile:flex"
                              title="Remove"
                            >×</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ════════════ SAVED VIEW ════════════ */}
      {activeView === 'saved' && (
        <div className="space-y-4">
          {savedLoading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : savedPlans.length === 0 ? (
            <div className="card text-center py-16">
              <BookOpen size={40} className="mx-auto text-stone-300 mb-3" />
              <p className="text-stone-400 text-sm">No saved workout plans yet</p>
              <p className="text-xs text-stone-400 mt-1">Build a weekly schedule and save it to see it here</p>
              <button className="btn-primary mt-4" onClick={() => setActiveView('plan')}>Build a plan</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {savedPlans.map(plan => (
                <div key={plan.id} className="card border border-stone-200 hover:border-amber-200 transition-colors">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-stone-900">{plan.name}</h3>
                        {plan.description && <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{plan.description}</p>}
                        <div className="flex items-center gap-3 mt-2 text-xs text-stone-500">
                          <span className="font-medium">{plan.totalMinutes} min/week</span>
                          <span className="text-sky-600">Cardio: {plan.totalsByCategory?.cardio || 0}m</span>
                          <span className="text-orange-600">Strength: {plan.totalsByCategory?.strength || 0}m</span>
                          <span className="text-green-600">Flex: {plan.totalsByCategory?.flexibility || 0}m</span>
                        </div>
                        <p className="text-xs text-stone-400 mt-1">{plan.blocks?.length || 0} workout blocks</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => setViewingPlan(plan)} className="btn-ghost p-1.5 text-amber-600" title="View"><Eye size={14} /></button>
                        <button onClick={() => handleEditPlan(plan)} className="btn-ghost p-1.5" title="Edit"><Pencil size={14} /></button>
                        <button onClick={() => handleDeletePlan(plan.id)} className="btn-ghost p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50" title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════ ACTIVITY PICKER MODAL ════════════ */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Add to {DAYS[pickerDay]}</h2>
              <button onClick={() => setShowPicker(false)} className="btn-ghost p-1.5"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Category tabs */}
              <div className="flex gap-1 bg-stone-100 p-1 rounded-lg">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setPickerCategory(cat.key)}
                    className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      pickerCategory === cat.key ? 'bg-white shadow text-stone-900' : 'text-stone-500'
                    }`}
                  >{cat.label}</button>
                ))}
              </div>

              {/* Activity buttons */}
              <div className="grid grid-cols-2 gap-2">
                {ACTIVITY_TEMPLATES[pickerCategory].map(template => {
                  const cat = getCategoryConfig(pickerCategory);
                  return (
                    <button
                      key={template.name}
                      onClick={() => {
                        addBlock(pickerDay, template.name, pickerCategory, template.defaultMin);
                        setShowPicker(false);
                      }}
                      className={`text-left p-3 rounded-xl border ${cat.border} ${cat.lightBg} hover:opacity-80 transition-colors`}
                    >
                      <p className={`text-sm font-medium ${cat.lightText}`}>{template.icon} {template.name}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{template.defaultMin} min</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ SAVE PLAN MODAL ════════════ */}
      {showSaveForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{editingPlanId ? 'Update Plan' : 'Save Weekly Plan'}</h2>
              <button onClick={() => setShowSaveForm(false)} className="btn-ghost p-1.5"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Plan Name *</label>
                <input className="input" value={planName} onChange={e => setPlanName(e.target.value)} placeholder="e.g. Summer Training, Off-Season Recovery" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} value={planDescription} onChange={e => setPlanDescription(e.target.value)} placeholder="Quick notes about this plan..." />
              </div>
              <div className="bg-stone-50 rounded-lg p-3 text-sm text-stone-600">
                {allBlocks.length} blocks &middot; {totalMinutes} min/week &middot;
                Cardio: {planTotals.cardio}m &middot; Strength: {planTotals.strength}m &middot; Flex: {planTotals.flexibility}m
              </div>
              <div className="flex gap-3">
                <button className="btn-primary flex-1" onClick={handleSavePlan} disabled={savingPlan || !planName.trim()}>
                  {savingPlan ? 'Saving...' : editingPlanId ? 'Update Plan' : 'Save Plan'}
                </button>
                <button className="btn-secondary" onClick={() => setShowSaveForm(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ VIEW PLAN DETAIL MODAL ════════════ */}
      {viewingPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-semibold">{viewingPlan.name}</h2>
                {viewingPlan.description && <p className="text-sm text-stone-500 mt-0.5">{viewingPlan.description}</p>}
              </div>
              <button onClick={() => setViewingPlan(null)} className="btn-ghost p-1.5"><X size={18} /></button>
            </div>
            <div className="p-6">
              {/* Summary */}
              <div className="flex gap-4 text-sm text-stone-600 mb-4">
                <span className="font-semibold">{viewingPlan.totalMinutes} min/week</span>
                <span className="text-sky-600">Cardio: {viewingPlan.totalsByCategory?.cardio || 0}m</span>
                <span className="text-orange-600">Strength: {viewingPlan.totalsByCategory?.strength || 0}m</span>
                <span className="text-green-600">Flex: {viewingPlan.totalsByCategory?.flexibility || 0}m</span>
              </div>

              {/* Weekly view */}
              <div className="grid grid-cols-7 gap-2">
                {DAYS.map((day, dayIdx) => {
                  const dayBlocks = (viewingPlan.blocks || []).filter(b => b.day_of_week === dayIdx);
                  return (
                    <div key={day} className="border border-stone-200 rounded-lg min-h-[120px]">
                      <div className="px-2 py-1.5 border-b bg-stone-50">
                        <span className="text-xs font-semibold text-stone-600">{DAYS_SHORT[dayIdx]}</span>
                      </div>
                      <div className="p-1.5 space-y-1">
                        {dayBlocks.length === 0 ? (
                          <p className="text-xs text-stone-300 text-center py-2">Rest</p>
                        ) : dayBlocks.map((block, i) => {
                          const cat = getCategoryConfig(block.category);
                          return (
                            <div key={i} className={`rounded px-2 py-1 ${cat.lightBg} ${cat.border} border`}>
                              <p className={`text-xs font-medium ${cat.lightText} truncate`}>{block.activity_type}</p>
                              <p className="text-xs text-stone-400">{block.duration_minutes}m</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ PICK-A-DAY MODAL (template click) ════════════ */}
      {pendingTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-base font-semibold">{pendingTemplate.name}</h2>
                <p className="text-xs text-stone-400 mt-0.5">Add to which day?</p>
              </div>
              <button onClick={() => setPendingTemplate(null)} className="btn-ghost p-1.5"><X size={16} /></button>
            </div>
            <div className="p-4 grid grid-cols-7 gap-1.5">
              {DAYS.map((day, dayIdx) => (
                <button
                  key={day}
                  onClick={() => {
                    addBlock(dayIdx, pendingTemplate.name, pendingTemplate.category, pendingTemplate.duration);
                    setPendingTemplate(null);
                  }}
                  className="flex flex-col items-center py-2 px-1 rounded-lg bg-stone-50 hover:bg-amber-50 hover:text-amber-800 transition-colors text-xs font-medium text-stone-600"
                >
                  {DAYS_SHORT[dayIdx]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════ CUSTOM TILE FORM MODAL ════════════ */}
      {showCustomForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-base font-semibold">Add Custom Tile</h2>
              <button onClick={() => setShowCustomForm(false)} className="btn-ghost p-1.5"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Activity name</label>
                <input
                  className="input"
                  placeholder="e.g. Rock Climbing"
                  value={customDraft.name}
                  onChange={e => setCustomDraft(prev => ({ ...prev, name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && saveCustomTemplate()}
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Category</label>
                <select
                  className="input"
                  value={customDraft.category}
                  onChange={e => setCustomDraft(prev => ({ ...prev, category: e.target.value }))}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.key} value={cat.key}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button className="btn-primary flex-1" onClick={saveCustomTemplate} disabled={!customDraft.name.trim()}>
                  Add Tile
                </button>
                <button className="btn-secondary" onClick={() => setShowCustomForm(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ GOAL EDITOR MODAL ════════════ */}
      {showGoalEditor && (
        <GoalEditorModal
          weekGoals={weekGoals}
          onSave={saveWeekGoals}
          onClose={() => setShowGoalEditor(false)}
        />
      )}
    </div>
  );
}
