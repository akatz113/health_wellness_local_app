import { useEffect, useState, useRef, useCallback } from 'react';
import { format, subDays, addDays, parseISO } from 'date-fns';
import { Search, Plus, Trash2, ChevronLeft, ChevronRight, X, Info } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

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
};

function extractNutrients(foodNutrients) {
  const result = {
    calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0,
    sodium: 0, calcium: 0, iron: 0, vitamin_c: 0, vitamin_d: 0,
    potassium: 0, cholesterol: 0, saturated_fat: 0,
  };

  for (const n of foodNutrients) {
    const nutrientId = n.nutrientId || n.nutrient?.id;
    const amount = n.value || n.amount || 0;
    const field = KEY_NUTRIENT_IDS[nutrientId];
    if (field) result[field] = amount;
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

export default function Nutrition() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedFood, setSelectedFood] = useState(null);
  const [foodDetail, setFoodDetail] = useState(null);
  const [servingSize, setServingSize] = useState(1);
  const [mealType, setMealType] = useState('breakfast');
  const [addingFood, setAddingFood] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchTimer = useRef(null);

  const loadLog = () => {
    setLoading(true);
    fetch(`/api/nutrition/log?date=${date}`).then(r => r.json()).then(data => {
      setLog(data);
      setLoading(false);
    });
  };

  useEffect(() => { loadLog(); }, [date]);

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

  const addToLog = async () => {
    if (!selectedFood) return;
    setAddingFood(true);

    const nutrients = foodDetail
      ? extractNutrients(foodDetail.foodNutrients || [])
      : extractNutrients(selectedFood.foodNutrients || []);

    // Scale by serving size
    const scale = servingSize;
    const payload = {
      food_name: selectedFood.description,
      fdc_id: String(selectedFood.fdcId),
      serving_size: servingSize,
      serving_unit: '100g equivalent',
      serving_description: selectedFood.servingSizeUnit
        ? `${servingSize * (selectedFood.servingSize || 100)}${selectedFood.servingSizeUnit}`
        : `${servingSize} serving(s)`,
      calories: +(nutrients.calories * scale).toFixed(2),
      protein: +(nutrients.protein * scale).toFixed(2),
      carbs: +(nutrients.carbs * scale).toFixed(2),
      fat: +(nutrients.fat * scale).toFixed(2),
      fiber: +(nutrients.fiber * scale).toFixed(2),
      sugar: +(nutrients.sugar * scale).toFixed(2),
      sodium: +(nutrients.sodium * scale).toFixed(2),
      calcium: +(nutrients.calcium * scale).toFixed(2),
      iron: +(nutrients.iron * scale).toFixed(2),
      vitamin_c: +(nutrients.vitamin_c * scale).toFixed(2),
      vitamin_d: +(nutrients.vitamin_d * scale).toFixed(2),
      potassium: +(nutrients.potassium * scale).toFixed(2),
      cholesterol: +(nutrients.cholesterol * scale).toFixed(2),
      saturated_fat: +(nutrients.saturated_fat * scale).toFixed(2),
      all_nutrients: foodDetail?.foodNutrients || [],
      meal_type: mealType,
      log_date: date,
    };

    await fetch('/api/nutrition/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    setAddingFood(false);
    setSelectedFood(null);
    setFoodDetail(null);
    setSearchQuery('');
    setServingSize(1);
    setShowSearch(false);
    loadLog();
  };

  const removeFromLog = async (id) => {
    await fetch(`/api/nutrition/log/${id}`, { method: 'DELETE' });
    loadLog();
  };

  // Totals
  const totals = log.reduce((acc, item) => ({
    calories: acc.calories + item.calories,
    protein: acc.protein + item.protein,
    carbs: acc.carbs + item.carbs,
    fat: acc.fat + item.fat,
    fiber: acc.fiber + item.fiber,
    sugar: acc.sugar + item.sugar,
    sodium: acc.sodium + item.sodium,
    potassium: acc.potassium + item.potassium,
    calcium: acc.calcium + item.calcium,
    iron: acc.iron + item.iron,
    vitamin_c: acc.vitamin_c + item.vitamin_c,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0, potassium: 0, calcium: 0, iron: 0, vitamin_c: 0 });

  const macroData = [
    { name: 'Protein', value: +totals.protein.toFixed(1) },
    { name: 'Carbs', value: +totals.carbs.toFixed(1) },
    { name: 'Fat', value: +totals.fat.toFixed(1) },
  ].filter(d => d.value > 0);

  const mealGroups = MEAL_TYPES.reduce((acc, m) => {
    acc[m] = log.filter(i => i.meal_type === m);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nutrition Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">Powered by USDA FoodData Central</p>
        </div>
        <button className="btn-primary" onClick={() => setShowSearch(true)}>
          <Plus size={16} /> Add Food
        </button>
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-3">
        <button className="btn-secondary p-2" onClick={() => setDate(format(subDays(parseISO(date), 1), 'yyyy-MM-dd'))}>
          <ChevronLeft size={18} />
        </button>
        <input type="date" className="input w-auto" value={date} onChange={e => setDate(e.target.value)} />
        <button className="btn-secondary p-2" onClick={() => setDate(format(addDays(parseISO(date), 1), 'yyyy-MM-dd'))}>
          <ChevronRight size={18} />
        </button>
        <button className="btn-ghost text-sm" onClick={() => setDate(format(new Date(), 'yyyy-MM-dd'))}>Today</button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Calories', value: totals.calories.toFixed(0), unit: 'kcal', color: 'text-orange-600' },
          { label: 'Protein', value: totals.protein.toFixed(1), unit: 'g', color: 'text-blue-600' },
          { label: 'Carbs', value: totals.carbs.toFixed(1), unit: 'g', color: 'text-green-600' },
          { label: 'Fat', value: totals.fat.toFixed(1), unit: 'g', color: 'text-yellow-600' },
        ].map(({ label, value, unit, color }) => (
          <div key={label} className="card p-4 text-center">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            <p className="text-xs text-gray-400">{unit}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Macro chart */}
        {macroData.length > 0 && (
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Macros</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={macroData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
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

        {/* Micronutrients */}
        <div className={`card p-6 ${macroData.length === 0 ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
          <h2 className="font-semibold text-gray-900 mb-4">Micronutrients</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <NutrientBar label="Fiber" value={totals.fiber} unit="g" max={28} color="#10b981" />
            <NutrientBar label="Sugar" value={totals.sugar} unit="g" max={50} color="#f59e0b" />
            <NutrientBar label="Sodium" value={totals.sodium} unit="mg" max={2300} color="#ef4444" />
            <NutrientBar label="Potassium" value={totals.potassium} unit="mg" max={3500} color="#8b5cf6" />
            <NutrientBar label="Calcium" value={totals.calcium} unit="mg" max={1000} color="#06b6d4" />
            <NutrientBar label="Iron" value={totals.iron} unit="mg" max={18} color="#dc2626" />
            <NutrientBar label="Vitamin C" value={totals.vitamin_c} unit="mg" max={90} color="#f97316" />
          </div>
          <p className="text-xs text-gray-400 mt-4">Reference values based on general daily recommendations</p>
        </div>
      </div>

      {/* Meal log */}
      <div className="space-y-4">
        {MEAL_TYPES.map(meal => {
          const items = mealGroups[meal];
          if (items.length === 0 && !showSearch) return null;
          const mealCalories = items.reduce((s, i) => s + i.calories, 0);
          return (
            <div key={meal} className="card overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 capitalize">{meal}</h3>
                <span className="text-sm text-gray-500">{mealCalories.toFixed(0)} kcal</span>
              </div>
              {items.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Nothing logged yet</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {items.map(item => (
                    <div key={item.id} className="px-5 py-3 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.food_name}</p>
                        <p className="text-xs text-gray-400">{item.serving_description || `${item.serving_size} serving`}</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
                        <span>{item.calories.toFixed(0)} kcal</span>
                        <span className="hidden sm:block">P: {item.protein.toFixed(1)}g</span>
                        <span className="hidden sm:block">C: {item.carbs.toFixed(1)}g</span>
                        <span className="hidden sm:block">F: {item.fat.toFixed(1)}g</span>
                        <button onClick={() => removeFromLog(item.id)} className="btn-ghost p-1 text-red-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {log.length === 0 && !loading && (
          <div className="card text-center py-12">
            <p className="text-gray-400 text-sm">Nothing logged for {format(parseISO(date), 'MMMM d, yyyy')}</p>
            <button className="btn-primary mt-4" onClick={() => setShowSearch(true)}>Add your first food</button>
          </div>
        )}
      </div>

      {/* Search / Add Food Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">Add Food</h2>
              <button onClick={() => { setShowSearch(false); setSelectedFood(null); setSearchQuery(''); setSearchResults([]); }} className="btn-ghost p-1.5">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Search */}
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
                  {searchError.includes('DEMO_KEY') || searchError.includes('rate') ?
                    ' — Add a free USDA API key in server/.env to increase limits.' : ''}
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

              {/* Selected food details */}
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

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Meal</label>
                      <select className="input" value={mealType} onChange={e => setMealType(e.target.value)}>
                        {MEAL_TYPES.map(m => <option key={m} value={m} className="capitalize">{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Servings</label>
                      <input
                        type="number" min="0.25" step="0.25" className="input"
                        value={servingSize} onChange={e => setServingSize(+e.target.value)}
                      />
                    </div>
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

                  <button className="btn-primary w-full" onClick={addToLog} disabled={addingFood}>
                    {addingFood ? 'Adding...' : 'Add to Log'}
                  </button>
                </div>
              )}

              {!selectedFood && !searchQuery && (
                <div className="text-center py-6 text-gray-400">
                  <Search size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Search the USDA database of 1M+ foods</p>
                  <p className="text-xs mt-1">Using DEMO_KEY — get a free API key for higher rate limits</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
