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
    
    // Skip if buttons are missing (shouldn't happen, but just in case)
    if (!buyBtn || !equipBtn) return;
    
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
      } else {
        buyBtn.disabled = false;
      }
    }

    // Add event listeners
    buyBtn.addEventListener('click', async () => {
      console.log('Attempting to purchase board:', boardId, 'for', price, 'coins');
      
      try {
        const response = await fetch('/purchase-board', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ 
            username: username, 
            boardId: boardId, 
            price: price 
          })
        });

        const result = await response.json();
        
        if (response.ok) {
          // Update UI on success
          userCoinsDisplay.textContent = result.coins;
          buyBtn.style.display = 'none';
          equipBtn.style.display = 'inline-block';
          equipBtn.textContent = 'Equip';
          equipBtn.disabled = false;
          
          // Refresh user data to update other buttons
          const updatedUserData = await fetch(`/user-data?username=${username}`).then(res => res.json());
          userData.ownedBoards = updatedUserData.ownedBoards;
          userData.coins = updatedUserData.coins;
          
          // Re-enable/disable other buy buttons based on new coin balance
          shopItems.forEach(item => {
            const otherBuyBtn = item.querySelector('.buy-btn');
            if (otherBuyBtn) {
              const otherPrice = parseInt(otherBuyBtn.dataset.price);
              otherBuyBtn.disabled = (userData.coins || 0) < otherPrice;
            }
          });
          
        } else {
          console.error('Purchase failed:', result.error);
          alert(result.error || 'Failed to purchase board');
        }
      } catch (error) {
        console.error('Error during purchase:', error);
        alert('An error occurred. Check console for details.');
      }
    });

    equipBtn.addEventListener('click', async () => {
      try {
        const response = await fetch('/equip-board', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ 
            username: username, 
            boardId: boardId, 
            color: color 
          })
        });

        const result = await response.json();
        
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
          console.error('Equip failed:', result.error);
          alert(result.error || 'Failed to equip board');
        }
      } catch (error) {
        console.error('Error during equip:', error);
        alert('An error occurred. Check console for details.');
      }
    });
  });
});