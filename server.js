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

// CP07: Updated endpoint to get AI move with difficulty and personality
app.post('/get-ai-move', async (req, res) => {
  const { boardState, difficulty, personality } = req.body;
  const apiUrl = 'https://api.groq.com/v1/chat/completions';

  // Fallback function for invalid moves or JSON errors
  function getFallbackMove() {
    const emptyIndices = boardState.map((cell, index) => cell === '' ? index : null).filter(val => val !== null);
    const randomMove = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    
    // Generate fallback comment based on personality
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

  // If Groq API key is not set, use fallback
  if (!GROQ_API_KEY) {
    console.error('Groq API key is not set in environment variables.');
    const fallback = getFallbackMove();
    return res.json({ moveIndex: fallback.move, comment: fallback.comment });
  }

  // Construct dynamic prompt based on difficulty and personality
  let systemPrompt = '';
  
  // Difficulty-based instructions
  switch (difficulty) {
    case 'Easy':
      systemPrompt += 'You are playing Tic Tac Toe as "O" on EASY difficulty. ';
      systemPrompt += 'Make obvious mistakes or pick random open spots. ';
      break;
    case 'Medium':
      systemPrompt += 'You are playing Tic Tac Toe as "O" on MEDIUM difficulty. ';
      systemPrompt += 'Play decently but miss complex traps. ';
      break;
    case 'Hard':
      systemPrompt += 'You are playing Tic Tac Toe as "O" on HARD difficulty. ';
      systemPrompt += 'Play perfectly like the Minimax algorithm. ';
      break;
    default:
      systemPrompt += 'You are playing Tic Tac Toe as "O". ';
  }

  // Personality-based instructions
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

  // Final instructions for output format
  systemPrompt += `Given the current board state: [${boardState.map(cell => cell || ' ').join(', ')}], `;
  systemPrompt += 'return a JSON object with the move index (0-8) and a comment. ';
  systemPrompt += 'The JSON must be in this exact format: {"move": <integer 0-8>, "comment": "<string>"}. ';
  systemPrompt += 'Do NOT include any other text or explanations.';

  const requestBody = {
    model: 'llama3-8b-8192',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Make your move.' }
    ],
    temperature: 0.1,
    max_tokens: 100,
    response_format: { type: 'json_object' } // Use Groq's JSON mode
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

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Parse the JSON response from the LLM
    let moveData;
    try {
      // The response should already be JSON due to response_format
      const responseContent = data.choices[0].message.content.trim();
      moveData = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse LLM response as JSON:', parseError);
      throw parseError;
    }

    // Validate the move
    if (
      typeof moveData.move !== 'number' ||
      moveData.move < 0 ||
      moveData.move > 8 ||
      boardState[moveData.move] !== ''
    ) {
      console.error('Invalid move from LLM:', moveData.move);
      throw new Error('Invalid move');
    }

    // Return the move and comment
    res.json({ 
      moveIndex: moveData.move, 
      comment: moveData.comment || "AI made a move." 
    });

  } catch (error) {
    console.error('Error calling Groq API or processing response:', error);
    
    // Use fallback mechanism
    const fallback = getFallbackMove();
    res.json({ 
      moveIndex: fallback.move, 
      comment: fallback.comment 
    });
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