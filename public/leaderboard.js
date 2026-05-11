// Leaderboard logic for Tic Tac Toe

document.addEventListener('DOMContentLoaded', async () => {
  const playerLeaderboardBody = document.getElementById('player-leaderboard-body');
  const aiLeaderboardBody = document.getElementById('ai-leaderboard-body');

  // Fetch all games and users
  const [gamesResponse, usersResponse] = await Promise.all([
    fetch('/games'),
    fetch('/users')
  ]);

  const games = await gamesResponse.json();
  const users = await usersResponse.json();

  // --- Calculate Player Stats ---
  const playerStats = {};

  // Initialize all users with 0 stats
  users.forEach(user => {
    playerStats[user.username] = {
      wins: 0,
      losses: 0,
      draws: 0
    };
  });

  // Process each game
  games.forEach(game => {
    const { playerX, playerO, winner } = game;

    // Update stats for playerX
    if (!playerStats[playerX]) {
      playerStats[playerX] = { wins: 0, losses: 0, draws: 0 };
    }

    // Update stats for playerO (if not AI)
    if (playerO !== 'AI' && !playerStats[playerO]) {
      playerStats[playerO] = { wins: 0, losses: 0, draws: 0 };
    }

    if (winner === 'X') {
      playerStats[playerX].wins++;
      if (playerO !== 'AI') {
        playerStats[playerO].losses++;
      }
    } else if (winner === 'O') {
      playerStats[playerX].losses++;
      if (playerO !== 'AI') {
        playerStats[playerO].wins++;
      }
    } else {
      // Draw
      playerStats[playerX].draws++;
      if (playerO !== 'AI') {
        playerStats[playerO].draws++;
      }
    }
  });

  // Calculate win rates and sort players
  const playerLeaderboard = Object.entries(playerStats)
    .map(([username, stats]) => {
      const totalGames = stats.wins + stats.losses + stats.draws;
      const winRate = totalGames > 0 ? ((stats.wins / totalGames) * 100).toFixed(2) + '%' : '0%';
      return { username, ...stats, winRate, totalGames };
    })
    .filter(player => player.totalGames > 0) // Only show players with games
    .sort((a, b) => {
      // Sort by win rate (descending), then by total games (descending)
      const winRateA = parseFloat(a.winRate);
      const winRateB = parseFloat(b.winRate);
      if (winRateA !== winRateB) {
        return winRateB - winRateA;
      }
      return b.totalGames - a.totalGames;
    });

  // Render player leaderboard
  playerLeaderboardBody.innerHTML = playerLeaderboard
    .map((player, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${player.username}</td>
        <td>${player.wins}</td>
        <td>${player.losses}</td>
        <td>${player.draws}</td>
        <td>${player.winRate}</td>
      </tr>
    `)
    .join('');

  // --- Calculate AI Stats ---
  const aiGames = games.filter(game => game.playerO === 'AI');
  const aiStats = {};

  aiGames.forEach(game => {
    const { difficulty, personality, winner } = game;
    if (!difficulty || !personality) return;

    const key = `${difficulty}-${personality}`;
    if (!aiStats[key]) {
      aiStats[key] = { difficulty, personality, wins: 0, total: 0 };
    }
    aiStats[key].total++;
    if (winner === 'O') {
      aiStats[key].wins++;
    }
  });

  // Calculate win rates and sort AI stats
  const aiLeaderboard = Object.values(aiStats)
    .map(stat => {
      const winRate = stat.total > 0 ? ((stat.wins / stat.total) * 100).toFixed(2) + '%' : '0%';
      return { ...stat, winRate };
    })
    .sort((a, b) => {
      // Sort by difficulty (Easy -> Hard), then by win rate (descending)
      const difficultyOrder = { Easy: 1, Medium: 2, Hard: 3 };
      if (difficultyOrder[a.difficulty] !== difficultyOrder[b.difficulty]) {
        return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
      }
      return parseFloat(b.winRate) - parseFloat(a.winRate);
    });

  // Render AI leaderboard
  aiLeaderboardBody.innerHTML = aiLeaderboard
    .map(ai => `
      <tr>
        <td>${ai.difficulty}</td>
        <td>${ai.personality}</td>
        <td>${ai.wins}</td>
        <td>${ai.total}</td>
        <td>${ai.winRate}</td>
      </tr>
    `)
    .join('');
});