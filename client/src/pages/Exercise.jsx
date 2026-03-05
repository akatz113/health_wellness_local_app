import { useEffect, useState, useRef } from 'react';
import { format, subDays, parseISO } from 'date-fns';
import {
  MapPin, Search, Wind, Droplets, Thermometer,
  Plus, Trash2, Pencil, X, Flame, Clock, TrendingUp, Dumbbell,
} from 'lucide-react';

const ACTIVITY_TYPES = [
  'Running', 'Walking', 'Cycling', 'Swimming', 'Hiking',
  'Gym / Weight Training', 'Home HIIT', 'Yoga / Pilates',
  'Indoor Cycling', 'Treadmill / Elliptical', 'Other',
];

const INTENSITY_COLORS = {
  light:    'bg-green-100 text-green-700',
  moderate: 'bg-yellow-100 text-yellow-700',
  vigorous: 'bg-red-100 text-red-700',
};

const emptyForm = {
  activity_type: '', duration_minutes: '', intensity: 'moderate',
  distance: '', distance_unit: 'miles', calories_burned: '', notes: '',
  log_date: format(new Date(), 'yyyy-MM-dd'),
};

// ── Weather Widget ─────────────────────────────────────────────────────────────

function WeatherWidget({ weather, onChangeLocation }) {
  const { outdoorOk, isWindy, reason, suggestions } = weather.suggestions;

  const bgGradient = weather.isDay
    ? outdoorOk ? 'from-blue-500 to-cyan-400' : 'from-slate-600 to-slate-500'
    : 'from-slate-800 to-slate-700';

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${bgGradient} text-white overflow-hidden`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-1.5 text-white/80 text-sm mb-1">
              <MapPin size={13} />
              <span>{weather.location}</span>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-6xl font-light">{weather.temp}°</span>
              <div className="mb-2">
                <p className="text-4xl">{weather.icon}</p>
              </div>
            </div>
            <p className="text-white/90 font-medium">{weather.condition}</p>
            <p className="text-white/70 text-sm">Feels like {weather.feelsLike}°F</p>
          </div>
          <button
            onClick={onChangeLocation}
            className="text-white/60 hover:text-white text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            Change location
          </button>
        </div>

        {/* Stats row */}
        <div className="flex gap-4 text-sm text-white/80 mb-5">
          <div className="flex items-center gap-1.5">
            <Wind size={14} />
            <span>{weather.windMph} mph</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Droplets size={14} />
            <span>{weather.precipitation}" precip</span>
          </div>
        </div>

        {/* Exercise recommendation */}
        <div className={`rounded-xl p-3 mb-4 ${outdoorOk ? 'bg-white/20' : 'bg-black/20'}`}>
          <p className="text-sm font-semibold">{outdoorOk ? '✅ Great for outdoor exercise' : isWindy ? '💨 Consider sheltered routes' : '🏠 Better to exercise indoors'}</p>
          <p className="text-xs text-white/80 mt-0.5">{reason}</p>
        </div>

        {/* Hourly forecast */}
        {weather.hourly?.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {weather.hourly.map((h, i) => (
              <div key={i} className="flex-shrink-0 text-center bg-white/10 rounded-lg px-3 py-2">
                <p className="text-xs text-white/70">{new Date(h.time).getHours()}:00</p>
                <p className="text-lg my-0.5">{h.wmo.icon}</p>
                <p className="text-xs font-medium">{Math.round(h.temp)}°</p>
                {h.precipProb > 0 && <p className="text-xs text-blue-200">{h.precipProb}%</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggested activities */}
      <div className="bg-black/20 px-6 py-4">
        <p className="text-xs font-semibold text-white/70 uppercase tracking-wide mb-3">Suggested Activities</p>
        <div className="flex flex-wrap gap-2">
          {suggestions.slice(0, 5).map((s, i) => (
            <span key={i} className="text-sm bg-white/15 hover:bg-white/25 px-3 py-1 rounded-full cursor-default transition-colors">
              {s.icon} {s.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Location Setup ─────────────────────────────────────────────────────────────

function LocationSetup({ onSave }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef(null);

  const search = async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    setError('');
    try {
      const res = await fetch(`/api/exercise/geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResults(data);
    } catch { setError('Search failed. Is the server running?'); }
    setSearching(false);
  };

  const handleInput = (e) => {
    setQuery(e.target.value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(e.target.value), 400);
  };

  const select = async (loc) => {
    await fetch('/api/exercise/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loc),
    });
    onSave(loc);
  };

  return (
    <div className="card p-8 text-center max-w-md mx-auto">
      <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <MapPin size={28} className="text-blue-500" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Set your location</h2>
      <p className="text-sm text-gray-500 mb-6">
        Weather data powers exercise suggestions. Uses Open-Meteo — free, no account needed.
      </p>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          value={query}
          onChange={handleInput}
          placeholder="Search city, e.g. Boston"
          autoFocus
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      {results.length > 0 && (
        <div className="mt-2 border border-gray-200 rounded-xl divide-y text-left">
          {results.map((r, i) => (
            <button key={i} onClick={() => select(r)}
              className="w-full px-4 py-3 hover:bg-blue-50 text-sm text-gray-800 text-left transition-colors first:rounded-t-xl last:rounded-b-xl">
              <MapPin size={13} className="inline mr-2 text-gray-400" />{r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function Exercise() {
  const [location, setLocation] = useState(undefined); // undefined = loading, null = not set
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');
  const [log, setLog] = useState([]);
  const [stats, setStats] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showLocationSetup, setShowLocationSetup] = useState(false);

  // Load location on mount
  useEffect(() => {
    fetch('/api/exercise/location').then(r => r.json()).then(loc => {
      setLocation(loc); // null if not set
    });
  }, []);

  // Load weather when location is available
  useEffect(() => {
    if (!location) return;
    setWeatherLoading(true);
    setWeatherError('');
    fetch('/api/exercise/weather')
      .then(r => r.json())
      .then(data => {
        if (data.error) setWeatherError(data.error);
        else setWeather(data);
        setWeatherLoading(false);
      })
      .catch(() => { setWeatherError('Could not load weather'); setWeatherLoading(false); });
  }, [location]);

  const loadLog = () => {
    const end = format(new Date(), 'yyyy-MM-dd');
    const start = format(subDays(new Date(), 29), 'yyyy-MM-dd');
    fetch(`/api/exercise?start=${start}&end=${end}`)
      .then(r => r.json()).then(setLog);
    fetch('/api/exercise/stats/weekly')
      .then(r => r.json()).then(setStats);
  };

  useEffect(() => { loadLog(); }, []);

  const openAdd = (activityName) => {
    setForm({
      ...emptyForm,
      activity_type: activityName || '',
      log_date: format(new Date(), 'yyyy-MM-dd'),
    });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (entry) => {
    setForm({ ...entry, duration_minutes: entry.duration_minutes ?? '', distance: entry.distance ?? '', calories_burned: entry.calories_burned ?? '' });
    setEditingId(entry.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `/api/exercise/${editingId}` : '/api/exercise';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        duration_minutes: form.duration_minutes !== '' ? parseInt(form.duration_minutes) : null,
        distance: form.distance !== '' ? parseFloat(form.distance) : null,
        calories_burned: form.calories_burned !== '' ? parseInt(form.calories_burned) : null,
      }),
    });
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    loadLog();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this entry?')) return;
    await fetch(`/api/exercise/${id}`, { method: 'DELETE' });
    loadLog();
  };

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleLocationSaved = (loc) => {
    setLocation(loc);
    setShowLocationSetup(false);
  };

  // Group log by date
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const todayEntries = log.filter(e => e.log_date === today);
  const recentEntries = log.filter(e => e.log_date !== today).slice(0, 10);

  if (location === undefined) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (showLocationSetup || location === null) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Exercise</h1>
            <p className="text-sm text-gray-500 mt-1">Track workouts with real-time weather guidance</p>
          </div>
          {location !== null && (
            <button className="btn-secondary" onClick={() => setShowLocationSetup(false)}>Cancel</button>
          )}
        </div>
        <LocationSetup onSave={handleLocationSaved} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exercise</h1>
          <p className="text-sm text-gray-500 mt-1">Track workouts with real-time weather guidance</p>
        </div>
        <button className="btn-primary" onClick={() => openAdd('')}>
          <Plus size={16} /> Log Workout
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: weather + suggestions */}
        <div className="lg:col-span-2 space-y-4">
          {weatherLoading ? (
            <div className="rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-300 h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          ) : weatherError ? (
            <div className="card p-6 text-center">
              <p className="text-red-500 text-sm">{weatherError}</p>
              <button className="btn-secondary mt-3" onClick={() => setShowLocationSetup(true)}>Change location</button>
            </div>
          ) : weather ? (
            <WeatherWidget weather={weather} onChangeLocation={() => setShowLocationSetup(true)} />
          ) : null}

          {/* Clickable activity suggestions */}
          {weather && (
            <div className="card p-5">
              <p className="text-sm font-semibold text-gray-700 mb-3">Log one of today's suggested activities</p>
              <div className="flex flex-wrap gap-2">
                {weather.suggestions.suggestions.slice(0, 6).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => openAdd(s.name)}
                    className="flex items-center gap-1.5 text-sm bg-gray-100 hover:bg-blue-100 hover:text-blue-700 px-3 py-1.5 rounded-full transition-colors font-medium"
                  >
                    <span>{s.icon}</span> {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: weekly stats */}
        <div className="space-y-4">
          {stats && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Streak', value: stats.streak, unit: 'days', icon: Flame, color: 'text-orange-500' },
                  { label: 'Sessions', value: stats.totalSessions, unit: 'this week', icon: Dumbbell, color: 'text-blue-500' },
                  { label: 'Minutes', value: stats.totalMinutes, unit: 'this week', icon: Clock, color: 'text-green-500' },
                ].map(({ label, value, unit, icon: Icon, color }) => (
                  <div key={label} className="card p-3 text-center">
                    <Icon size={18} className={`mx-auto mb-1 ${color}`} />
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-400 leading-tight">{label}</p>
                  </div>
                ))}
              </div>

              {/* 7-day bar chart */}
              <div className="card p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Last 7 Days</p>
                <div className="flex items-end gap-1.5 h-16">
                  {Array.from({ length: 7 }, (_, i) => {
                    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
                    const dayData = stats.days.find(r => r.log_date === d);
                    const mins = dayData?.minutes || 0;
                    const maxMins = Math.max(...stats.days.map(r => r.minutes || 0), 60);
                    const pct = maxMins > 0 ? (mins / maxMins) * 100 : 0;
                    const isToday = d === today;
                    return (
                      <div key={d} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex items-end" style={{ height: '52px' }}>
                          <div
                            className={`w-full rounded-t-sm transition-all ${mins > 0 ? (isToday ? 'bg-blue-500' : 'bg-blue-300') : 'bg-gray-100'}`}
                            style={{ height: `${Math.max(pct, mins > 0 ? 15 : 0)}%` }}
                            title={mins > 0 ? `${mins} min` : 'Rest day'}
                          />
                        </div>
                        <span className={`text-xs ${isToday ? 'font-bold text-blue-600' : 'text-gray-400'}`}>
                          {format(subDays(new Date(), 6 - i), 'EEE')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Today's workouts */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900 text-sm">Today's Workouts</h2>
          <button onClick={() => openAdd('')} className="btn-ghost text-xs gap-1 py-1">
            <Plus size={13} /> Add
          </button>
        </div>
        {todayEntries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">No workouts logged today</p>
            <button className="btn-primary mt-3 text-sm" onClick={() => openAdd('')}>Log a workout</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {todayEntries.map(e => <ExerciseRow key={e.id} entry={e} onEdit={openEdit} onDelete={handleDelete} />)}
          </div>
        )}
      </div>

      {/* Recent history */}
      {recentEntries.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">Recent History</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recentEntries.map(e => <ExerciseRow key={e.id} entry={e} onEdit={openEdit} onDelete={handleDelete} showDate />)}
          </div>
        </div>
      )}

      {/* Log workout modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Workout' : 'Log Workout'}</h2>
              <button onClick={() => { setShowForm(false); setEditingId(null); }} className="btn-ghost p-1.5"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Activity *</label>
                <input className="input" list="activity-list" value={form.activity_type} onChange={set('activity_type')} required placeholder="Running, Cycling, Gym..." />
                <datalist id="activity-list">
                  {ACTIVITY_TYPES.map(a => <option key={a} value={a} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Date *</label>
                  <input type="date" className="input" value={form.log_date} onChange={set('log_date')} required />
                </div>
                <div>
                  <label className="label">Duration (min)</label>
                  <input type="number" min="1" className="input" value={form.duration_minutes} onChange={set('duration_minutes')} placeholder="45" />
                </div>
              </div>
              <div>
                <label className="label">Intensity</label>
                <div className="flex gap-2">
                  {['light', 'moderate', 'vigorous'].map(lvl => (
                    <button
                      key={lvl} type="button"
                      onClick={() => setForm(f => ({ ...f, intensity: lvl }))}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${form.intensity === lvl ? INTENSITY_COLORS[lvl] + ' border-transparent' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}
                    >{lvl}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="label">Distance</label>
                  <input type="number" min="0" step="0.01" className="input" value={form.distance} onChange={set('distance')} placeholder="3.1" />
                </div>
                <div>
                  <label className="label">Unit</label>
                  <select className="input" value={form.distance_unit} onChange={set('distance_unit')}>
                    <option value="miles">miles</option>
                    <option value="km">km</option>
                    <option value="yards">yards</option>
                    <option value="meters">meters</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Est. Calories Burned</label>
                <input type="number" min="0" className="input" value={form.calories_burned} onChange={set('calories_burned')} placeholder="300" />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={2} value={form.notes} onChange={set('notes')} placeholder="How did it feel? Any PRs?" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Log Workout'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ExerciseRow({ entry, onEdit, onDelete, showDate }) {
  return (
    <div className="px-5 py-3 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900">{entry.activity_type}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${INTENSITY_COLORS[entry.intensity] || INTENSITY_COLORS.moderate}`}>
            {entry.intensity}
          </span>
          {showDate && <span className="text-xs text-gray-400">{format(parseISO(entry.log_date), 'MMM d')}</span>}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
          {entry.duration_minutes && <span><Clock size={11} className="inline mr-1" />{entry.duration_minutes} min</span>}
          {entry.distance && <span>{entry.distance} {entry.distance_unit}</span>}
          {entry.calories_burned && <span><Flame size={11} className="inline mr-1" />{entry.calories_burned} cal</span>}
          {entry.notes && <span className="truncate max-w-xs italic">{entry.notes}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={() => onEdit(entry)} className="btn-ghost p-1.5"><Pencil size={13} /></button>
        <button onClick={() => onDelete(entry.id)} className="btn-ghost p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={13} /></button>
      </div>
    </div>
  );
}
