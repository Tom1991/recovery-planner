const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database('recovery.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT,
    start TEXT NOT NULL,
    end TEXT NOT NULL,
    link TEXT,
    recurrence TEXT DEFAULT 'None'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sobriety (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    start_date TEXT
  )`);

  db.run(`INSERT OR IGNORE INTO sobriety (id, start_date) VALUES (1, NULL)`);
});

// API routes
app.get('/api/events', (req, res) => {
  db.all('SELECT * FROM events ORDER BY start', (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

app.post('/api/events', (req, res) => {
  const { title, category, start, end, link, recurrence } = req.body;
  db.run(
    'INSERT INTO events (title, category, start, end, link, recurrence) VALUES (?, ?, ?, ?, ?, ?)',
    [title, category, start, end, link, recurrence],
    function(err) {
      if (err) return res.status(500).json(err);
      res.json({ id: this.lastID });
    }
  );
});

app.delete('/api/events/:id', (req, res) => {
  db.run('DELETE FROM events WHERE id = ?', req.params.id, err => {
    if (err) return res.status(500).json(err);
    res.json({ success: true });
  });
});

app.get('/api/sobriety', (req, res) => {
  db.get('SELECT start_date FROM sobriety WHERE id = 1', (err, row) => {
    if (err) return res.status(500).json(err);
    res.json(row);
  });
});

app.post('/api/sobriety', (req, res) => {
  const { start_date } = req.body;
  db.run('UPDATE sobriety SET start_date = ? WHERE id = 1', [start_date], err => {
    if (err) return res.status(500).json(err);
    res.json({ success: true });
  });
});

// Render sets PORT in environment variables
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Recovery planner running on port ${PORT}`));
