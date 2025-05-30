import { Connection, PublicKey, Keypair } from '@solana/web3.js';

class DraculaDEX {
  constructor() {
    this.wallets = { main: [], ghost: [], bot: [], mirror: [] };
    this.whitelist = [];
    this.tokenAddress = null;
    this.phantom = null;
    this.solflare = null;
    this.logs = document.getElementById("logs");
    this.connection = new Connection("https://summer-sleek-card.solana-mainnet.quiknode.pro/3fc6f77b88dc054f223c8482f9638cdf8a6b20cd");
  }

  init() {
    this.loadWallets();
    this.loadData();
    this.injectUIHelpers();

    // Removed renderWallets call to avoid overwriting balances from restored_wallets.json
    // ["main", "ghost", "bot", "mirror"].forEach(type => this.renderWallets(type));

    document.getElementById("connectPhantom")?.addEventListener("click", () => window.dracula.connectPhantom());
    document.getElementById("connectSolflare")?.addEventListener("click", () => window.dracula.connectSolflare());
    document.getElementById("setToken")?.addEventListener("click", () => {
      const token = document.getElementById("tokenInput")?.value?.trim();
      if (!token) return;
      this.tokenAddress = token;
      this.fetchTokenStats();
      this.log("✅ Token locked: " + token);
    });

    document.getElementById("setMirrorLeader")?.addEventListener("click", () => {
      const walletAddr = document.getElementById("mirrorLeader")?.value.trim();
      const amount = parseFloat(document.getElementById("mirrorAmount")?.value || "0.02");
      const token = this.tokenAddress;
      if (!walletAddr || !token) {
        this.log("❌ Leader or token not set.");
        return;
      }
      if (window.mirrorLogic?.mirrorBuyFrom) {
        window.mirrorLogic.mirrorBuyFrom(walletAddr, token);
      }
    });

    this.fetchSOLPrice();
    setInterval(() => this.fetchSOLPrice(), 60000);
    setInterval(() => this.fetchTokenStats(), 30000);
  }

  log(msg) {
    const time = new Date().toLocaleTimeString();
    this.logs.value += `[${time}] ${msg}\n`;
    this.logs.scrollTop = this.logs.scrollHeight;
  }

  saveWallets() {
    localStorage.setItem("wallets", JSON.stringify(this.wallets));
  }

  exportWallet(wallet, type) {
    const dataStr = JSON.stringify(wallet, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_wallet_${wallet.publicKey}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    this.log(`📋 Exported ${type} wallet: ${wallet.publicKey}`);
  }

  loadWallets() {
    const stored = localStorage.getItem("wallets");
    if (!stored) return;
    const parsed = JSON.parse(stored);
    ["main", "ghost", "bot", "mirror"].forEach(type => {
      const unique = new Map();
      (parsed[type] || []).forEach(w => {
        if (w.publicKey && w.secretKey && w.secretKey.length === 64 && !unique.has(w.publicKey)) {
          unique.set(w.publicKey, w);
        }
      });
      this.wallets[type] = Array.from(unique.values());
    });
  }

  loadData() {
    const stored = localStorage.getItem("whitelist");
    if (!stored) return;
    try {
      this.whitelist = JSON.parse(stored);
    } catch {
      this.whitelist = [];
    }
  }

  injectUIHelpers() {
    ["main", "ghost", "bot", "mirror"].forEach(type => {
      const panel = document.querySelector(`#${type}Wallets`)?.closest('.panel');
      if (!panel) return;
      const controls = panel.querySelector(".control-row") || panel;

      if (!controls.querySelector(`#${type}Amount`)) {
        const input = document.createElement("input");
        input.type = "number";
        input.step = "any";
        input.placeholder = "Amount";
        input.id = `${type}Amount`;
        controls.appendChild(input);
      }

      if (!panel.querySelector("select")) {
        const select = document.createElement("select");
        select.innerHTML = `
          <option value="phantom">From Phantom</option>
          <option value="solflare">From Solflare</option>
          <option value="main">From Main</option>
          <option value="ghost">From Ghost</option>
        `;
        controls.insertBefore(select, controls.querySelector("button") || null);
      }
    });
  }

  bindWalletControls() {
    document.querySelectorAll(".export-wallet").forEach(btn => {
      btn.addEventListener("click", () => {
        const { type, index } = btn.dataset;
        const wallet = this.wallets[type]?.[index];
        if (!wallet) return;
        this.exportWallet(wallet, type);
      });
    });

    document.querySelectorAll(".delete-wallet").forEach(btn => {
      btn.addEventListener("click", () => {
        const { type, index } = btn.dataset;
        const confirmed = confirm("Are you sure you want to delete this wallet?");
        if (!confirmed) return;
        this.wallets[type]?.splice(index, 1);
        this.saveWallets();
        this.renderWallets(type);
        this.log(`🗑️ Deleted ${type} wallet index ${index}`);
      });
    });

    document.querySelectorAll(".view-wallet").forEach(btn => {
      btn.addEventListener("click", () => {
        const { type, index } = btn.dataset;
        const wallet = this.wallets[type]?.[index];
        if (!wallet) return;
        alert(`Public Key: ${wallet.publicKey}\nSecret Key: ${JSON.stringify(wallet.secretKey)}`);
      });
    });
  }

  async renderWallets(type) {
    const container = document.getElementById(`${type}Wallets`);
    if (!container) return;
    const seen = new Set();
    this.wallets[type] = this.wallets[type].filter(w => {
      if (!w.publicKey || !w.secretKey || w.secretKey.length !== 64) return false;
      if (seen.has(w.publicKey)) return false;
      seen.add(w.publicKey);
      return true;
    });

    const updated = await Promise.all(
      this.wallets[type].map(async (wallet) => {
        const balance = await this.connection.getBalance(new PublicKey(wallet.publicKey));
        return {
          ...wallet,
          balance: parseFloat((balance / 1e9).toFixed(5)),
          tokens: wallet.tokens || 0
        };
      })
    );

    this.wallets[type] = updated;
    container.innerHTML = "";
    for (let i = 0; i < updated.length; i++) {
      const wallet = updated[i];
      const div = document.createElement("div");
      div.className = "wallet-box";
      div.innerHTML = `
        <div class="wallet-box-header">${wallet.publicKey.slice(0, 5)}...${wallet.publicKey.slice(-4)}</div>
        <div>SOL: ${wallet.balance.toFixed(5)} | Tokens: ${wallet.tokens.toFixed(2)}</div>
        <div class="wallet-box-row">
          <button class="view-wallet" data-type="${type}" data-index="${i}">View</button>
          <button class="withdraw-wallet" data-type="${type}" data-index="${i}">Withdraw</button>
          <button class="export-wallet" data-type="${type}" data-index="${i}">Export</button>
          <button class="delete-wallet" data-type="${type}" data-index="${i}">Delete</button>
          <button class="fund-selected" data-type="${type}" data-index="${i}">Fund Selected</button>
        </div>
      `;
      container.appendChild(div);
    }

    this.saveWallets();
    this.bindWalletControls();
    this.log(`✅ Rendered ${updated.length} ${type} wallet(s)`);
  }

  async connectPhantom() {
    try {
      if (!window.solana?.isPhantom) throw new Error("Phantom not installed");
      const provider = window.solana;
      await provider.connect();
      this.phantom = provider;
      const pubkey = provider.publicKey.toString();
      document.getElementById("phantomAddress").textContent = pubkey;
      const solBalance = await this.getBalance(pubkey);
      document.getElementById("phantomBalance").textContent = solBalance.toFixed(5);
      this.log(`Phantom connected: ${pubkey}`);
    } catch (e) {
      this.log("Phantom error: " + e.message);
    }
  }

  async connectSolflare() {
    try {
      if (!window.solflare?.isSolflare) throw new Error("Solflare not installed");
      const provider = window.solflare;
      await provider.connect();
      this.solflare = provider;
      const pubkey = provider.publicKey.toString();
      document.getElementById("solflareAddress").textContent = pubkey;
      const solBalance = await this.getBalance(pubkey);
      document.getElementById("solflareBalance").textContent = solBalance.toFixed(5);
      this.log(`Solflare connected: ${pubkey}`);
    } catch (e) {
      this.log("Solflare error: " + e.message);
    }
  }

  async getBalance(pubkey) {
    try {
      const bal = await this.connection.getBalance(new PublicKey(pubkey));
      return bal / 1e9;
    } catch (e) {
      this.log("❌ getBalance error: " + e.message);
      return 0;
    }
  }

  async fetchSOLPrice() {
    try {
      const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
      const data = await res.json();
      document.getElementById("solPrice").textContent = `$${data.solana.usd.toFixed(2)}`;
    } catch (e) {
      this.log("SOL price fetch failed");
    }
  }

  async fetchTokenStats() {
    if (!this.tokenAddress) return;
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${this.tokenAddress}`);
      const data = await res.json();
      if (data.pairs && data.pairs.length > 0) {
        const pair = data.pairs[0];
        document.getElementById("tokenPrice").textContent = `$${parseFloat(pair.priceUsd).toFixed(4)}`;
        document.getElementById("marketCap").textContent = `$${parseFloat(pair.fdv || 0).toLocaleString()}`;
        document.getElementById("liquidity").textContent = `$${parseFloat(pair.liquidity?.usd || 0).toLocaleString()}`;
      } else {
        throw new Error("No token data");
      }
    } catch (e) {
      this.log("Token stats fetch error: " + e.message);
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const app = new DraculaDEX();
  window.dracula = app;
  app.init();
});
