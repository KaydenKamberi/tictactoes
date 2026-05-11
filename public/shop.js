// Shop logic for Tic Tac Toe

document.addEventListener('DOMContentLoaded', async () => {
  const userCoinsDisplay = document.getElementById('user-coins');
  const shopItems = document.querySelectorAll('.shop-item');

  // Fetch current user from session
  const meResponse = await fetch('/me');
  const meData = await meResponse.json();
  const username = meData.user;

  if (!username) {
    // Redirect to home if not logged in
    window.location.href = '/';
    return;
  }

  // Fetch user data (coins, owned boards, selected board)
  const userDataResponse = await fetch(`/user-data?username=${username}`);
  const userData = await userDataResponse.json();

  // Update coin display
  userCoinsDisplay.textContent = userData.coins || 0;

  // Process each shop item
  shopItems.forEach(item => {
    const buyBtn = item.querySelector('.buy-btn');
    const equipBtn = item.querySelector('.equip-btn');
    const boardId = buyBtn.dataset.boardId;
    const price = parseInt(buyBtn.dataset.price);
    const color = buyBtn.dataset.color;

    // Check if user owns this board
    const isOwned = userData.ownedBoards && userData.ownedBoards.includes(boardId);
    const isSelected = userData.selectedBoard === color;

    if (isOwned) {
      buyBtn.style.display = 'none';
      equipBtn.style.display = 'inline-block';
      if (isSelected) {
        equipBtn.textContent = 'Equipped';
        equipBtn.disabled = true;
        item.classList.add('shop-item-equipped');
      } else {
        equipBtn.textContent = 'Equip';
        equipBtn.disabled = false;
      }
    } else {
      buyBtn.style.display = 'inline-block';
      equipBtn.style.display = 'none';
      
      // Disable buy button if not enough coins
      if ((userData.coins || 0) < price) {
        buyBtn.disabled = true;
      }
    }

    // Add event listeners
    buyBtn.addEventListener('click', async () => {
      const response = await fetch('/purchase-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, boardId, price })
      });

      if (response.ok) {
        const result = await response.json();
        userCoinsDisplay.textContent = result.coins;
        buyBtn.style.display = 'none';
        equipBtn.style.display = 'inline-block';
        equipBtn.textContent = 'Equip';
        equipBtn.disabled = false;
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to purchase board');
      }
    });

    equipBtn.addEventListener('click', async () => {
      const response = await fetch('/equip-board', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, boardId, color })
      });

      if (response.ok) {
        // Update all equip buttons to show "Equip" and enable them
        document.querySelectorAll('.equip-btn').forEach(btn => {
          btn.textContent = 'Equip';
          btn.disabled = false;
        });
        
        // Mark this one as equipped
        equipBtn.textContent = 'Equipped';
        equipBtn.disabled = true;
        
        // Update all shop items to reflect equipped state
        document.querySelectorAll('.shop-item').forEach(item => {
          item.classList.remove('shop-item-equipped');
        });
        item.classList.add('shop-item-equipped');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to equip board');
      }
    });
  });
});