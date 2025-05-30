import { Keypair } from "@solana/web3.js";
import QRCode from "qrcode";
import * as bip39 from "bip39";
import nacl from "tweetnacl";
import restoredWallets from "/restored_wallets.json";

export class WalletLogic {
  constructor(dracula) {
    this.dracula = dracula;
    this.setupUI();
  }

  setupUI() {
    document.getElementById("generateMain")?.addEventListener("click", () => this.generate("main"));
    document.getElementById("generateGhost")?.addEventListener("click", () => this.generate("ghost"));
    document.getElementById("generateBot")?.addEventListener("click", () => this.generate("bot", 50));
    document.getElementById("scaleBot")?.addEventListener("click", () => this.generate("bot", 100));

    document.getElementById("importMain")?.addEventListener("click", async () => {
      const input = prompt("Paste secret key (array, base58, or mnemonic):");
      if (!input) return;

      let keypair, mnemonic = null;

      try {
        if (input.trim().split(" ").length >= 12) {
          mnemonic = input.trim();
          const seed = await bip39.mnemonicToSeed(mnemonic);
          const seed32 = seed.slice(0, 32);
          const kp = nacl.sign.keyPair.fromSeed(seed32);
          keypair = Keypair.fromSecretKey(kp.secretKey);
        } else if (input.trim().startsWith("[")) {
          const arr = JSON.parse(input);
          keypair = Keypair.fromSecretKey(Uint8Array.from(arr));
        } else {
          const bs58 = await import("bs58");
          const decoded = bs58.default.decode(input.trim());
          keypair = Keypair.fromSecretKey(decoded);
        }
      } catch (e) {
        return alert("Invalid input: " + e.message);
      }

      const exists = this.dracula.wallets.main.some(w => w.publicKey === keypair.publicKey.toBase58());
      if (exists) return alert("Wallet already exists");

      this.dracula.wallets.main.push({
        publicKey: keypair.publicKey.toBase58(),
        secretKey: Array.from(keypair.secretKey),
        mnemonic: mnemonic || "",
        balance: 0,
        tokens: 0,
        type: "main"
      });

      this.saveAndRender();
      this.dracula.log("✅ Imported wallet: " + keypair.publicKey.toBase58());
    });

    this.restoreFromBackup();
  }

  restoreFromBackup() {
    try {
      this.dracula.wallets = restoredWallets;

      Object.values(this.dracula.wallets).flat().forEach(wallet => {
        if (!wallet.mnemonic && wallet.secretKey) {
          const seed32 = Uint8Array.from(wallet.secretKey).slice(0, 32);
          wallet.mnemonic = bip39.entropyToMnemonic(Buffer.from(seed32).toString("hex"));
        }
      });

      this.saveAndRender();
      this.dracula.log("✅ Restored wallets from JSON backup");
    } catch (err) {
      this.dracula.wallets = { main: [], ghost: [], bot: [], mirror: [] };
      this.dracula.log("❌ Failed to restore wallets from backup: " + err.message);
    }
  }

  async generate(type, count = 1) {
    if (!this.dracula.wallets[type]) this.dracula.wallets[type] = [];

    for (let i = 0; i < count; i++) {
      const mnemonic = bip39.generateMnemonic();
      const seed = await bip39.mnemonicToSeed(mnemonic);
      const seed32 = seed.slice(0, 32);
      const kp = nacl.sign.keyPair.fromSeed(seed32);
      const keypair = Keypair.fromSecretKey(kp.secretKey);

      this.dracula.wallets[type].push({
        publicKey: keypair.publicKey.toBase58(),
        secretKey: Array.from(keypair.secretKey),
        mnemonic,
        balance: 0,
        tokens: 0,
        type
      });
    }

    this.saveAndRender();
    this.dracula.log(`✅ Generated ${count} ${type} wallet(s)`);
  }

  async saveAndRender() {
    this.dracula.saveWallets();
    this.renderWallets();
    await this.syncToBackend();
  }

  async syncToBackend() {
    try {
      const all = Object.values(this.dracula.wallets).flat();
      await fetch("http://localhost:3001/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallets: all })
      });
    } catch {
      this.dracula.log("⚠️ Sync failed (local only)");
    }
  }

  async renderWallets() {
    ["main", "ghost", "bot"].forEach(type => {
      const container = document.getElementById(`${type}Wallets`);
      if (!container) return;
      container.innerHTML = "";

      this.dracula.wallets[type]?.forEach((wallet, i) => {
        const div = document.createElement("div");
        div.className = "wallet-box";
        const short = wallet.publicKey.slice(0, 4) + "..." + wallet.publicKey.slice(-4);
        div.innerHTML = `
          <div class="wallet-box-header">${short}</div>
          <div>SOL: ${wallet.balance?.toFixed(3) || "0.000"} | Tokens: ${wallet.tokens?.toFixed(2) || "0.00"}</div>
          <div class="wallet-box-row">
            <button class="view-wallet" data-index="${i}" data-type="${type}">View</button>
            <button class="withdraw-wallet" data-index="${i}" data-type="${type}">Withdraw</button>
            <button class="export-wallet" data-index="${i}" data-type="${type}">Export</button>
            <button class="delete-wallet" data-index="${i}" data-type="${type}">Delete</button>
            <button class="fund-selected" data-index="${i}" data-type="${type}">Fund Selected</button>
          </div>
        `;
        container.appendChild(div);
      });

      container.querySelectorAll(".export-wallet").forEach(button => {
        button.addEventListener("click", async (e) => {
          const i = e.currentTarget.dataset.index;
          const type = e.currentTarget.dataset.type;
          const wallet = this.dracula.wallets[type][i];
          if (!wallet) return alert("Wallet not found");

          const data = {
            publicKey: wallet.publicKey,
            mnemonic: wallet.mnemonic || "",
            type: wallet.type,
            note: "Import this phrase in Phantom/Solflare or scan QR"
          };

          try {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `wallet-${wallet.publicKey}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            const walletBox = e.target.closest(".wallet-box");
            walletBox.querySelectorAll("canvas.qr-address, canvas.qr-backup").forEach(c => c.remove());

            const qr1 = document.createElement("canvas");
            qr1.className = "qr-address";
            qr1.style.marginTop = "5px";
            walletBox.appendChild(qr1);
            await QRCode.toCanvas(qr1, wallet.publicKey, { width: 160 });

            const qr2 = document.createElement("canvas");
            qr2.className = "qr-backup";
            qr2.style.marginTop = "5px";
            walletBox.appendChild(qr2);
            await QRCode.toCanvas(qr2, JSON.stringify(data), { width: 160 });

            this.dracula.log(`📤 Exported ${type} wallet: ${wallet.publicKey}`);
          } catch (err) {
            this.dracula.log("❌ Export failed: " + err.message);
          }
        });
      });

      container.querySelectorAll(".delete-wallet").forEach(button => {
        button.addEventListener("click", async (e) => {
          const i = e.currentTarget.dataset.index;
          const type = e.currentTarget.dataset.type;
          if (!this.dracula.wallets[type]) return;
          this.dracula.wallets[type].splice(i, 1);
          await this.saveAndRender();
          this.dracula.log(`🗑️ Deleted ${type} wallet`);
        });
      });
    });
  }
}

window.WalletLogic = WalletLogic;
