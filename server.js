// server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const mealRoutes = require('./routes/mealRoutes');
const { connectDB } = require('./config/database');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do diretório frontend
app.use(express.static(path.join(__dirname, '../frontend')));

const db = connectDB();
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      lunch INTEGER,
      dinner INTEGER,
      snack INTEGER,
      soda INTEGER
    );
  `, (err) => {
    if (err) {
      console.error('Error creating meals table:', err);
    } else {
      console.log('Meals table created or already exists.');
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lunchPrice INTEGER,
      dinnerPrice INTEGER,
      snackPrice INTEGER,
      sodaPrice INTEGER
    );
  `, (err) => {
    if (err) {
      console.error('Error creating prices table:', err);
    } else {
      console.log('Prices table created or already exists.');
    }
  });
});

// Rotas
app.use('/api/meals', mealRoutes);

// Rota para obter refeições por mês e ano
app.get('/api/meals', (req, res) => {
  const { month, year } = req.query;
  const startDate = `${year}-${month}-01`;
  const endDate = `${year}-${month}-31`;

  db.all(`SELECT * FROM meals WHERE date BETWEEN ? AND ?`, [startDate, endDate], (err, rows) => {
    if (err) {
      console.error('Error querying meals table:', err);
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.post('/api/meals', (req, res) => {
  const { date, lunch, dinner, snack, soda } = req.body;
  const query = 'INSERT INTO meals (date, lunch, dinner, snack, soda) VALUES (?, ?, ?, ?, ?)';
  
  db.run(query, [date, lunch, dinner, snack, soda], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ id: this.lastID });
    }
  });
});

app.get('/api/prices', (req, res) => {
  db.get('SELECT * FROM prices WHERE id = 1', (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(row || { lunchPrice: 0, dinnerPrice: 0, snackPrice: 0, sodaPrice: 0 });
    }
  });
});

app.post('/api/prices', (req, res) => {
  const { lunchPrice, dinnerPrice, snackPrice, sodaPrice } = req.body;
  const query = `
    INSERT INTO prices (id, lunchPrice, dinnerPrice, snackPrice, sodaPrice)
    VALUES (1, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
    lunchPrice = excluded.lunchPrice,
    dinnerPrice = excluded.dinnerPrice,
    snackPrice = excluded.snackPrice,
    sodaPrice = excluded.sodaPrice;
  `;
  
  db.run(query, [lunchPrice, dinnerPrice, snackPrice, sodaPrice], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ success: true });
    }
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Serving static files from:', path.join(__dirname, '../frontend'));
});
