// Game state
let board = ['', '', '', '', '', '', '', '', ''];
let currentPlayer = 'X';
let gameActive = true;

// Winning conditions
const winConditions = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

// Check for win
function checkWin() {
  for (let condition of winConditions) {
    const [a, b, c] = condition;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return condition; // Return winning indices
    }
  }
  return null;
}

// Check for draw
function checkDraw() {
  return !board.includes('') && !checkWin();
}

// Switch player
function switchPlayer() {
  currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
}

// Reset game state
function resetGame() {
  board = ['', '', '', '', '', '', '', '', ''];
  currentPlayer = 'X';
  gameActive = true;
}

// Get current game state
function getGameState() {
  return {
    board: [...board],
    currentPlayer,
    gameActive,
  };
}