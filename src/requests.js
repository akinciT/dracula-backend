
export async function fetchMarketData(dracula) {
  try {
    const solPrice = await fetch("https://price.jup.ag/v4/price?ids=SOL")
      .then(res => res.json());

    document.getElementById("solPrice").textContent = "$" + solPrice.data.SOL.price.toFixed(2);
  } catch (e) {
    console.warn("❌ SOL price fetch failed", e.message);
    document.getElementById("solPrice").textContent = "$0.00";
  }

  try {
    const token = dracula.lockedToken;
    if (!token) return;

    const tokenInfo = await fetch(`https://public-api.birdeye.so/public/token/${token}`)
      .then(r => r.json());

    document.getElementById("tokenPrice").textContent = "$" + tokenInfo.data.price.toFixed(4);
    document.getElementById("marketCap").textContent = "$" + tokenInfo.data.marketCap.toLocaleString();
    document.getElementById("liquidity").textContent = "$" + tokenInfo.data.liquidity.toLocaleString();
  } catch (e) {
    console.warn("❌ Token data fetch failed", e.message);
  }
}
