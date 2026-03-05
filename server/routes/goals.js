const express = require('express');
const router = express.Router();
const db = require('../db');

const PERIOD_DAYS = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  biannual: 180,
  yearly: 365,
};

// Whitelisted nutrition columns — prevents SQL injection for dynamic column names
const NUTRITION_COLUMNS = new Set([
  'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar',
  'sodium', 'calcium', 'iron', 'vitamin_c', 'vitamin_d',
  'potassium', 'cholesterol', 'saturated_fat',
]);

function offsetDate(baseDate, days) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function computeStatus(goal, today) {
  const days = PERIOD_DAYS[goal.period] || 365;
  let status = 'no_data';
  let current_value = null;
  let message = '';
  let next_due = null;

  try {
    if (goal.category === 'nutrition') {
      const col = goal.metric_key;
      if (!NUTRITION_COLUMNS.has(col)) return { status: 'error', message: 'Unknown nutrition metric' };

      if (goal.period === 'daily') {
        const row = db.prepare(
          `SELECT COUNT(*) as count, COALESCE(SUM(${col}), 0) as total FROM nutrition_log WHERE log_date = ?`
        ).get(today);
        if (!row || row.count === 0) {
          status = 'no_data';
          message = 'No food logged today';
        } else {
          current_value = row.total;
          status = row.total >= goal.target_value ? 'on_track' : 'off_track';
          const remaining = goal.target_value - row.total;
          message = status === 'on_track'
            ? `${row.total.toFixed(1)} ${goal.target_unit} today — goal met`
            : `${row.total.toFixed(1)} / ${goal.target_value} ${goal.target_unit} today — need ${remaining.toFixed(1)} more`;
        }
      } else {
        // Average over the period
        const startDate = offsetDate(today, -(days - 1));
        const rows = db.prepare(
          `SELECT log_date, SUM(${col}) as daily_total FROM nutrition_log
           WHERE log_date BETWEEN ? AND ? GROUP BY log_date`
        ).all(startDate, today);
        if (rows.length === 0) {
          status = 'no_data';
          message = `No data in the last ${days} days`;
        } else {
          const avg = rows.reduce((s, r) => s + r.daily_total, 0) / rows.length;
          current_value = avg;
          status = avg >= goal.target_value ? 'on_track' : 'off_track';
          message = `${avg.toFixed(1)} ${goal.target_unit}/day avg (target: ${goal.target_value})`;
        }
      }

    } else if (goal.category === 'appointment') {
      const startDate = offsetDate(today, -days);
      const matchParam = `%${goal.metric_key || ''}%`;
      const hasFilter = !!(goal.metric_key && goal.metric_key.trim());

      const row = db.prepare(`
        SELECT COUNT(*) as count, MAX(appointment_date) as last_date
        FROM appointments
        WHERE status = 'completed'
          AND appointment_date >= ?
          AND (? = 0 OR specialty LIKE ?)
      `).get(startDate, hasFilter ? 1 : 0, matchParam);

      current_value = row?.count ?? 0;

      if (current_value === 0) {
        // Check all-time for last occurrence
        const allTime = db.prepare(`
          SELECT MAX(appointment_date) as last_date FROM appointments
          WHERE status = 'completed' AND (? = 0 OR specialty LIKE ?)
        `).get(hasFilter ? 1 : 0, matchParam);

        if (allTime?.last_date) {
          next_due = offsetDate(allTime.last_date, days);
          status = 'off_track';
          message = `Last completed ${allTime.last_date} — overdue (next due ${next_due})`;
        } else {
          status = 'no_data';
          message = hasFilter ? `No completed ${goal.metric_key} appointments found` : 'No completed appointments found';
        }
      } else {
        next_due = offsetDate(row.last_date, days);
        const daysUntilDue = Math.ceil((new Date(next_due) - new Date()) / 86400000);
        if (daysUntilDue <= 30 && daysUntilDue > 0) {
          status = 'due_soon';
          message = `${current_value} completed this ${goal.period} — next due in ${daysUntilDue} days`;
        } else if (daysUntilDue <= 0) {
          status = 'off_track';
          message = `Overdue by ${-daysUntilDue} days`;
        } else {
          status = 'on_track';
          message = `${current_value} completed this ${goal.period} — next due ${next_due}`;
        }
      }

    } else if (goal.category === 'test') {
      const matchParam = `%${goal.metric_key || ''}%`;
      const row = db.prepare(
        `SELECT MAX(test_date) as last_date FROM test_results WHERE test_name LIKE ?`
      ).get(matchParam);
      const lastDate = row?.last_date;

      if (!lastDate) {
        status = 'no_data';
        message = `No "${goal.metric_key}" test results found`;
      } else {
        next_due = offsetDate(lastDate, days);
        const now = new Date();
        const daysOverdue = Math.ceil((now - new Date(next_due)) / 86400000);
        const daysSinceLast = Math.ceil((now - new Date(lastDate)) / 86400000);

        if (daysOverdue > 0) {
          status = 'off_track';
          message = `Last test ${daysSinceLast} days ago — overdue by ${daysOverdue} days`;
        } else if (-daysOverdue <= 30) {
          status = 'due_soon';
          message = `Last test ${daysSinceLast} days ago — due in ${-daysOverdue} days`;
        } else {
          status = 'on_track';
          message = `Last test ${daysSinceLast} days ago — next due ${next_due}`;
        }
      }

    } else if (goal.category === 'exercise') {
      // metric_key format: 'sessions', 'minutes', 'streak',
      // or 'sessions:Running', 'minutes:Cycling' to filter by activity type
      const [metric, activityFilter] = (goal.metric_key || 'sessions').split(':');
      const startDate = offsetDate(today, -(days - 1));
      const hasActivity = !!(activityFilter && activityFilter.trim());
      const activityParam = `%${activityFilter || ''}%`;
      const activityLabel = hasActivity ? ` (${activityFilter})` : '';

      if (metric === 'streak') {
        const allDates = db.prepare(
          'SELECT DISTINCT log_date FROM exercise_log ORDER BY log_date DESC'
        ).all();
        const dateSet = new Set(allDates.map(r => r.log_date));
        let streak = 0;
        for (let i = 0; i <= 365; i++) {
          if (dateSet.has(offsetDate(today, -i))) streak++;
          else break;
        }
        current_value = streak;
        if (streak === 0) {
          status = 'no_data';
          message = 'No active streak — log a workout to start';
        } else {
          status = streak >= goal.target_value ? 'on_track' : 'off_track';
          message = `${streak}-day streak${streak >= goal.target_value ? ' — goal met' : ` — need ${goal.target_value - streak} more days`}`;
        }

      } else if (metric === 'minutes') {
        const row = db.prepare(`
          SELECT COUNT(*) as count, COALESCE(SUM(duration_minutes), 0) as total
          FROM exercise_log
          WHERE log_date BETWEEN ? AND ?
            AND duration_minutes IS NOT NULL
            AND (? = 0 OR activity_type LIKE ?)
        `).get(startDate, today, hasActivity ? 1 : 0, activityParam);

        current_value = row?.total ?? 0;
        if (!row || row.count === 0) {
          status = 'no_data';
          message = `No exercise logged this ${goal.period}${activityLabel}`;
        } else {
          status = current_value >= goal.target_value ? 'on_track' : 'off_track';
          const remaining = Math.max(0, goal.target_value - current_value);
          message = status === 'on_track'
            ? `${current_value} / ${goal.target_value} min this ${goal.period}${activityLabel} — goal met`
            : `${current_value} / ${goal.target_value} min this ${goal.period}${activityLabel} — need ${remaining} more`;
        }

      } else {
        // default: sessions
        const row = db.prepare(`
          SELECT COUNT(*) as count
          FROM exercise_log
          WHERE log_date BETWEEN ? AND ?
            AND (? = 0 OR activity_type LIKE ?)
        `).get(startDate, today, hasActivity ? 1 : 0, activityParam);

        current_value = row?.count ?? 0;
        if (current_value === 0) {
          status = 'no_data';
          message = `No workouts logged this ${goal.period}${activityLabel}`;
        } else {
          status = current_value >= goal.target_value ? 'on_track' : 'off_track';
          message = status === 'on_track'
            ? `${current_value} / ${goal.target_value} sessions this ${goal.period}${activityLabel} — goal met`
            : `${current_value} / ${goal.target_value} sessions this ${goal.period}${activityLabel}`;
        }
      }

    } else if (goal.category === 'general') {
      status = 'manual';
      message = 'Manual tracking goal';
    }
  } catch (e) {
    status = 'error';
    message = e.message;
  }

  return { status, current_value, message, next_due };
}

// GET /api/goals/status — all active goals with computed status
router.get('/status', (_req, res) => {
  const goals = db.prepare('SELECT * FROM goals WHERE active = 1 ORDER BY category ASC, created_at ASC').all();
  const today = new Date().toISOString().slice(0, 10);
  const results = goals.map(goal => ({ ...goal, ...computeStatus(goal, today) }));
  res.json(results);
});

// CRUD
router.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM goals ORDER BY active DESC, created_at DESC').all());
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const { title, category, metric_key, target_value, target_unit, period, notes } = req.body;
  if (!title || !category) return res.status(400).json({ error: 'title and category are required' });

  const result = db.prepare(`
    INSERT INTO goals (title, category, metric_key, target_value, target_unit, period, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, category, metric_key || null, target_value || null, target_unit || null, period || 'yearly', notes || null);

  res.status(201).json(db.prepare('SELECT * FROM goals WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { title, category, metric_key, target_value, target_unit, period, notes, active } = req.body;
  const existing = db.prepare('SELECT id FROM goals WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  db.prepare(`
    UPDATE goals SET title=?, category=?, metric_key=?, target_value=?, target_unit=?, period=?, notes=?, active=?
    WHERE id=?
  `).run(title, category, metric_key || null, target_value || null, target_unit || null,
    period || 'yearly', notes || null, active !== undefined ? (active ? 1 : 0) : 1, req.params.id);

  res.json(db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM goals WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
