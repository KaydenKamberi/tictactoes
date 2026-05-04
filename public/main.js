// Wait for the DOM to fully load before running the script
document.addEventListener('DOMContentLoaded', () => {
  // --- 1. DOM ELEMENTS ---
  // Auth containers
  const authContainer = document.getElementById('auth-container');
  const userInfo = document.getElementById('user-info');
  const currentUserSpan = document.getElementById('current-user');

  // Game elements
  const gameSection = document.getElementById('game-section');
  const board = document.getElementById('game-board');

  // Input fields and buttons
  const regUsernameInput = document.getElementById('reg-username');
  const regPasswordInput = document.getElementById('reg-password');
  const regBtn = document.getElementById('reg-btn');

  const loginUsernameInput = document.getElementById('login-username');
  const loginPasswordInput = document.getElementById('login-password');
  const loginBtn = document.getElementById('login-btn');

  const logoutBtn = document.getElementById('logout-btn');
  const checkpointsLink = document.getElementById('checkpoints-link');
  const turnIndicator = document.getElementById('turn-indicator');
  const scoreXSpan = document.getElementById('score-x');
  const scoreOSpan = document.getElementById('score-o');
  const playAgainBtn = document.getElementById('play-again-btn');

  // --- CP05: Save Game Data ---
  // Save game result to history
  function saveGameToHistory(winner, moves) {
    const gameData = {
      playerX: currentUserSpan.textContent || 'Player X',
      playerO: 'CPU', // Replace with actual opponent if multiplayer
      winner: winner || null, // 'X', 'O', or null for draw
      date: new Date().toISOString()
    };

    // Send only the new game data to the backend
    fetch('/save-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gameData)
    })
    .catch(err => console.error('Failed to save game:', err));
  }

  // --- 2. INITIAL SESSION CHECK ---
  // When the page loads, ask the server if we are already logged in
  fetch('/me')
    .then(res => res.json())
    .then(data => {
      if (data.user) {
        showLoggedIn(data.user);
      } else {
        showLoggedOut();
      }
    })
    .catch(err => console.error('Session check failed:', err));

  // --- 3. UI TOGGLE FUNCTIONS ---
  function showLoggedIn(username) {
    authContainer.style.display = 'none'; // Hide login/register cards
    userInfo.style.display = 'block';     // Show "Logged in as..."
    gameSection.style.display = 'block';  // Show the game section (Header + Board)
    currentUserSpan.textContent = username;
    // HIDE the checkpoints link when logged in
    checkpointsLink.style.display = 'none';

    currentUserSpan.textContent = username;
  }

  function showLoggedOut() {
    authContainer.style.display = 'grid';  // Show login/register cards
    userInfo.style.display = 'none';      // Hide "Logged in as..."
    gameSection.style.display = 'none';   // Hide the game section
    currentUserSpan.textContent = '';
    // SHOW the checkpoints link when logged out
    checkpointsLink.style.display = 'inline-block';

    currentUserSpan.textContent = '';
  }

  // --- 4. AUTHENTICATION LOGIC ---

  // Register New User
  regBtn.addEventListener('click', async () => {
    const username = regUsernameInput.value;
    const password = regPasswordInput.value;

    const res = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok) {
      showLoggedIn(data.user);
    } else {
      alert(data.error || 'Registration failed');
    }
  });

  // Login Existing User
  loginBtn.addEventListener('click', async () => {
    const username = loginUsernameInput.value;
    const password = loginPasswordInput.value;

    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok) {
      showLoggedIn(data.user);
    } else {
      alert(data.error || 'Login failed');
    }
  });

  // Logout User
  logoutBtn.addEventListener('click', async () => {
    const res = await fetch('/logout', { method: 'POST' });
    if (res.ok) {
      showLoggedOut();
    }
  });

  // --- 5. GAME BOARD INITIALIZATION ---
  // This builds the grid cells once when the script runs
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;
    // Add the event listener here!
    cell.addEventListener('click', handleCellClick); 
    board.appendChild(cell);
  }
  let currentPlayer = 'X';
  let boardState = ['', '', '', '', '', '', '', '', ''];
  let gameActive = true;
  let scoreX = 0;
  let scoreO = 0;
  const winningConditions = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  function handleCellClick(event) {
    const clickedCell = event.target;
    const cellIndex = parseInt(clickedCell.dataset.index);

    if (boardState[cellIndex] !== '' || !gameActive) {
      return;
    }

    // 1. Update internal state and UI
    boardState[cellIndex] = currentPlayer;
    clickedCell.textContent = currentPlayer;

    // 2. CHECK FOR WIN OR DRAW HERE
    checkWinOrDraw();

    // 3. If the game ended, stop running this function
    if (!gameActive) {
      return; 
    }

    // 4. Otherwise, switch turns
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    turnIndicator.textContent = `Player ${currentPlayer}'s turn`;
  }

  // --- 7. WIN/DRAW DETECTION ---
  function checkWinOrDraw() {
    let roundWon = false;

    // Loop through all 8 winning combinations
    for (let i = 0; i < winningConditions.length; i++) {
      const winCondition = winningConditions[i];
      const a = boardState[winCondition[0]];
      const b = boardState[winCondition[1]];
      const c = boardState[winCondition[2]];

      // If any of the three cells in the line are empty, no one has won this line yet
      if (a === '' || b === '' || c === '') {
        continue;
      }

      // If all three cells match, we have a winner!
      if (a === b && b === c) {
        roundWon = true;
        break;
      }
    }

    if (roundWon) {
      turnIndicator.textContent = `Player ${currentPlayer} Wins!`;
      gameActive = false; 

      // NEW: Update the score
      if (currentPlayer === 'X') {
        scoreX++;
        scoreXSpan.textContent = scoreX;
      } else {
        scoreO++;
        scoreOSpan.textContent = scoreO;
      }

      // CP05: Save the game result
      saveGameToHistory(currentPlayer, [...boardState]);

      // NEW: Show the Play Again button
      playAgainBtn.style.display = 'inline-block';
      return;
    }

    // Check for a draw
    const roundDraw = !boardState.includes('');
    if (roundDraw) {
      turnIndicator.textContent = "It's a Draw!";
      gameActive = false;

      // CP05: Save the game result (draw)
      saveGameToHistory(null, [...boardState]);

      // NEW: Show the Play Again button
      playAgainBtn.style.display = 'inline-block';
      return;
    }
  }

  function resetBoard() {
    // Reset state variables
    boardState = ['', '', '', '', '', '', '', '', ''];
    gameActive = true;
    currentPlayer = 'X'; // X always starts the new round

    // Reset UI elements
    turnIndicator.textContent = `Player ${currentPlayer}'s turn`;
    playAgainBtn.style.display = 'none';

    // Clear all the visual X's and O's from the grid
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
      cell.textContent = '';
    });
  }

  // Attach the click listener to the button
  playAgainBtn.addEventListener('click', resetBoard);
});