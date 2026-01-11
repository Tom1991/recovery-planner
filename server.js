require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/* ------------------ TODAY EVENTS ------------------ */

app.get('/api/events/today', async (req, res) => {
  const result = await pool.query(`
    SELECT *
    FROM events
    WHERE
      (
        recurrence = 'None'
        AND start::date = CURRENT_DATE
      )
      OR
      (
        recurrence = 'Daily'
        AND start::date <= CURRENT_DATE
      )
      OR
      (
        recurrence = 'Weekly'
        AND start::date <= CURRENT_DATE
        AND EXTRACT(DOW FROM start) = EXTRACT(DOW FROM CURRENT_DATE)
      )
    ORDER BY start
  `);
  res.json(result.rows);
});

/* ------------------ SOBRIETY ------------------ */

app.get('/api/sobriety', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM sobriety ORDER BY id DESC LIMIT 1'
  );
  res.json(result.rows[0] || {});
});

app.post('/api/sobriety', async (req, res) => {
  const { start_date } = req.body;
  await pool.query(
    'INSERT INTO sobriety (start_date) VALUES ($1)',
    [start_date]
  );
  res.json({ success: true });
});

/* ------------------ EVENTS ------------------ */

app.get('/api/events', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM events ORDER BY start'
  );
  res.json(result.rows);
});

app.post('/api/events', async (req, res) => {
  const { title, category, start, end, link, recurrence } = req.body;
  await pool.query(
    `INSERT INTO events (title, category, start, "end", link, recurrence)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [title, category, start, end, link, recurrence]
  );
  res.json({ success: true });
});

app.delete('/api/events/:id', async (req, res) => {
  await pool.query(
    'DELETE FROM events WHERE id = $1',
    [parseInt(req.params.id)]
  );
  res.json({ success: true });
});

/* ------------------ TODAY DIARY ------------------ */

// Get today's diary
app.get('/api/diary/today', async (req, res) => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const result = await pool.query(
    'SELECT * FROM diary WHERE date = $1',
    [today]
  );
  res.json(result.rows[0] || {});
});

// Save today's diary
app.post('/api/diary/today', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const {
    goal, grateful1, grateful2, grateful3,
    emotion1, emotion2, emotion3, cravings,
    morning, afternoon, evening
  } = req.body;

  // Upsert: insert if not exists, else update
  await pool.query(`
    INSERT INTO diary (date, goal, grateful1, grateful2, grateful3, emotion1, emotion2, emotion3, cravings, morning, afternoon, evening)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    ON CONFLICT (date)
    DO UPDATE SET
      goal = EXCLUDED.goal,
      grateful1 = EXCLUDED.grateful1,
      grateful2 = EXCLUDED.grateful2,
      grateful3 = EXCLUDED.grateful3,
      emotion1 = EXCLUDED.emotion1,
      emotion2 = EXCLUDED.emotion2,
      emotion3 = EXCLUDED.emotion3,
      cravings = EXCLUDED.cravings,
      morning = EXCLUDED.morning,
      afternoon = EXCLUDED.afternoon,
      evening = EXCLUDED.evening
  `, [today, goal, grateful1, grateful2, grateful3, emotion1, emotion2, emotion3, cravings, morning, afternoon, evening]);

  res.json({ success: true });
});


/* ------------------ SERVER ------------------ */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
