// Placeholder for script.js
const gameBoard = document.getElementById('game-board');

// Initialize the game board
for (let i = 0; i < 9; i++) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  cell.textContent = '';
  gameBoard.appendChild(cell);
}