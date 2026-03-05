import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FlaskConical, CalendarDays, BookOpen, Target, ArrowRight,
  AlertCircle, CheckCircle2, Clock, HelpCircle, Plus,
} from 'lucide-react';
import { format, isFuture, parseISO, differenceInDays } from 'date-fns';

const STATUS_CONFIG = {
  on_track:  { icon: CheckCircle2, text: 'text-green-700'  },
  due_soon:  { icon: Clock,        text: 'text-yellow-700' },
  off_track: { icon: AlertCircle,  text: 'text-red-700'    },
  no_data:   { icon: HelpCircle,   text: 'text-gray-500'   },
  manual:    { icon: CheckCircle2, text: 'text-blue-600'   },
};

const CATEGORY_LABELS = {
  nutrition:   { label: 'Nutrition',   color: 'bg-green-100 text-green-700'   },
  appointment: { label: 'Appointment', color: 'bg-blue-100 text-blue-700'     },
  test:        { label: 'Lab Test',    color: 'bg-purple-100 text-purple-700' },
  general:     { label: 'General',     color: 'bg-gray-100 text-gray-600'     },
};

function GoalAlert({ goal }) {
  const cfg = STATUS_CONFIG[goal.status] || STATUS_CONFIG.no_data;
  const Icon = cfg.icon;
  const cat = CATEGORY_LABELS[goal.category];
  return (
    <div className="flex items-start gap-3 px-5 py-3 border-b last:border-0">
      <Icon size={16} className={`flex-shrink-0 mt-0.5 ${cfg.text}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900">{goal.title}</p>
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${cat?.color}`}>{cat?.label}</span>
        </div>
        <p className={`text-xs mt-0.5 ${cfg.text}`}>{goal.message}</p>
      </div>
      {goal.next_due && (
        <p className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">Due {goal.next_due}</p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [testResults, setTestResults] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [goalStatuses, setGoalStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/test-results').then(r => r.json()),
      fetch('/api/appointments').then(r => r.json()),
      fetch('/api/notes').then(r => r.json()),
      fetch('/api/goals/status').then(r => r.json()),
    ]).then(([tr, appts, n, gs]) => {
      setTestResults(tr);
      setAppointments(appts);
      setNotes(n);
      setGoalStatuses(gs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const upcomingAppts = appointments
    .filter(a => a.status === 'upcoming' && isFuture(parseISO(a.appointment_date)))
    .slice(0, 5);
  const recentResults = testResults.slice(0, 5);
  const abnormalResults = testResults.filter(r => r.status === 'high' || r.status === 'low');

  const offTrackGoals = goalStatuses.filter(g => g.status === 'off_track');
  const dueSoonGoals  = goalStatuses.filter(g => g.status === 'due_soon');
  const onTrackGoals  = goalStatuses.filter(g => g.status === 'on_track');
  const noDataGoals   = goalStatuses.filter(g => g.status === 'no_data');
  const alertGoals    = [...offTrackGoals, ...dueSoonGoals];
  const hasGoals      = goalStatuses.length > 0;

  const statCards = [
    {
      label: 'Lab Results', value: testResults.length,
      sub: `${abnormalResults.length} abnormal`, icon: FlaskConical, color: 'blue', to: '/test-results',
    },
    {
      label: 'Upcoming Appointments', value: upcomingAppts.length,
      sub: upcomingAppts[0] ? `Next: ${format(parseISO(upcomingAppts[0].appointment_date), 'MMM d')}` : 'None scheduled',
      icon: CalendarDays, color: 'purple', to: '/appointments',
    },
    {
      label: 'Notes', value: notes.length,
      sub: 'From doctors & research', icon: BookOpen, color: 'amber', to: '/notes',
    },
    {
      label: 'Active Goals', value: goalStatuses.length,
      sub: offTrackGoals.length > 0
        ? `${offTrackGoals.length} need attention`
        : dueSoonGoals.length > 0 ? `${dueSoonGoals.length} due soon` : 'All on track',
      icon: Target,
      color: offTrackGoals.length > 0 ? 'red' : dueSoonGoals.length > 0 ? 'amber' : 'green',
      to: '/goals',
    },
  ];

  const colorMap = {
    blue: 'bg-blue-50 text-blue-600', purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600', green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Goals — primary status section */}
      {!hasGoals ? (
        <div className="card p-5 border-dashed border-2 border-gray-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-lg"><Target size={20} className="text-blue-500" /></div>
            <div>
              <p className="font-semibold text-gray-900">Set up health goals</p>
              <p className="text-sm text-gray-500">Track lab schedules, appointments, and daily nutrition targets</p>
            </div>
          </div>
          <Link to="/goals" className="btn-primary flex-shrink-0">
            <Plus size={16} /> Add Goals
          </Link>
        </div>
      ) : alertGoals.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">All goals on track</p>
            <p className="text-xs text-green-600 mt-0.5">
              {onTrackGoals.length} on track
              {noDataGoals.length > 0 ? ` · ${noDataGoals.length} need data` : ''}
            </p>
          </div>
          <Link to="/goals" className="text-green-600 hover:text-green-800"><ArrowRight size={18} /></Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b bg-red-50">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500" />
              <h2 className="font-semibold text-gray-900 text-sm">
                {offTrackGoals.length > 0 && `${offTrackGoals.length} goal${offTrackGoals.length > 1 ? 's' : ''} need attention`}
                {offTrackGoals.length > 0 && dueSoonGoals.length > 0 && ' · '}
                {dueSoonGoals.length > 0 && `${dueSoonGoals.length} due soon`}
              </h2>
            </div>
            <Link to="/goals" className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
              All goals <ArrowRight size={14} />
            </Link>
          </div>
          <div>
            {alertGoals.map(goal => <GoalAlert key={goal.id} goal={goal} />)}
          </div>
        </div>
      )}

      {/* Abnormal lab results */}
      {abnormalResults.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">
              {abnormalResults.length} abnormal lab result{abnormalResults.length > 1 ? 's' : ''} on record
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {abnormalResults.slice(0, 3).map(r => r.test_name).join(', ')}
              {abnormalResults.length > 3 ? ` and ${abnormalResults.length - 3} more` : ''}
            </p>
          </div>
          <Link to="/test-results" className="ml-auto text-red-600 hover:text-red-800"><ArrowRight size={18} /></Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, sub, icon: Icon, color, to }) => (
          <Link key={label} to={to} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
                <p className="text-xs text-gray-400 mt-1">{sub}</p>
              </div>
              <div className={`p-2.5 rounded-lg ${colorMap[color]}`}>
                <Icon size={20} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Upcoming Appointments</h2>
            <Link to="/appointments" className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingAppts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No upcoming appointments</p>
            ) : (
              upcomingAppts.map(appt => {
                const daysUntil = differenceInDays(parseISO(appt.appointment_date), new Date());
                return (
                  <div key={appt.id} className="px-6 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{appt.title}</p>
                      <p className="text-xs text-gray-500">
                        {appt.doctor_name && `${appt.doctor_name} · `}
                        {format(parseISO(appt.appointment_date), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      daysUntil <= 3 ? 'bg-red-100 text-red-700' :
                      daysUntil <= 7 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Lab Results</h2>
            <Link to="/test-results" className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentResults.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No lab results recorded</p>
            ) : (
              recentResults.map(r => (
                <div key={r.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.test_name}</p>
                    <p className="text-xs text-gray-500">{format(parseISO(r.test_date), 'MMM d, yyyy')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{r.value} {r.unit}</span>
                    <span className={`badge-${r.status}`}>{r.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {notes.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Notes</h2>
            <Link to="/notes" className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {notes.slice(0, 3).map(note => (
              <div key={note.id} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-1">{note.title}</p>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{note.source}</span>
                </div>
                <p className="text-xs text-gray-600 line-clamp-3">{note.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
