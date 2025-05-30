// botUtils.js - Complete utility functions
export function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function getGroupBots(group) {
  const allBots = window.dracula?.wallets?.bot || [];
  const groupSize = Math.floor(allBots.length / 4);

  switch(group) {
    case 'A': return allBots.slice(0, groupSize);
    case 'B': return allBots.slice(groupSize, groupSize * 2);
    case 'C': return allBots.slice(groupSize * 2, groupSize * 3);
    case 'D': return allBots.slice(groupSize * 3);
    default: return [];
  }
}

export function getBotBalance(bot) {
  // Implement actual balance check
  return bot.balance || 0;
}