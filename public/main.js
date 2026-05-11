// Wait for the DOM to fully load before running the script
document.addEventListener('DOMContentLoaded', () => {
  // --- 1. DOM ELEMENTS ---
  // Auth containers
  const authContainer = document.getElementById('auth-container');
  const userInfo = document.getElementById('user-info');
  const currentUserSpan = document.getElementById('current-user');
  const userCoinsSpan = document.getElementById('user-coins');

  // Game elements
  const gameSection = document.getElementById('game-section');
  const board = document.getElementById('game-board');
  const gameModeSelector = document.getElementById('game-mode');
  const playerOLabel = document.getElementById('player-o-label');
  
  // Board Settings
  const boardColorSelector = document.getElementById('board-color');
  const shopLink = document.getElementById('shop-link');

  // CP07: AI Settings
  const aiSettings = document.getElementById('ai-settings');
  const difficultySelector = document.getElementById('difficulty');
  const personalitySelector = document.getElementById('personality');
  const aiComment = document.getElementById('ai-comment');

  // CP09: Time Trial Mode
  const timeTrialToggle = document.getElementById('time-trial-toggle');
  const timerDisplay = document.getElementById('timer-display');
  const timerValue = document.getElementById('timer-value');

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

  // --- CP09: Time Trial Mode Variables ---
  let timeTrialMode = false;
  let timer;
  let timeLeft = 5;

  // --- Shop Variables ---
  let currentUser = null;

  // --- Helper Functions ---
  async function fetchUserData(username) {
    const response = await fetch(`/user-data?username=${username}`);
    if (!response.ok) {
      console.error('Failed to fetch user data');
      return { coins: 0, ownedBoards: ['default'], selectedBoard: '#334155' };
    }
    return await response.json();
  }

  async function updateUserCoins(username, coins) {
    const response = await fetch('/update-coins', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, coins })
    });
    if (response.ok) {
      const userData = await response.json();
      userCoinsSpan.textContent = userData.coins;
      return userData.coins;
    }
    return null;
  }

  function applyBoardColor(color) {
    document.documentElement.style.setProperty('--board-color', color);
    // For cells, use a slightly darker shade for contrast
    if (color.startsWith('linear-gradient')) {
      document.documentElement.style.setProperty('--cell-color', '#1e293b');
    } else {
      // Darken the color for cells
      const cellColor = shadeColor(color, -20);
      document.documentElement.style.setProperty('--cell-color', cellColor);
    }
  }

  // Helper function to darken a color
  function shadeColor(color, percent) {
    let R = parseInt(color.substring(1,3), 16);
    let G = parseInt(color.substring(3,5), 16);
    let B = parseInt(color.substring(5,7), 16);
    
    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);
    
    R = (R<255)?R:255;
    G = (G<255)?G:255;
    B = (B<255)?B:255;
    
    R = Math.round(R);
    G = Math.round(G);
    B = Math.round(B);
    
    const RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
    const GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
    const BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));
    
    return "#" + RR + GG + BB;
  }

  // --- CP05: Save Game Data ---
  // Save game result to history
  async function saveGameToHistory(winner) {
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

      // Award coins if the player beat the AI
      if (winner === 'X') { // Player X (human) won
        const difficulty = difficultySelector.value;
        let coinsEarned = 0;
        switch (difficulty) {
          case 'Easy': coinsEarned = 10; break;
          case 'Medium': coinsEarned = 15; break;
          case 'Hard': coinsEarned = 20; break;
        }
        if (coinsEarned > 0 && currentUser) {
          await updateUserCoins(currentUser, coinsEarned);
        }
      }
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

  // --- CP09: Time Trial Mode Functions ---
  function startTimer() {
    clearTimer();
    timeLeft = 5;
    timerValue.textContent = timeLeft;
    timerDisplay.style.display = 'block';
    timer = setInterval(() => {
      timeLeft--;
      timerValue.textContent = timeLeft;
      if (timeLeft <= 0) {
        clearTimer();
        // Current player loses, opposite player wins
        const winner = currentPlayer === 'X' ? 'O' : 'X';
        const gameMode = gameModeSelector.value;
        const winnerLabel = gameMode === 'pvai' && winner === 'O' ? 'AI' : `Player ${winner}`;
        turnIndicator.textContent = `Time's up! ${winnerLabel} wins!`;
        gameActive = false;

        // Update scores
        if (winner === 'X') {
          scoreX++;
          scoreXSpan.textContent = scoreX;
        } else {
          scoreO++;
          scoreOSpan.textContent = scoreO;
        }

        saveGameToHistory(winner);
        playAgainBtn.style.display = 'inline-block';
      }
    }, 1000);
  }

  function clearTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    timerDisplay.style.display = 'none';
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
    .then(async (data) => {
      if (data.user) {
        currentUser = data.user;
        await showLoggedIn(data.user);
      } else {
        showLoggedOut();
      }
    })
    .catch(err => console.error('Session check failed:', err));

  // --- 3. UI TOGGLE FUNCTIONS ---
  async function showLoggedIn(username) {
    authContainer.style.display = 'none';
    userInfo.style.display = 'block';
    gameSection.style.display = 'block';
    currentUserSpan.textContent = username;
    checkpointsLink.style.display = 'none';
    leaderboardLink.style.display = 'inline-block';
    shopLink.style.display = 'inline-block';
    updatePlayerOLabel();
    clearTimer();

    // Fetch user data (coins, owned boards, selected board)
    const userData = await fetchUserData(username);
    userCoinsSpan.textContent = userData.coins || 0;
    
    // Populate board color selector
    boardColorSelector.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = '#334155';
    defaultOption.textContent = 'Default';
    boardColorSelector.appendChild(defaultOption);

    // Add owned boards to the selector
    const boardColors = {
      'red': '#ef4444',
      'green': '#22c55e',
      'blue': '#3b82f6',
      'purple': '#a855f7',
      'orange': '#f97316',
      'rainbow': 'linear-gradient(45deg, #ef4444, #f97316, #fbbf24, #22c55e, #3b82f6, #a855f7)',
      'gold': '#fbbf24'
    };

    const boardNames = {
      'red': 'Red',
      'green': 'Green',
      'blue': 'Blue',
      'purple': 'Purple',
      'orange': 'Orange',
      'rainbow': 'Rainbow',
      'gold': 'Gold Shiny'
    };

    userData.ownedBoards.forEach(boardId => {
      if (boardId !== 'default' && boardColors[boardId]) {
        const option = document.createElement('option');
        option.value = boardColors[boardId];
        option.textContent = boardNames[boardId] || boardId;
        boardColorSelector.appendChild(option);
      }
    });

    // Set selected board
    if (userData.selectedBoard) {
      const selectedOption = boardColorSelector.querySelector(`option[value="${userData.selectedBoard}"]`);
      if (selectedOption) {
        selectedOption.selected = true;
        applyBoardColor(userData.selectedBoard);
      }
    }

    // Apply board color change listener
    boardColorSelector.addEventListener('change', () => {
      const selectedColor = boardColorSelector.value;
      applyBoardColor(selectedColor);
      // Save the selected board to user data
      fetch('/equip-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: currentUser,
          boardId: Object.keys(boardColors).find(key => boardColors[key] === selectedColor) || 'default',
          color: selectedColor
        })
      });
    });
  }

  function showLoggedOut() {
    authContainer.style.display = 'grid';
    userInfo.style.display = 'none';
    gameSection.style.display = 'none';
    currentUserSpan.textContent = '';
    userCoinsSpan.textContent = '0';
    checkpointsLink.style.display = 'inline-block';
    leaderboardLink.style.display = 'inline-block';
    shopLink.style.display = 'none';
    clearTimer();
    currentUser = null;
  }

  function updatePlayerOLabel() {
    const gameMode = gameModeSelector.value;
    playerOLabel.textContent = gameMode === 'pvai' ? 'AI' : 'Player O';
    
    // CP07: Show AI settings only in PvAI mode
    aiSettings.style.display = gameMode === 'pvai' ? 'flex' : 'none';
  }

  // --- CP09: Time Trial Mode Toggle ---
  timeTrialToggle.addEventListener('change', () => {
    timeTrialMode = timeTrialToggle.checked;
    if (timeTrialMode && gameActive) {
      startTimer();
    } else {
      clearTimer();
    }
  });

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
      currentUser = data.user;
      await showLoggedIn(data.user);
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
      currentUser = data.user;
      await showLoggedIn(data.user);
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

    // Reset timer on move
    if (timeTrialMode) {
      clearTimer();
    }

    // Human move (X or O in PvP, X in PvAI)
    boardState[cellIndex] = currentPlayer;
    clickedCell.textContent = currentPlayer;
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
        if (timeTrialMode) {
          startTimer(); // Restart timer for Player X
        }
      }
    } else if (timeTrialMode) {
      startTimer(); // Restart timer for next player
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
    clearTimer();
    if (timeTrialMode) {
      startTimer();
    }
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
      cell.textContent = '';
    });
  }

  playAgainBtn.addEventListener('click', resetBoard);
});