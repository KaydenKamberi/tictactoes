document.addEventListener('DOMContentLoaded', () => {
  const board = document.getElementById('game-board');

  // Create 9 cells for the Tic Tac Toe board
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;
    board.appendChild(cell);
  }
});