require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');

const { readJson, writeJson } = require('./lib/jsonStore');

const app = express();
const PORT = process.env.PORT || 5173;

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
