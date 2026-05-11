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
  const gameModeSelector = document.getElementById('game-mode');
  const playerOLabel = document.getElementById('player-o-label');
  
  // CP07: AI Settings
  const aiSettings = document.getElementById('ai-settings');
  const difficultySelector = document.getElementById('difficulty');
  const personalitySelector = document.getElementById('personality');
  const aiComment = document.getElementById('ai-comment');

  // Input fields and buttons
  const regUsernameInput = document.getElementById('reg-username');
  const regPasswordInput = document.getElementById('reg-password');
  const regBtn = document.getElementById('reg-btn');

  const loginUsernameInput = document.getElementById('login-username');
  const loginPasswordInput = document.getElementById('login-password');
  const loginBtn = document.getElementById('login-btn');

  const logoutBtn = document.getElementById('logout-btn');
  const checkpointsLink = document.getElementById('checkpoints-link');
  const leaderboardLink = document.getElementById('leaderboard-link');
  const turnIndicator = document.getElementById('turn-indicator');
  const scoreXSpan = document.getElementById('score-x');
  const scoreOSpan = document.getElementById('score-o');
  const playAgainBtn = document.getElementById('play-again-btn');

  // --- CP05: Save Game Data ---
  // Save game result to history
  function saveGameToHistory(winner) {
    const gameMode = gameModeSelector.value;
    const playerO = gameMode === 'pvai' ? 'AI' : 'Player 2';

    const gameData = {
      playerX: currentUserSpan.textContent || 'Player X',
      playerO: playerO,
      winner: winner || null, // 'X', 'O', or null for draw
      date: new Date().toISOString()
    };

    // Include difficulty and personality for AI games
    if (gameMode === 'pvai') {
      gameData.difficulty = difficultySelector.value;
      gameData.personality = personalitySelector.value;
    }

    console.log('Saving game data:', gameData);

    // Send the game data to the backend
    fetch('/save-game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gameData)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Game saved successfully:', data);
    })
    .catch(err => {
      console.error('Failed to save game:', err);
    });
  }

  // --- Groq API Integration via Backend ---
  // CP07: Updated to include difficulty and personality
  async function getAIMove(boardState) {
    const difficulty = difficultySelector.value;
    const personality = personalitySelector.value;
    
    try {
      const response = await fetch('/get-ai-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          boardState,
          difficulty,
          personality
        })
      });

      const data = await response.json();
      
      // Display AI comment if available
      if (data.comment) {
        aiComment.textContent = data.comment;
      }
      
      return data.moveIndex;
    } catch (error) {
      console.error('Error calling backend for AI move:', error);
      // Fallback: Random move
      const emptyIndices = boardState.map((cell, index) => cell === '' ? index : null).filter(val => val !== null);
      return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
    }
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
    authContainer.style.display = 'none';
    userInfo.style.display = 'block';
    gameSection.style.display = 'block';
    currentUserSpan.textContent = username;
    checkpointsLink.style.display = 'none';
    leaderboardLink.style.display = 'inline-block';
    updatePlayerOLabel();
  }

  function showLoggedOut() {
    authContainer.style.display = 'grid';
    userInfo.style.display = 'none';
    gameSection.style.display = 'none';
    currentUserSpan.textContent = '';
    checkpointsLink.style.display = 'inline-block';
    leaderboardLink.style.display = 'inline-block';
  }

  function updatePlayerOLabel() {
    const gameMode = gameModeSelector.value;
    playerOLabel.textContent = gameMode === 'pvai' ? 'AI' : 'Player O';
    
    // CP07: Show AI settings only in PvAI mode
    aiSettings.style.display = gameMode === 'pvai' ? 'flex' : 'none';
  }

  // --- 4. AUTHENTICATION LOGIC ---
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

  logoutBtn.addEventListener('click', async () => {
    const res = await fetch('/logout', { method: 'POST' });
    if (res.ok) {
      showLoggedOut();
    }
  });

  // --- 5. GAME BOARD INITIALIZATION ---
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;
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

  // --- 6. GAME MODE SELECTOR ---
  gameModeSelector.addEventListener('change', updatePlayerOLabel);

  // --- 7. HANDLE CELL CLICK ---
  async function handleCellClick(event) {
    const clickedCell = event.target;
    const cellIndex = parseInt(clickedCell.dataset.index);
    const gameMode = gameModeSelector.value;

    if (boardState[cellIndex] !== '' || !gameActive) {
      return;
    }

    // Human move (X or O in PvP, X in PvAI)
    boardState[cellIndex] = currentPlayer;
    clickedCell.textContent = currentPlayer;

    // Clear AI comment on new move
    aiComment.textContent = '';

    checkWinOrDraw();
    if (!gameActive) {
      return;
    }

    // Switch player
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';

    if (gameMode === 'pvai' && currentPlayer === 'O') {
      // AI's turn
      turnIndicator.textContent = "AI is thinking...";
      const aiMoveIndex = await getAIMove(boardState);

      if (aiMoveIndex >= 0 && aiMoveIndex <= 8 && boardState[aiMoveIndex] === '') {
        boardState[aiMoveIndex] = 'O';
        document.querySelector(`[data-index="${aiMoveIndex}"]`).textContent = 'O';
        checkWinOrDraw();
      }
      currentPlayer = 'X';
      if (gameActive) {
        turnIndicator.textContent = "Player X's turn";
      }
    } else {
      // PvP mode: Update turn indicator
      turnIndicator.textContent = `Player ${currentPlayer}'s turn`;
    }
  }

  // --- 8. WIN/DRAW DETECTION ---
  function checkWinOrDraw() {
    let roundWon = false;

    for (let i = 0; i < winningConditions.length; i++) {
      const winCondition = winningConditions[i];
      const a = boardState[winCondition[0]];
      const b = boardState[winCondition[1]];
      const c = boardState[winCondition[2]];

      if (a === '' || b === '' || c === '') {
        continue;
      }

      if (a === b && b === c) {
        roundWon = true;
        break;
      }
    }

    if (roundWon) {
      const gameMode = gameModeSelector.value;
      const winnerLabel = gameMode === 'pvai' && currentPlayer === 'O' ? 'AI' : `Player ${currentPlayer}`;
      turnIndicator.textContent = `${winnerLabel} Wins!`;
      gameActive = false;

      if (currentPlayer === 'X') {
        scoreX++;
        scoreXSpan.textContent = scoreX;
      } else {
        scoreO++;
        scoreOSpan.textContent = scoreO;
      }

      saveGameToHistory(currentPlayer);
      playAgainBtn.style.display = 'inline-block';
      return;
    }

    const roundDraw = !boardState.includes('');
    if (roundDraw) {
      turnIndicator.textContent = "It's a Draw!";
      gameActive = false;

      saveGameToHistory(null);
      playAgainBtn.style.display = 'inline-block';
      return;
    }
  }

  function resetBoard() {
    boardState = ['', '', '', '', '', '', '', '', ''];
    gameActive = true;
    currentPlayer = 'X';
    turnIndicator.textContent = `Player ${currentPlayer}'s turn`;
    playAgainBtn.style.display = 'none';
    aiComment.textContent = '';

    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
      cell.textContent = '';
    });
  }

  playAgainBtn.addEventListener('click', resetBoard);
});