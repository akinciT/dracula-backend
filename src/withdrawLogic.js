import { Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';

export default class WithdrawLogic {
  constructor(dracula) {
    this.dracula = dracula;
    this.bindWithdrawButtons();
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

  bindWithdrawButtons() {
    document.addEventListener("click", async (e) => {
      if (!e.target.classList.contains("withdraw-wallet")) return;

      const index = parseInt(e.target.dataset.index);
      const type = e.target.dataset.type;
      const wallet = this.dracula.wallets[type]?.[index];
      if (!wallet || !wallet.secretKey || wallet.secretKey.length !== 64) {
        this.dracula.log("❌ Invalid wallet or secret key.");
        return;
      }

      const toAddress = this.getWithdrawTarget(type);
      if (!toAddress) {
        this.dracula.log("❌ No valid withdraw target found.");
        return;
      }

      const input = document.getElementById(`${type}Amount`);
      const amount = parseFloat(input?.value || "0");
      if (isNaN(amount) || amount <= 0) {
        this.dracula.log("❌ Invalid withdraw amount input.");
        return;
      }

      await this.withdrawWallet(wallet, amount, toAddress);
    });
  }

  getWithdrawTarget(type) {
    if (type === "main" && this.dracula.phantom?.publicKey) {
      return this.dracula.phantom.publicKey.toString();
    }
    if (type === "ghost" && this.dracula.wallets.main?.[0]?.publicKey) {
      return this.dracula.wallets.main[0].publicKey;
    }
    if (type === "bot" && this.dracula.wallets.ghost?.[0]?.publicKey) {
      return this.dracula.wallets.ghost[0].publicKey;
    }
    if (type === "mirror" && this.dracula.wallets.ghost?.[0]?.publicKey) {
      return this.dracula.wallets.ghost[0].publicKey;
    }
    return null;
  }

  async withdrawWallet(wallet, amountSOL, toPubkeyStr) {
    try {
      const from = Keypair.fromSecretKey(Uint8Array.from(wallet.secretKey));
      const to = new PublicKey(toPubkeyStr);
      const connection = this.dracula.connection;
      const lamports = Math.floor(amountSOL * 1e9);
      const balance = await connection.getBalance(from.publicKey);
      const feeEstimate = 5000;

      if (lamports + feeEstimate > balance) {
        const msg = `❌ Not enough balance. Wallet: ${wallet.publicKey}, has ${(balance / 1e9).toFixed(5)} SOL`;
        this.dracula.log(msg);
        this.sendLog(msg, "error", { wallet: wallet.publicKey, action: "withdraw" });
        return;
      }

      const tx = new Transaction().add(SystemProgram.transfer({
        fromPubkey: from.publicKey,
        toPubkey: to,
        lamports
      }));

      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      tx.feePayer = from.publicKey;

      const sig = await connection.sendTransaction(tx, [from]);
      const msg = `✅ Sent ${amountSOL} SOL from ${wallet.publicKey} ➡️ ${toPubkeyStr.slice(0, 6)}... | tx: ${sig}`;
      this.dracula.log(msg);
      this.sendLog(msg, "info", { wallet: wallet.publicKey, action: "withdraw", to: toPubkeyStr });
    } catch (e) {
      const msg = `❌ Withdraw failed: ${e.message}`;
      this.dracula.log(msg);
      this.sendLog(msg, "error", { wallet: wallet.publicKey, action: "withdraw" });
    }
  }
}
