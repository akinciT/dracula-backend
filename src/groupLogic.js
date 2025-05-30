import { Keypair, PublicKey } from "@solana/web3.js";
import { trade } from "./tradeLogic.js";

export class MirrorLogic {
  constructor(dracula) {
    this.dracula = dracula;
    this.mirrorBots = dracula.wallets.mirror || [];
    this.init();
  }

  init() {
    this.loadMirrorUI();
    this.loadWhitelistUI();
    this.bindUIEvents();
  }

  loadMirrorUI() {
    const container = document.getElementById("mirrorWallets");
    container.innerHTML = "";

    this.mirrorBots.forEach((wallet, i) => {
      const short = wallet.publicKey.slice(0, 4) + "..." + wallet.publicKey.slice(-4);
      const div = document.createElement("div");
      div.className = "wallet-box";
      div.innerHTML = `
        <div class="wallet-box-header">${short}</div>
        <div>SOL: ${wallet.balance?.toFixed(3) || "0.000"} | Tokens: ${wallet.tokens?.toFixed(2) || "0.00"}</div>
        <div class="wallet-box-row">
          <button class="withdraw-wallet" data-type="mirror" data-index="${i}">Withdraw</button>
          <button class="export-wallet" data-type="mirror" data-index="${i}">Export</button>
          <button class="delete-wallet" data-type="mirror" data-index="${i}">Delete</button>
          <button class="fund-selected" data-type="mirror" data-index="${i}">Fund Selected</button>
        </div>
      `;
      container.appendChild(div);
    });
  }

  loadWhitelistUI() {
    const list = document.getElementById("whitelist");
    list.innerHTML = "";
    this.dracula.whitelist.forEach((addr, i) => {
      const li = document.createElement("li");
      li.textContent = addr;
      li.innerHTML += ` <button class="remove-whitelist" data-index="${i}">❌</button>`;
      list.appendChild(li);
    });
  }

  bindUIEvents() {
    document.getElementById("addWhitelistBtn")?.addEventListener("click", () => {
      const input = document.getElementById("whitelistInput");
      const address = input.value.trim();
      if (!address || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
        return alert("Invalid Solana address.");
      }
      if (!this.dracula.whitelist.includes(address)) {
        this.dracula.whitelist.push(address);
        this.dracula.saveData();
        this.loadWhitelistUI();
        this.dracula.log(`➕ Added to whitelist: ${address}`);
      }
      input.value = "";
    });

    document.getElementById("generateMirror")?.addEventListener("click", () => {
      for (let i = 0; i < 5; i++) {
        const kp = Keypair.generate();
        const newWallet = {
          publicKey: kp.publicKey.toBase58(),
          secretKey: Array.from(kp.secretKey),
          balance: 0,
          tokens: 0,
          type: "mirror"
        };
        this.dracula.wallets.mirror.push(newWallet);
      }
      this.dracula.saveWallets();
      this.loadMirrorUI();
      this.dracula.renderWallets("mirror");
      this.dracula.log(`✅ Created 5 Mirror Trader wallets`);
    });

    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("remove-whitelist")) {
        const i = parseInt(e.target.dataset.index);
        this.dracula.whitelist.splice(i, 1);
        this.dracula.saveData();
        this.loadWhitelistUI();
        this.dracula.log("➖ Removed address from whitelist.");
      }
    });
  }

  async mirrorBuyFrom(walletAddr, tokenAddr) {
    if (!this.dracula.wallets.mirror.length) return;
    if (!tokenAddr) return;

    this.dracula.log(`👁️ Mirroring ${walletAddr} buy → ${tokenAddr}`);

    for (const bot of this.dracula.wallets.mirror) {
      try {
        await trade.buyExactAmount(bot, tokenAddr, 0.02);
      } catch (e) {
        this.dracula.log(`❌ Mirror bot failed: ${e.message}`);
      }
    }
  }
}

window.MirrorLogic = MirrorLogic;
