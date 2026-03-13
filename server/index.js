require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/test-results', require('./routes/testResults'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/nutrition', require('./routes/nutrition'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/exercise', require('./routes/exercise'));
app.use('/api/challenges', require('./routes/challenges'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`Health Dashboard server running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
