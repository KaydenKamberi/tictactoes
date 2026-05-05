require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 5173;

const DATA_DIR = path.join(__dirname, 'data');
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Ensure the data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson(name, fallback = []) {
  const file = path.join(DATA_DIR, name);
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
      return fallback;
    }
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!raw) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
      return fallback;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${name}:`, err);
    return fallback;
  }
}

function writeJson(name, data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const filePath = path.join(DATA_DIR, name);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Successfully wrote to ${filePath}`);
  } catch (err) {
    console.error(`Error writing to ${filePath}:`, err);
  }
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
  console.log('Received /save-game request with body:', req.body);
  const newGame = req.body;
  const games = readJson('games.json', []);
  games.push(newGame);
  writeJson('games.json', games);
  res.status(200).json({ success: true, games });
});

// CP06: Endpoint to get AI move from Groq API
app.post('/get-ai-move', async (req, res) => {
  const { boardState } = req.body;
  const apiUrl = 'https://api.groq.com/v1/chat/completions';

  if (!GROQ_API_KEY) {
    console.error('Groq API key is not set in environment variables.');
    // Fallback: Random move
    const emptyIndices = boardState.map((cell, index) => cell === '' ? index : null).filter(val => val !== null);
    const randomMove = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    return res.json({ moveIndex: randomMove });
  }

  const prompt = `
    You are an AI playing Tic Tac Toe as 'O'. Given the current board state: [${boardState.map(cell => cell || ' ').join(', ')}],
    return the best move index (0-8) for 'O' to win or force a draw. Respond with ONLY the index (e.g., 4).
  `;

  const requestBody = {
    model: 'llama3-8b-8192',
    messages: [
      { role: 'user', content: prompt }
    ],
    temperature: 0.1,
    max_tokens: 1
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    const moveIndex = parseInt(data.choices[0].message.content.trim());
    res.json({ moveIndex });
  } catch (error) {
    console.error('Error calling Groq API:', error);
    // Fallback: Random move
    const emptyIndices = boardState.map((cell, index) => cell === '' ? index : null).filter(val => val !== null);
    const randomMove = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    res.json({ moveIndex: randomMove });
  }
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
