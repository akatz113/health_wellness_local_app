import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, CalendarDays, ArrowRight } from 'lucide-react';
import { format, isFuture, parseISO, differenceInDays } from 'date-fns';

const QUOTES = [
  'The only person who can do this is you.',
  'Small steps every day.',
  'You don\'t have to be perfect — just consistent.',
  'Your health is an investment, not an expense.',
  'Discipline is choosing between what you want now and what you want most.',
  'Take care of your body. It\'s the only place you have to live.',
  'The best time to start was yesterday. The next best time is now.',
  'Progress, not perfection.',
  'What you do today matters.',
  'Be patient with yourself. Growth takes time.',
  'A year from now, you\'ll wish you had started today.',
  'You are worth the effort.',
  'Show up for yourself.',
  'Health is not about the weight you lose, but the life you gain.',
  'One day or day one — you decide.',
];

const CATEGORY_ORDER = ['exercise', 'nutrition', 'appointment', 'test', 'general'];
const CATEGORY_SECTION = {
  exercise:    'Movement',
  nutrition:   'Nutrition',
  appointment: 'Appointments',
  test:        'Lab Work',
  general:     'General',
};

function getDailyQuote() {
  const day = Math.floor(Date.now() / 86400000);
  return QUOTES[day % QUOTES.length];
}

function GoalEntry({ goal }) {
  const isSimpleExercise = goal.category === 'exercise' && (!goal.metric_key || goal.metric_key.startsWith('['));
  const isTrackable = ['appointment', 'test', 'nutrition'].includes(goal.category);

  let tags = [];
  if (isSimpleExercise && goal.metric_key) {
    try { tags = JSON.parse(goal.metric_key); } catch {}
  }

  // Status styling for trackable goals
  const statusColor = {
    on_track: 'text-green-700',
    due_soon: 'text-amber-600',
    off_track: 'text-red-700',
    no_data: 'text-stone-400',
    manual: 'text-stone-400',
    error: 'text-red-400',
  };

  return (
    <div className="py-3">
      <p className="text-lg font-medium text-stone-800 leading-snug">{goal.title}</p>
      {goal.notes && (
        <p className="text-sm italic text-stone-500 mt-1">{goal.notes}</p>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {tags.map(tag => (
            <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              {tag}
            </span>
          ))}
        </div>
      )}
      {isTrackable && goal.message && (
        <p className={`text-xs mt-1.5 ${statusColor[goal.status] || 'text-stone-400'}`}>
          {goal.message}
        </p>
      )}
      {!isTrackable && goal.period && goal.category !== 'exercise' && goal.category !== 'general' && (
        <p className="text-xs text-stone-400 mt-1">{goal.period}</p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [goalStatuses, setGoalStatuses] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/goals/status').then(r => r.json()),
      fetch('/api/appointments').then(r => r.json()),
    ]).then(([gs, appts]) => {
      setGoalStatuses(gs);
      setAppointments(appts);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const upcomingAppts = appointments
    .filter(a => a.status === 'upcoming' && isFuture(parseISO(a.appointment_date)))
    .slice(0, 5);

  // Group goals by category in defined order
  const grouped = {};
  for (const cat of CATEGORY_ORDER) {
    const goals = goalStatuses.filter(g => g.category === cat);
    if (goals.length > 0) grouped[cat] = goals;
  }
  const hasGoals = goalStatuses.length > 0;

  return (
    <div className="max-w-2xl mx-auto px-2">
      {/* Journal header */}
      <div className="text-center pt-6 pb-8 border-b border-stone-200">
        <p className="text-sm uppercase tracking-widest text-stone-400 mb-1">
          {format(new Date(), 'EEEE')}
        </p>
        <h1 className="text-3xl font-serif font-semibold text-stone-800">
          {format(new Date(), 'MMMM d, yyyy')}
        </h1>
        <p className="text-sm italic text-amber-700 mt-3">
          "{getDailyQuote()}"
        </p>
      </div>

      {/* Goals */}
      <div className="mt-8">
        {!hasGoals ? (
          <div className="text-center py-12">
            <p className="text-stone-400 italic mb-4">Write down what matters to you.</p>
            <Link to="/goals" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors text-sm font-medium">
              <Plus size={16} /> Add your first goal
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {CATEGORY_ORDER.filter(cat => grouped[cat]).map((cat, idx) => (
              <div key={cat}>
                {idx > 0 && <div className="border-t border-stone-200 mb-6" />}
                <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">
                  {CATEGORY_SECTION[cat]}
                </p>
                <div className="divide-y divide-stone-100">
                  {grouped[cat].map(goal => (
                    <GoalEntry key={goal.id} goal={goal} />
                  ))}
                </div>
              </div>
            ))}

            <div className="text-center pt-4">
              <Link to="/goals" className="inline-flex items-center gap-1.5 text-sm text-amber-700 hover:text-amber-900 transition-colors">
                <Plus size={15} /> Add a goal
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Don't forget — upcoming appointments */}
      {upcomingAppts.length > 0 && (
        <div className="mt-10 pt-6 border-t border-stone-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
              <CalendarDays size={13} /> Don't forget
            </p>
            <Link to="/appointments" className="text-xs text-amber-700 hover:text-amber-900 flex items-center gap-1">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          <div className="space-y-2">
            {upcomingAppts.map(appt => {
              const daysUntil = differenceInDays(parseISO(appt.appointment_date), new Date());
              return (
                <div key={appt.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-stone-700">{appt.title}</p>
                    <p className="text-xs text-stone-400">
                      {appt.doctor_name && `${appt.doctor_name} · `}
                      {format(parseISO(appt.appointment_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    daysUntil <= 3 ? 'bg-red-50 text-red-700' :
                    daysUntil <= 7 ? 'bg-amber-50 text-amber-700' :
                    'bg-stone-100 text-stone-600'
                  }`}>
                    {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil} days`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer breathing room */}
      <div className="h-12" />
    </div>
  );
}
