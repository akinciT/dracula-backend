import { Buffer } from 'buffer';
window.Buffer = Buffer;

import './app.js';
import './fundingCascade.js';
import './exportLogic.js';
import './fundingLogic.js';
import WithdrawLogic from './withdrawLogic.js';
import { WalletLogic } from './walletLogic.js';
import { MirrorLogic } from './mirrorLogic.js';
import { trade } from './tradeLogic.js';
import { PublicKey } from '@solana/web3.js';

window.trade = trade;

window.addEventListener("DOMContentLoaded", () => {
  const dracula = window.dracula;
  dracula.logEndpoint = "https://log-server-memory.onrender.com/log";

  dracula.log = function (msg) {
    const logBox = document.getElementById("logs");
    if (logBox) logBox.value += `[${new Date().toLocaleTimeString()}] ${msg}\n`;
    console.log(msg);
  };

  dracula.saveWallets = function () {
    localStorage.setItem("wallets", JSON.stringify(this.wallets));
  };

  dracula.saveData = function () {
    localStorage.setItem("whitelist", JSON.stringify(this.whitelist));
  };

  // ✅ OVERRIDE getBalance to prevent overwriting backup values
  dracula.getBalance = async function (pubkey) {
    const wallet = Object.values(this.wallets).flat().find(w => w.publicKey === pubkey);
    return wallet?.balance || 0;
  };

  window.exportWallet = async (pubkey) => {
    try {
      const res = await fetch(`http://localhost:3001/api/export/${pubkey}`);
      const data = await res.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wallet-${pubkey}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const qr = document.createElement("div");
      qr.style.marginTop = "10px";
      import('qrcode').then(QRCode => {
        QRCode.toDataURL(JSON.stringify(data), (err, qrUrl) => {
          if (!err) {
            const img = new Image();
            img.src = qrUrl;
            img.style.maxWidth = "160px";
            img.style.marginTop = "5px";
            qr.appendChild(img);
            document.body.appendChild(qr);
          }
        });
      });
    } catch (err) {
      console.error("❌ Export failed", err);
      alert("Export failed: " + err.message);
    }
  };

  new WalletLogic(dracula);
  window.fundingLogic = new window.FundingLogic(dracula);
  window.withdrawLogic = new WithdrawLogic(dracula);
  window.mirrorLogic = new MirrorLogic(dracula);

  window.executeGroupTrade = async function (group, action) {
    const bots = dracula.wallets.bot || [];
    const token = window.lockedToken;
    if (!token) return dracula.log("❌ No token set.");

    const botsByGroup = {
      A: bots.slice(0, 25),
      B: bots.slice(25, 50),
      C: bots.slice(50, 75),
      D: bots.slice(75, 100)
    };

    const groupBots = botsByGroup[group] || [];
    if (!groupBots.length) return dracula.log(`⚠️ No bots in Group ${group}`);

    for (const wallet of groupBots) {
      if (dracula.whitelist.includes(wallet.publicKey)) {
        dracula.log(`⚠️ Skipping whitelisted bot ${wallet.publicKey}`);
        continue;
      }

      try {
        if (action === "buy") {
          if (group === "A" || group === "B") {
            await trade.buyWithFullBalance(wallet, token);
          } else if (group === "C") {
            await trade.buyExactAmount(wallet, token, 0.3);
          } else if (group === "D") {
            await trade.buyExactAmount(wallet, token, 0.1);
          }
        }

        if (action === "sell") {
          if (group === "A") {
            await trade.sellAtTiers(wallet, token, [1.5, 2.3, 4.9]);
          } else if (group === "B") {
            await trade.sellAtTarget(wallet, token, 2.5);
          } else if (group === "C") {
            await trade.sellOnRaydium(wallet, token, 30);
          } else if (group === "D") {
            await trade.sellAtMcTargets(wallet, token, [50000, 100000], [40, 40]);
          }
        }
      } catch (err) {
        dracula.log(`❌ ${action} failed for ${wallet.publicKey}: ${err.message}`);
      }
    }
  };
});
