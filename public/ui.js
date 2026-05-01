// DOM Elements
const cells = document.querySelectorAll('.cell');
const statusDisplay = document.getElementById('status');
const restartButton = document.getElementById('restart');
const gameBoard = document.getElementById('game-board');

// Initialize the game board
function initBoard() {
  gameBoard.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;
    cell.addEventListener('click', handleCellClick);
    gameBoard.appendChild(cell);
  }
}

// Handle cell click
function handleCellClick(e) {
  const index = parseInt(e.target.dataset.index);
  if (board[index] !== '' || !gameActive) return;

  // Update board state
  board[index] = currentPlayer;
  e.target.textContent = currentPlayer;
  e.target.classList.add(currentPlayer.toLowerCase());

  // Check for win
  const winIndices = checkWin();
  if (winIndices) {
    winIndices.forEach(idx => {
      cells[idx].classList.add('winning-cell');
    });
    statusDisplay.textContent = `Player ${currentPlayer} wins!`;
    gameActive = false;
    return;
  }

  // Check for draw
  if (checkDraw()) {
    statusDisplay.textContent = "It's a draw!";
    gameActive = false;
    return;
  }

  // Switch player
  switchPlayer();
  statusDisplay.textContent = `Player ${currentPlayer}'s turn`;
}

// Restart game
function restartGame() {
  resetGame();
  initBoard();
  statusDisplay.textContent = `Player ${currentPlayer}'s turn`;
  document.querySelectorAll('.cell').forEach(cell => {
    cell.classList.remove('winning-cell', 'x', 'o');
  });
}

// Event Listeners
restartButton.addEventListener('click', restartGame);

// Initialize the game
initBoard();
statusDisplay.textContent = `Player ${currentPlayer}'s turn`;