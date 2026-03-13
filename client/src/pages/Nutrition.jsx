import { useEffect, useState, useRef, useCallback } from 'react';
import { Search, Plus, Trash2, X, ChevronDown, ChevronUp, Save, BookOpen, Eye, Pencil } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const MACRO_COLORS = {
  Protein: '#3b82f6',
  Carbs: '#10b981',
  Fat: '#f59e0b',
};

// USDA nutrient IDs for key nutrients
const KEY_NUTRIENT_IDS = {
  1008: 'calories',
  1003: 'protein',
  1005: 'carbs',
  1004: 'fat',
  1079: 'fiber',
  2000: 'sugar',
  1093: 'sodium',
  1087: 'calcium',
  1089: 'iron',
  1162: 'vitamin_c',
  1114: 'vitamin_d',
  1092: 'potassium',
  1253: 'cholesterol',
  1258: 'saturated_fat',
  // Extended nutrients
  1292: 'mono_fat',       // Monounsaturated fat
  1293: 'poly_fat',       // Polyunsaturated fat
  1257: 'trans_fat',      // Trans fat
  1235: 'added_sugar',    // Added sugars
  1106: 'vitamin_a',
  1109: 'vitamin_e',
  1185: 'vitamin_k',
  1165: 'vitamin_b1',     // Thiamin
  1166: 'vitamin_b2',     // Riboflavin
  1167: 'vitamin_b3',     // Niacin
  1175: 'vitamin_b6',
  1178: 'vitamin_b12',
  1177: 'folate',
  1090: 'magnesium',
  1091: 'phosphorus',
  1095: 'zinc',
  1098: 'copper',
  1101: 'manganese',
  1103: 'selenium',
};

function extractNutrients(foodNutrients) {
  const result = {};
  for (const key of Object.values(KEY_NUTRIENT_IDS)) result[key] = 0;

  for (const n of foodNutrients) {
    const nutrientId = n.nutrientId || n.nutrient?.id;
    const amount = n.value || n.amount || 0;
    const field = KEY_NUTRIENT_IDS[nutrientId];
    if (field) result[field] = amount;
  }

  return result;
}

function scaleNutrients(nutrients, scale) {
  const result = {};
  for (const [k, v] of Object.entries(nutrients)) {
    result[k] = +(v * scale).toFixed(2);
  }
  return result;
}

function NutrientBar({ label, value, unit, max, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{value.toFixed(1)} {unit}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ─── Meal Nutrient Detail Panel ──────────────────────────────────────────────

function MealNutrientDetail({ totals }) {
  const [expanded, setExpanded] = useState(false);

  const macroData = [
    { name: 'Protein', value: +totals.protein.toFixed(1) },
    { name: 'Carbs', value: +totals.carbs.toFixed(1) },
    { name: 'Fat', value: +totals.fat.toFixed(1) },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-4">
      {/* Top-level macros */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Calories', value: totals.calories?.toFixed(0) || '0', unit: 'kcal', color: 'text-orange-600' },
          { label: 'Protein', value: totals.protein?.toFixed(1) || '0', unit: 'g', color: 'text-blue-600' },
          { label: 'Carbs', value: totals.carbs?.toFixed(1) || '0', unit: 'g', color: 'text-green-600' },
          { label: 'Fat', value: totals.fat?.toFixed(1) || '0', unit: 'g', color: 'text-yellow-600' },
        ].map(({ label, value, unit, color }) => (
          <div key={label} className="text-center">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-400">{unit}</p>
          </div>
        ))}
      </div>

      {/* Pie chart */}
      {macroData.length > 0 && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={macroData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                {macroData.map(entry => (
                  <Cell key={entry.name} fill={MACRO_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `${v}g`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Expandable detail */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-xs text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1"
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {expanded ? 'Hide' : 'Show'} detailed breakdown
      </button>

      {expanded && (
        <div className="space-y-4">
          {/* Fat breakdown */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Fat Breakdown</p>
            <div className="grid grid-cols-1 gap-2">
              <NutrientBar label="Saturated Fat" value={totals.saturated_fat || 0} unit="g" max={20} color="#ef4444" />
              <NutrientBar label="Monounsaturated Fat" value={totals.mono_fat || 0} unit="g" max={20} color="#f59e0b" />
              <NutrientBar label="Polyunsaturated Fat" value={totals.poly_fat || 0} unit="g" max={20} color="#10b981" />
              <NutrientBar label="Trans Fat" value={totals.trans_fat || 0} unit="g" max={2} color="#dc2626" />
            </div>
          </div>

          {/* Sugars */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Carb Detail</p>
            <div className="grid grid-cols-1 gap-2">
              <NutrientBar label="Fiber" value={totals.fiber || 0} unit="g" max={28} color="#10b981" />
              <NutrientBar label="Total Sugar" value={totals.sugar || 0} unit="g" max={50} color="#f59e0b" />
              <NutrientBar label="Added Sugar" value={totals.added_sugar || 0} unit="g" max={25} color="#ef4444" />
            </div>
          </div>

          {/* Minerals */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Minerals</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <NutrientBar label="Sodium" value={totals.sodium || 0} unit="mg" max={2300} color="#ef4444" />
              <NutrientBar label="Potassium" value={totals.potassium || 0} unit="mg" max={3500} color="#8b5cf6" />
              <NutrientBar label="Calcium" value={totals.calcium || 0} unit="mg" max={1000} color="#06b6d4" />
              <NutrientBar label="Iron" value={totals.iron || 0} unit="mg" max={18} color="#dc2626" />
              <NutrientBar label="Magnesium" value={totals.magnesium || 0} unit="mg" max={400} color="#059669" />
              <NutrientBar label="Phosphorus" value={totals.phosphorus || 0} unit="mg" max={1000} color="#7c3aed" />
              <NutrientBar label="Zinc" value={totals.zinc || 0} unit="mg" max={11} color="#6366f1" />
              <NutrientBar label="Selenium" value={totals.selenium || 0} unit="mcg" max={55} color="#0891b2" />
            </div>
          </div>

          {/* Vitamins */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Vitamins</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <NutrientBar label="Vitamin A" value={totals.vitamin_a || 0} unit="mcg" max={900} color="#f97316" />
              <NutrientBar label="Vitamin C" value={totals.vitamin_c || 0} unit="mg" max={90} color="#f97316" />
              <NutrientBar label="Vitamin D" value={totals.vitamin_d || 0} unit="mcg" max={20} color="#eab308" />
              <NutrientBar label="Vitamin E" value={totals.vitamin_e || 0} unit="mg" max={15} color="#22c55e" />
              <NutrientBar label="Vitamin K" value={totals.vitamin_k || 0} unit="mcg" max={120} color="#14b8a6" />
              <NutrientBar label="Vitamin B6" value={totals.vitamin_b6 || 0} unit="mg" max={1.7} color="#8b5cf6" />
              <NutrientBar label="Vitamin B12" value={totals.vitamin_b12 || 0} unit="mcg" max={2.4} color="#ec4899" />
              <NutrientBar label="Folate" value={totals.folate || 0} unit="mcg" max={400} color="#06b6d4" />
            </div>
          </div>

          <p className="text-xs text-gray-400">Reference values based on general daily recommendations (2000 kcal diet)</p>
        </div>
      )}
    </div>
  );
}

// ─── Saved Meal Card ─────────────────────────────────────────────────────────

function SavedMealCard({ meal, onView, onEdit, onDelete }) {
  return (
    <div className="card border border-gray-200 hover:border-blue-200 transition-colors">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900">{meal.name}</h3>
            {meal.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{meal.description}</p>}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span className="font-medium text-orange-600">{meal.totals.calories.toFixed(0)} kcal</span>
              <span>P: {meal.totals.protein.toFixed(0)}g</span>
              <span>C: {meal.totals.carbs.toFixed(0)}g</span>
              <span>F: {meal.totals.fat.toFixed(0)}g</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{meal.items.length} item{meal.items.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => onView(meal)} className="btn-ghost p-1.5 text-blue-500" title="View details"><Eye size={14} /></button>
            <button onClick={() => onEdit(meal)} className="btn-ghost p-1.5" title="Edit"><Pencil size={14} /></button>
            <button onClick={() => onDelete(meal.id)} className="btn-ghost p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50" title="Delete"><Trash2 size={14} /></button>
          </div>
        </div>
        {meal.tags && meal.tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {meal.tags.map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Nutrition() {
  const [activeView, setActiveView] = useState('build'); // 'build' | 'saved'

  // Meal builder state
  const [builderItems, setBuilderItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedFood, setSelectedFood] = useState(null);
  const [foodDetail, setFoodDetail] = useState(null);
  const [servingSize, setServingSize] = useState(1);
  const [showSearch, setShowSearch] = useState(false);
  const searchTimer = useRef(null);

  // Save meal state
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [mealName, setMealName] = useState('');
  const [mealDescription, setMealDescription] = useState('');
  const [mealTags, setMealTags] = useState('');
  const [savingMeal, setSavingMeal] = useState(false);
  const [editingMealId, setEditingMealId] = useState(null);

  // Saved meals state
  const [savedMeals, setSavedMeals] = useState([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [savedSearchQuery, setSavedSearchQuery] = useState('');
  const savedSearchTimer = useRef(null);

  // View meal detail
  const [viewingMeal, setViewingMeal] = useState(null);

  // Load saved meals
  const loadSavedMeals = async (q = '') => {
    const url = q ? `/api/nutrition/meals?q=${encodeURIComponent(q)}` : '/api/nutrition/meals';
    const data = await fetch(url).then(r => r.json());
    setSavedMeals(data);
    setSavedLoading(false);
  };

  useEffect(() => { loadSavedMeals(); }, []);

  // ─── USDA Search ────────────────────────────────────────────────────────

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    setSearchError('');
    try {
      const res = await fetch(`/api/nutrition/search?q=${encodeURIComponent(q)}&pageSize=10`);
      const data = await res.json();
      if (data.error) { setSearchError(data.error); setSearchResults([]); }
      else setSearchResults(data.foods || []);
    } catch {
      setSearchError('Failed to search. Is the server running?');
    }
    setSearching(false);
  }, []);

  const handleSearchInput = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(q), 400);
  };

  const selectFood = async (food) => {
    setSelectedFood(food);
    setSearchResults([]);
    setSearchQuery(food.description);
    try {
      const res = await fetch(`/api/nutrition/food/${food.fdcId}`);
      const detail = await res.json();
      setFoodDetail(detail);
    } catch {
      setFoodDetail(null);
    }
  };

  const addToBuilder = () => {
    if (!selectedFood) return;

    const nutrients = foodDetail
      ? extractNutrients(foodDetail.foodNutrients || [])
      : extractNutrients(selectedFood.foodNutrients || []);

    const scaled = scaleNutrients(nutrients, servingSize);

    const item = {
      _key: Date.now() + Math.random(),
      food_name: selectedFood.description,
      fdc_id: String(selectedFood.fdcId),
      serving_size: servingSize,
      serving_unit: '100g equivalent',
      serving_description: selectedFood.servingSizeUnit
        ? `${servingSize * (selectedFood.servingSize || 100)}${selectedFood.servingSizeUnit}`
        : `${servingSize} serving(s)`,
      ...scaled,
      all_nutrients: foodDetail?.foodNutrients || selectedFood.foodNutrients || [],
    };

    setBuilderItems(prev => [...prev, item]);
    setSelectedFood(null);
    setFoodDetail(null);
    setSearchQuery('');
    setServingSize(1);
    setShowSearch(false);
  };

  const removeFromBuilder = (idx) => {
    setBuilderItems(prev => prev.filter((_, i) => i !== idx));
  };

  // ─── Meal totals ────────────────────────────────────────────────────────

  const builderTotals = builderItems.reduce((acc, item) => {
    for (const key of Object.values(KEY_NUTRIENT_IDS)) {
      acc[key] = (acc[key] || 0) + (item[key] || 0);
    }
    return acc;
  }, {});

  // ─── Save / Edit meal ──────────────────────────────────────────────────

  const openSaveForm = () => {
    setMealName('');
    setMealDescription('');
    setMealTags('');
    setEditingMealId(null);
    setShowSaveForm(true);
  };

  const handleSaveMeal = async () => {
    if (!mealName.trim()) return;
    setSavingMeal(true);

    const payload = {
      name: mealName.trim(),
      description: mealDescription.trim() || null,
      tags: mealTags.split(',').map(t => t.trim()).filter(Boolean),
      items: builderItems.map(({ _key, ...rest }) => rest),
    };

    if (editingMealId) {
      await fetch(`/api/nutrition/meals/${editingMealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch('/api/nutrition/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    setSavingMeal(false);
    setShowSaveForm(false);
    loadSavedMeals(savedSearchQuery);
  };

  const handleDeleteMeal = async (id) => {
    if (!confirm('Delete this saved meal?')) return;
    await fetch(`/api/nutrition/meals/${id}`, { method: 'DELETE' });
    loadSavedMeals(savedSearchQuery);
  };

  const handleEditMeal = (meal) => {
    setBuilderItems(meal.items.map(i => ({ ...i, _key: Date.now() + Math.random() })));
    setMealName(meal.name);
    setMealDescription(meal.description || '');
    setMealTags((meal.tags || []).join(', '));
    setEditingMealId(meal.id);
    setActiveView('build');
  };

  const handleSavedSearch = (e) => {
    const q = e.target.value;
    setSavedSearchQuery(q);
    clearTimeout(savedSearchTimer.current);
    savedSearchTimer.current = setTimeout(() => loadSavedMeals(q), 300);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meal Builder</h1>
          <p className="text-sm text-gray-500 mt-1">Build meals, experiment with macros, and save your favorites</p>
        </div>
        {activeView === 'build' && builderItems.length > 0 && (
          <button className="btn-primary" onClick={openSaveForm}>
            <Save size={16} /> Save Meal
          </button>
        )}
        {activeView === 'build' && builderItems.length === 0 && (
          <button className="btn-primary" onClick={() => setShowSearch(true)}>
            <Plus size={16} /> Add Food
          </button>
        )}
      </div>

      {/* View toggle */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveView('build')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
            activeView === 'build' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Plus size={14} /> Build a Meal
          {builderItems.length > 0 && <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">{builderItems.length}</span>}
        </button>
        <button
          onClick={() => setActiveView('saved')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
            activeView === 'saved' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <BookOpen size={14} /> Saved Meals
          {savedMeals.length > 0 && <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">{savedMeals.length}</span>}
        </button>
      </div>

      {/* ════════════ BUILD VIEW ════════════ */}
      {activeView === 'build' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: food list */}
          <div className="lg:col-span-2 space-y-4">
            {/* Builder items */}
            {builderItems.length > 0 ? (
              <div className="card overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Meal Items</h3>
                  <button className="btn-ghost text-xs gap-1 py-1" onClick={() => setShowSearch(true)}>
                    <Plus size={13} /> Add more
                  </button>
                </div>
                <div className="divide-y divide-gray-50">
                  {builderItems.map((item, idx) => (
                    <div key={item._key} className="px-5 py-3 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.food_name}</p>
                        <p className="text-xs text-gray-400">{item.serving_description || `${item.serving_size} serving`}</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
                        <span className="font-medium text-orange-600">{item.calories?.toFixed(0)} kcal</span>
                        <span className="hidden sm:block">P: {item.protein?.toFixed(1)}g</span>
                        <span className="hidden sm:block">C: {item.carbs?.toFixed(1)}g</span>
                        <span className="hidden sm:block">F: {item.fat?.toFixed(1)}g</span>
                        <button onClick={() => removeFromBuilder(idx)} className="btn-ghost p-1 text-red-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card text-center py-16">
                <Search size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm">Start building a meal by adding foods</p>
                <p className="text-xs text-gray-400 mt-1">Search the USDA database of 1M+ foods</p>
                <button className="btn-primary mt-4" onClick={() => setShowSearch(true)}>Search foods</button>
              </div>
            )}

            {/* Editing indicator */}
            {editingMealId && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                <p className="text-sm text-blue-700">Editing: <strong>{mealName}</strong></p>
                <div className="flex gap-2">
                  <button className="btn-primary text-sm py-1.5" onClick={() => setShowSaveForm(true)}>
                    <Save size={14} /> Save Changes
                  </button>
                  <button className="btn-secondary text-sm py-1.5" onClick={() => { setEditingMealId(null); setBuilderItems([]); setMealName(''); }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: nutrient panel */}
          <div className="space-y-4">
            {builderItems.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Meal Nutrition</h3>
                <MealNutrientDetail totals={builderTotals} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════ SAVED VIEW ════════════ */}
      {activeView === 'saved' && (
        <div className="space-y-4">
          {/* Search saved meals */}
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9"
              value={savedSearchQuery}
              onChange={handleSavedSearch}
              placeholder="Search saved meals..."
            />
          </div>

          {savedLoading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : savedMeals.length === 0 ? (
            <div className="card text-center py-16">
              <BookOpen size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 text-sm">{savedSearchQuery ? 'No meals match your search' : 'No saved meals yet'}</p>
              <p className="text-xs text-gray-400 mt-1">Build a meal and save it to see it here</p>
              <button className="btn-primary mt-4" onClick={() => setActiveView('build')}>Build a meal</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {savedMeals.map(meal => (
                <SavedMealCard
                  key={meal.id}
                  meal={meal}
                  onView={setViewingMeal}
                  onEdit={handleEditMeal}
                  onDelete={handleDeleteMeal}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════ SEARCH MODAL ════════════ */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Add Food to Meal</h2>
              <button onClick={() => { setShowSearch(false); setSelectedFood(null); setSearchQuery(''); setSearchResults([]); }} className="btn-ghost p-1.5">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Search input */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="input pl-9"
                  value={searchQuery}
                  onChange={handleSearchInput}
                  placeholder="Search USDA food database..."
                  autoFocus
                />
                {searching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {searchError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {searchError}
                </div>
              )}

              {/* Results */}
              {searchResults.length > 0 && !selectedFood && (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {searchResults.map(food => (
                    <button
                      key={food.fdcId}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors"
                      onClick={() => selectFood(food)}
                    >
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{food.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{food.brandOwner || food.dataType || 'USDA'}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected food */}
              {selectedFood && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{selectedFood.description}</p>
                      {selectedFood.brandOwner && <p className="text-xs text-gray-500 mt-0.5">{selectedFood.brandOwner}</p>}
                    </div>
                    <button onClick={() => { setSelectedFood(null); setFoodDetail(null); }} className="text-gray-400 hover:text-gray-600">
                      <X size={16} />
                    </button>
                  </div>

                  <div>
                    <label className="label">Servings</label>
                    <input
                      type="number" min="0.25" step="0.25" className="input w-32"
                      value={servingSize} onChange={e => setServingSize(+e.target.value)}
                    />
                  </div>

                  {foodDetail && (() => {
                    const n = extractNutrients(foodDetail.foodNutrients || []);
                    return (
                      <div className="grid grid-cols-4 gap-2 text-center bg-white rounded-lg p-3">
                        {[
                          { label: 'Cal', value: (n.calories * servingSize).toFixed(0), unit: '' },
                          { label: 'Protein', value: (n.protein * servingSize).toFixed(1), unit: 'g' },
                          { label: 'Carbs', value: (n.carbs * servingSize).toFixed(1), unit: 'g' },
                          { label: 'Fat', value: (n.fat * servingSize).toFixed(1), unit: 'g' },
                        ].map(({ label, value, unit }) => (
                          <div key={label}>
                            <p className="text-xs text-gray-400">{label}</p>
                            <p className="text-sm font-bold text-gray-900">{value}{unit}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  <button className="btn-primary w-full" onClick={addToBuilder}>
                    Add to Meal
                  </button>
                </div>
              )}

              {!selectedFood && !searchQuery && (
                <div className="text-center py-6 text-gray-400">
                  <Search size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Search the USDA database of 1M+ foods</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════ SAVE MEAL MODAL ════════════ */}
      {showSaveForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{editingMealId ? 'Update Meal' : 'Save Meal'}</h2>
              <button onClick={() => setShowSaveForm(false)} className="btn-ghost p-1.5"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Meal Name *</label>
                <input className="input" value={mealName} onChange={e => setMealName(e.target.value)} placeholder="e.g. Chicken & Rice Bowl" required />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} value={mealDescription} onChange={e => setMealDescription(e.target.value)} placeholder="Quick description..." />
              </div>
              <div>
                <label className="label">Tags (comma-separated)</label>
                <input className="input" value={mealTags} onChange={e => setMealTags(e.target.value)} placeholder="e.g. high-protein, meal-prep, quick" />
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                {builderItems.length} items &middot; {builderTotals.calories?.toFixed(0) || 0} kcal &middot; P: {builderTotals.protein?.toFixed(0) || 0}g &middot; C: {builderTotals.carbs?.toFixed(0) || 0}g &middot; F: {builderTotals.fat?.toFixed(0) || 0}g
              </div>
              <div className="flex gap-3">
                <button className="btn-primary flex-1" onClick={handleSaveMeal} disabled={savingMeal || !mealName.trim()}>
                  {savingMeal ? 'Saving...' : editingMealId ? 'Update Meal' : 'Save Meal'}
                </button>
                <button className="btn-secondary" onClick={() => setShowSaveForm(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ VIEW MEAL DETAIL MODAL ════════════ */}
      {viewingMeal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-semibold">{viewingMeal.name}</h2>
                {viewingMeal.description && <p className="text-sm text-gray-500 mt-0.5">{viewingMeal.description}</p>}
              </div>
              <button onClick={() => setViewingMeal(null)} className="btn-ghost p-1.5"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-6">
              {/* Items list */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Ingredients</h3>
                <div className="border border-gray-200 rounded-lg divide-y">
                  {viewingMeal.items.map((item, idx) => (
                    <div key={idx} className="px-4 py-2.5 flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-gray-900">{item.food_name}</span>
                        <span className="text-xs text-gray-400 ml-2">{item.serving_description || `${item.serving_size} serving`}</span>
                      </div>
                      <div className="flex gap-3 text-xs text-gray-500">
                        <span>{item.calories?.toFixed(0)} kcal</span>
                        <span>P: {item.protein?.toFixed(1)}g</span>
                        <span>C: {item.carbs?.toFixed(1)}g</span>
                        <span>F: {item.fat?.toFixed(1)}g</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Full nutrition breakdown */}
              <MealNutrientDetail totals={viewingMeal.totals} />

              {viewingMeal.tags && viewingMeal.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {viewingMeal.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
