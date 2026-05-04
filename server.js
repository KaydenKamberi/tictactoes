require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 5173;

const DATA_DIR = path.join(__dirname, 'data');

function readJson(name, fallback = []) {
  const file = path.join(DATA_DIR, name);
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

function writeJson(name, data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(path.join(DATA_DIR, name), JSON.stringify(data, null, 2));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-only-secret-change-me',
    resave: false,
    saveUninitialized: false,
  })
);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

// CP05: Endpoint to fetch game history
app.get('/games', (req, res) => {
  const games = readJson('games.json', []);
  res.json(games);
});

// CP05: Endpoint to save a single game to history
app.post('/save-game', (req, res) => {
  const newGame = req.body; // Expect a single game object
  const games = readJson('games.json', []);
  games.push(newGame); // Append the new game to the existing array
  writeJson('games.json', games);
  res.sendStatus(200);
});

app.post('/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const users = readJson('users.json', []);
  if (users.find((u) => u.username === username)) {
    return res.status(409).json({ error: 'That username is already taken' });
  }

  // Plaintext storage is intentional per the project brief (learning only).
  users.push({ username, password });
  writeJson('users.json', users);

  req.session.user = username;
  res.json({ user: username });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const users = readJson('users.json', []);
  const found = users.find(
    (u) => u.username === username && u.password === password
  );
  if (!found) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  req.session.user = username;
  res.json({ user: username });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});