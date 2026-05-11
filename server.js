require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
// Required Tech Stack: Groq SDK
const Groq = require('groq-sdk');

const app = express();
const PORT = process.env.PORT || 5173;

const DATA_DIR = path.join(__dirname, 'data');
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Initialize Groq client with your API Key
const groq = new Groq({ apiKey: GROQ_API_KEY });

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

// CP07: Updated endpoint to get AI move with difficulty and personality
app.post('/get-ai-move', async (req, res) => {
  const { boardState, difficulty, personality } = req.body;

  // Fallback function for invalid moves or JSON errors
  function getFallbackMove() {
    const emptyIndices = boardState.map((cell, index) => cell === '' ? index : null).filter(val => val !== null);
    const randomMove = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];

    let fallbackComment = '';
    switch (personality) {
      case 'Passive-Aggressive Robot':
        fallbackComment = "Oh great, another brilliant move by me. Not like you could've seen that coming.";
        break;
      case 'Kind Tic-Tac-Toe Coach':
        fallbackComment = "Hmm, let's try this spot. Keep practicing, you're doing great!";
        break;
      case 'Angry Pirate':
        fallbackComment = "Arrr, me brain broke, but I claim this square!";
        break;
      default:
        fallbackComment = "AI is thinking...";
    }

    return { move: randomMove, comment: fallbackComment };
  }

  if (!GROQ_API_KEY) {
    console.error('Groq API key is not set in environment variables.');
    const fallback = getFallbackMove();
    return res.json({ moveIndex: fallback.move, comment: fallback.comment });
  }

  // Construct dynamic prompt based on difficulty and personality
  let systemPrompt = '';

  switch (difficulty) {
    case 'Easy':
      systemPrompt += 'You are playing Tic Tac Toe as "O" on EASY difficulty. Make obvious mistakes or pick random open spots. ';
      break;
    case 'Medium':
      systemPrompt += 'You are playing Tic Tac Toe as "O" on MEDIUM difficulty. Play decently but miss complex traps. ';
      break;
    case 'Hard':
      systemPrompt += 'You are playing Tic Tac Toe as "O" on HARD difficulty. Play perfectly like the Minimax algorithm. ';
      break;
    default:
      systemPrompt += 'You are playing Tic Tac Toe as "O". ';
  }

  switch (personality) {
    case 'Passive-Aggressive Robot':
      systemPrompt += 'Respond with a snarky, backhanded compliment in a robotic tone. ';
      break;
    case 'Kind Tic-Tac-Toe Coach':
      systemPrompt += 'Respond with an encouraging, analytical, and supportive comment. ';
      break;
    case 'Angry Pirate':
      systemPrompt += 'Respond with a salty, aggressive comment using pirate slang. ';
      break;
    default:
      systemPrompt += 'Respond with a neutral comment. ';
  }

  systemPrompt += `Current board state: [${boardState.map(cell => cell || ' ').join(', ')}]. `;
  systemPrompt += 'Return ONLY a JSON object: {"move": <0-8>, "comment": "<string>"}.';

  try {
    // FIX: Switched from manual fetch to official Groq SDK to resolve 400 Bad Request errors
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Make your move.' }
      ],
      model: 'llama3-8b-8192',
      temperature: 0.1,
      max_tokens: 150,
      response_format: { type: 'json_object' } // Groq JSON mode
    });

    const responseContent = chatCompletion.choices[0].message.content.trim();
    const moveData = JSON.parse(responseContent);

    // Validate the move is a number and the cell is empty
    if (
      typeof moveData.move !== 'number' ||
      moveData.move < 0 ||
      moveData.move > 8 ||
      boardState[moveData.move] !== ''
    ) {
      console.error('Invalid move from LLM:', moveData.move);
      throw new Error('Invalid move');
    }

    res.json({ 
      moveIndex: moveData.move, 
      comment: moveData.comment || "AI made a move." 
    });

  } catch (error) {
    console.error('Groq SDK Error:', error);
    const fallback = getFallbackMove();
    res.json({ 
      moveIndex: fallback.move, 
      comment: fallback.comment 
    });
  }
});

// New endpoint for AI stats
app.get('/ai-stats', (req, res) => {
  const games = readJson('games.json', []);
  const aiGames = games.filter(game => game.playerO === 'AI');

  // Calculate win rates by difficulty and personality
  const stats = {};

  aiGames.forEach(game => {
    const { difficulty, personality, winner } = game;
    if (!difficulty || !personality) return;

    const key = `${difficulty}-${personality}`;
    if (!stats[key]) {
      stats[key] = { total: 0, wins: 0 };
    }
    stats[key].total++;
    if (winner === 'O') {
      stats[key].wins++;
    }
  });

  // Convert to array and calculate win rates
  const result = Object.entries(stats).map(([key, { total, wins }]) => {
    const [difficulty, personality] = key.split('-');
    return {
      difficulty,
      personality,
      winRate: total > 0 ? (wins / total * 100).toFixed(2) + '%' : '0%',
      totalGames: total,
    };
  });

  res.json(result);
});

// Endpoint to fetch all users
app.get('/users', (req, res) => {
  const users = readJson('users.json', []);
  res.json(users);
});

// Shop Endpoints
app.get('/user-data', (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const users = readJson('users.json', []);
  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Return user data with defaults if fields are missing
  res.json({
    coins: user.coins || 0,
    ownedBoards: user.ownedBoards || ['default'],
    selectedBoard: user.selectedBoard || '#334155'
  });
});

app.post('/update-coins', (req, res) => {
  const { username, coins } = req.body;
  if (!username || coins === undefined) {
    return res.status(400).json({ error: 'Username and coins are required' });
  }

  const users = readJson('users.json', []);
  const userIndex = users.findIndex(u => u.username === username);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Add coins to user's balance
  users[userIndex].coins = (users[userIndex].coins || 0) + coins;
  writeJson('users.json', users);
  res.json({ coins: users[userIndex].coins });
});

app.post('/purchase-board', (req, res) => {
  const { username, boardId, price } = req.body;
  if (!username || !boardId || price === undefined) {
    return res.status(400).json({ error: 'Username, boardId, and price are required' });
  }

  const users = readJson('users.json', []);
  const userIndex = users.findIndex(u => u.username === username);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const user = users[userIndex];
  if ((user.coins || 0) < price) {
    return res.status(400).json({ error: 'Not enough coins' });
  }

  // Deduct coins and add board to ownedBoards
  user.coins -= price;
  if (!user.ownedBoards) {
    user.ownedBoards = ['default'];
  }
  if (!user.ownedBoards.includes(boardId)) {
    user.ownedBoards.push(boardId);
  }
  writeJson('users.json', users);
  res.json({ 
    success: true, 
    coins: user.coins, 
    ownedBoards: user.ownedBoards 
  });
});

app.post('/equip-board', (req, res) => {
  const { username, boardId, color } = req.body;
  if (!username || !boardId || !color) {
    return res.status(400).json({ error: 'Username, boardId, and color are required' });
  }

  const users = readJson('users.json', []);
  const userIndex = users.findIndex(u => u.username === username);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const user = users[userIndex];
  if (!user.ownedBoards || !user.ownedBoards.includes(boardId)) {
    return res.status(400).json({ error: 'You do not own this board' });
  }

  user.selectedBoard = color;
  writeJson('users.json', users);
  res.json({ success: true, selectedBoard: color });
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

  // Initialize new user with coins, ownedBoards, and selectedBoard
  users.push({
    username,
    password,
    coins: 0,
    ownedBoards: ['default'],
    selectedBoard: '#334155'
  });
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