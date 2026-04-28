const express = require('express');
const session = require('express-session');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Path to our users database
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'tic-tac-toe-secret',
  resave: false,
  saveUninitialized: false, // Changed to false so we only save sessions for logged-in users
}));

// Helper function to read users
const getUsers = () => {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

// Helper function to save users
const saveUsers = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

// --- AUTH ROUTES ---

// Register
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();

  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const newUser = { username, password }; // Storing plaintext per project brief
  users.push(newUser);
  saveUsers(users);

  req.session.user = newUser;
  res.json({ message: 'Registration successful', user: newUser.username });
});

// Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const users = getUsers();

  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  req.session.user = user;
  res.json({ message: 'Login successful', user: user.username });
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

// Check current session
app.get('/me', (req, res) => {
  if (req.session.user) {
    res.json({ user: req.session.user.username });
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});

// --- MAIN ROUTE ---

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});