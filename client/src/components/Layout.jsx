import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FlaskConical, CalendarDays, BookOpen, Salad, Target, Dumbbell
} from 'lucide-react';

const navItems = [
  { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/goals',        label: 'Goals',        icon: Target          },
  { to: '/test-results', label: 'Lab Results',  icon: FlaskConical    },
  { to: '/appointments', label: 'Appointments', icon: CalendarDays    },
  { to: '/notes',        label: 'Notes',        icon: BookOpen        },
  { to: '/nutrition',    label: 'Nutrition',    icon: Salad           },
  { to: '/exercise',     label: 'Exercise',     icon: Dumbbell        },
];

export default function Layout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-slate-900 flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-lg font-bold">H</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">Health &amp;</p>
              <p className="text-slate-400 text-xs">Wellness Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <p className="text-slate-500 text-xs text-center">All data stored locally</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-full p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
