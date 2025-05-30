
// Sample: Integrate Pump.fun Token Info in Dracula App

// Function to fetch Pump.fun metadata for a given token
async function fetchPumpFunTokenInfo(tokenAddress) {
  try {
    const response = await fetch(\`https://pump.fun/api/coin/\${tokenAddress}\`);
    if (!response.ok) throw new Error("Pump.fun API error");
    const data = await response.json();
    console.log("🎯 Pump.fun Token Data:", data);

    // Example: Show in log box
    dracula.log("🧠 Pump Token Info: " + JSON.stringify(data, null, 2));

    // Optional: update UI fields
    document.getElementById("tokenPrice").textContent = `$${parseFloat(data.price).toFixed(4)}`;
    document.getElementById("marketCap").textContent = `$${(parseFloat(data.marketCapUsd) || 0).toLocaleString()}`;
    document.getElementById("liquidity").textContent = `$${(parseFloat(data.liquidityUsd) || 0).toLocaleString()}`;

  } catch (e) {
    dracula.log("❌ Failed to fetch Pump.fun info: " + e.message);
  }
}

// Modify setToken function to call Pump.fun check
window.setToken = function () {
  const token = document.getElementById("tokenInput").value.trim();
  if (!token) return;
  localStorage.setItem(tokenKey, token);
  dracula.tokenAddress = token;
  loadDexChart();
  fetchTokenStats();
  fetchPumpFunTokenInfo(token);  // <-- Added
  dracula.log("✅ Token set: " + token);
};
