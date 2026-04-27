// Placeholder for server.js
const express = require('express');
const session = require('express-session');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

app.get('/', (req, res) => {
  res.send('Tic Tac Toe AI');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});