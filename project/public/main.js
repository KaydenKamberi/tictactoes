// Frontend entry point for Tic Tac Toe AI
console.log('Tic Tac Toe AI loaded');
document.addEventListener('DOMContentLoaded', () => {
  const authContainer = document.getElementById('auth-container');
  const userInfo = document.getElementById('user-info');
  const currentUserSpan = document.getElementById('current-user');

  // Check session on load
  fetch('/me')
    .then(res => res.json())
    .then(data => {
      if (data.user) {
        showLoggedIn(data.user);
      }
    });

  function showLoggedIn(username) {
    authContainer.style.display = 'none';
    userInfo.style.display = 'block';
    currentUserSpan.textContent = username;
  }

  function showLoggedOut() {
    authContainer.style.display = 'block';
    userInfo.style.display = 'none';
    currentUserSpan.textContent = '';
  }

  // Register
  document.getElementById('reg-btn').addEventListener('click', async () => {
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;

    const res = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok) {
      showLoggedIn(data.user);
    } else {
      alert(data.error);
    }
  });

  // Login
  document.getElementById('login-btn').addEventListener('click', async () => {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (res.ok) {
      showLoggedIn(data.user);
    } else {
      alert(data.error);
    }
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/logout', { method: 'POST' });
    showLoggedOut();
  });

  // Game Board Initialization
  const board = document.getElementById('game-board');
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;
    board.appendChild(cell);
  }
});