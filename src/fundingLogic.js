import { SystemProgram, Transaction, PublicKey, Keypair } from '@solana/web3.js';

class FundingLogic {
  constructor(dracula) {
    this.dracula = dracula;
    this.bindEvents();
  }

  sendLog(msg, type = "info", meta = {}) {
    const log = {
      timestamp: new Date().toISOString(),
      type,
      message: msg,
      ...meta
    };
    if (this.dracula?.logEndpoint) {
      fetch(this.dracula.logEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log)
      }).catch(() => {});
    }
  }

  getSourceWallet(forType) {
    const panel = document.querySelector(`#${forType}Wallets`)?.closest('.panel');
    const select = panel?.querySelector("select");
    if (!select) return null;
    const value = select.value.toLowerCase();

    if (value === "phantom" && window.solana?.isPhantom) return window.solana;
    if (value === "solflare" && window.solflare?.isSolflare) return window.solflare;

    if (value === "main") {
      const w = this.dracula.wallets.main?.[0];
      if (w?.secretKey) return w;
    }

    if (value === "ghost") {
      const w = this.dracula.wallets.ghost?.[0];
      if (w?.secretKey) return w;
    }

    return null;
  }

  async transferSOL(from, toAddress, amount) {
    const lamports = Math.floor(amount * 1e9);
    const toPubkey = new PublicKey(toAddress);
    const tx = new Transaction().add(SystemProgram.transfer({
      fromPubkey: new PublicKey(from.publicKey),
      toPubkey,
      lamports
    }));

    tx.feePayer = new PublicKey(from.publicKey);
    tx.recentBlockhash = (await this.dracula.connection.getLatestBlockhash()).blockhash;

    try {
      if (from.signTransaction) {
        const signedTx = await from.signTransaction(tx);
        const sig = await this.dracula.connection.sendRawTransaction(signedTx.serialize());
        const msg = `✅ ${amount} SOL sent to ${toAddress.slice(0, 6)}... | tx: ${sig}`;
        this.dracula.log(msg);
        this.sendLog(msg, "info", { from: from.publicKey, to: toAddress, action: "fund" });
      } else if (from.secretKey) {
        const kp = Keypair.fromSecretKey(Uint8Array.from(from.secretKey));
        const sig = await this.dracula.connection.sendTransaction(tx, [kp]);
        const msg = `✅ ${amount} SOL sent to ${toAddress.slice(0, 6)}... | tx: ${sig}`;
        this.dracula.log(msg);
        this.sendLog(msg, "info", { from: from.publicKey, to: toAddress, action: "fund" });
      }
    } catch (e) {
      const msg = `❌ Transfer failed: ${e.message}`;
      this.dracula.log(msg);
      this.sendLog(msg, "error", { from: from.publicKey, to: toAddress, action: "fund" });
    }
  }

  async fundWallet(wallet, amount, sourceType, type) {
    const provider = this.getSourceWallet(type);
    if (!provider || !wallet?.publicKey) {
      this.dracula.log("❌ Invalid source or destination");
      this.sendLog("❌ Invalid source or destination", "error", { to: wallet?.publicKey, action: "fund" });
      return;
    }

    await this.transferSOL(provider, wallet.publicKey, amount);
    wallet.balance = await this.dracula.getBalance(wallet.publicKey);
    if (type) this.dracula.renderWallets(type);
  }

  async fundAll(wallets, amountInput, sourceType, isRandom = false) {
    for (const wallet of wallets) {
      const amount = isRandom ? (Math.random() * 0.02 + 0.99).toFixed(2) : parseFloat(amountInput);
      const type = wallet.type || null;
      await this.fundWallet(wallet, amount, sourceType, type);
    }
  }

  bindEvents() {
    document.addEventListener("click", async (e) => {
      if (e.target.matches(".fund-selected")) {
        const type = e.target.dataset.type;
        const index = parseInt(e.target.dataset.index);
        const input = document.querySelector(`#${type}Amount`);
        const amount = parseFloat(input?.value || "1.0");
        const wallet = this.dracula.wallets[type][index];
        await this.fundWallet(wallet, amount, type, type);
      }

      if (e.target.matches(".fund-all")) {
        const type = e.target.dataset.type;
        const input = document.querySelector(`#${type}Amount`);
        const amount = parseFloat(input?.value || "1.0");
        const random = document.querySelector(`#${type}Random`)?.checked;
        await this.fundAll(this.dracula.wallets[type], amount, type, random);
      }
    });
  }
}

window.FundingLogic = FundingLogic;
