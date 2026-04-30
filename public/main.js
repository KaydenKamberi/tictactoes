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
    const checkpointsLink = document.getElementById('checkpoints-link'); // Add this line
    const turnIndicator = document.getElementById('turn-indicator');

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
      .catch(err => console.error("Session check failed:", err));

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
        alert(data.error || "Registration failed");
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
        alert(data.error || "Login failed");
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
    function handleCellClick(event) {
      const clickedCell = event.target;
      const cellIndex = parseInt(clickedCell.dataset.index);

      // Prevent action if the cell is already clicked or game is paused/over
      if (boardState[cellIndex] !== '' || !gameActive) {
        return;
      }

      // 1. Update internal state
      boardState[cellIndex] = currentPlayer;

      // 2. Update the UI
      clickedCell.textContent = currentPlayer;

      // 3. Switch turns
      currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
      turnIndicator.textContent = `Player ${currentPlayer}'s turn`;
    }
  });