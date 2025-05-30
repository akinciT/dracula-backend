import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';

export async function autoFundChain(dracula) {
  const log = (msg) => dracula.log(msg);
  const connection = dracula.connection;

  const phantom = window.solana?.isPhantom ? window.solana : null;
  if (!phantom?.publicKey) return alert("Phantom not connected");

  log("💸 Starting Auto Fund Chain...");

  const mainWallets = dracula.wallets.main;
  const ghostWallets = dracula.wallets.ghost;
  const botWallets = dracula.wallets.bot;

  const phantomBalance = await connection.getBalance(phantom.publicKey) / 1e9;
  const toDistribute = phantomBalance * 0.9;
  const perMain = toDistribute / mainWallets.length;

  for (const w of mainWallets) {
    const amt = (Math.random() * 0.02 + perMain - 0.01).toFixed(3);
    await transferSOL(connection, phantom, w.publicKey, parseFloat(amt));
    w.balance = await dracula.getBalance(w.publicKey);
  }

  for (const main of mainWallets) {
    const mainBalance = await dracula.getBalance(main.publicKey);
    const numTransfers = Math.ceil(Math.random() * 2 + 1);
    const amtPer = (mainBalance / numTransfers) * 0.9;

    for (let i = 0; i < numTransfers; i++) {
      const g = ghostWallets[Math.floor(Math.random() * ghostWallets.length)];
      await transferSOL(connection, main, g.publicKey, randomAmount(amtPer));
      g.balance = await dracula.getBalance(g.publicKey);
    }
  }

  for (const ghost of ghostWallets) {
    const ghostBalance = await dracula.getBalance(ghost.publicKey);
    const num = Math.floor(Math.random() * 5 + 2);
    const amt = ghostBalance / num;

    for (let i = 0; i < num; i++) {
      const bot = botWallets[Math.floor(Math.random() * botWallets.length)];
      await transferSOL(connection, ghost, bot.publicKey, randomAmount(amt));
      bot.balance = await dracula.getBalance(bot.publicKey);
    }
  }

  dracula.renderWallets("main");
  dracula.renderWallets("ghost");
  dracula.renderWallets("bot");

  log("✅ Auto Fund Chain Complete.");
}

function randomAmount(avg) {
  return parseFloat((avg * (0.9 + Math.random() * 0.2)).toFixed(4));
}

async function transferSOL(connection, from, toPubkeyStr, amount) {
  const toPubkey = new PublicKey(toPubkeyStr);
  const tx = new Transaction();
  const latest = await connection.getLatestBlockhash();
  tx.recentBlockhash = latest.blockhash;
  tx.feePayer = from.publicKey;

  tx.add(
    SystemProgram.transfer({
      fromPubkey: from.publicKey,
      toPubkey,
      lamports: Math.floor(amount * 1e9),
    })
  );

  const signed = await from.signTransaction(tx);
  const sig = await connection.sendRawTransaction(signed.serialize());
  window.dracula.log(`🔁 ${amount} SOL → ${toPubkeyStr.slice(0, 5)}... | tx: ${sig}`);
}
