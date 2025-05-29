const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;
const PASSWORD = '!@2025DraculaWallet2025!@';
const KEY = crypto.createHash('sha256').update(PASSWORD).digest();
const walletDir = path.join(__dirname, 'wallets');
const SOLANA_RPC = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";

app.use(cors({ origin: '*', methods: ['POST', 'GET'], allowedHeaders: ['Content-Type'] }));
app.use(express.json());

app.get('/', (req, res) => {
  res.send("🧛 Dracula Wallet API is running.");
});

app.get('/api/wallets', (req, res) => {
  try {
    const files = fs.readdirSync(walletDir);
    const publicKeys = files
      .filter(f => f.endsWith('.enc'))
      .map(f => {
        try {
          const raw = fs.readFileSync(path.join(walletDir, f));
          const iv = raw.slice(0, 16);
          const encryptedData = raw.slice(16);
          const decipher = crypto.createDecipheriv('aes-256-cfb', KEY, iv);
          const decrypted = Buffer.concat([
            decipher.update(encryptedData),
            decipher.final()
          ]);
          const wallet = JSON.parse(decrypted.toString());
          return { publicKey: wallet.publicKey };
        } catch (err) {
          console.warn(`Failed to decrypt: ${f}`);
          return null;
        }
      })
      .filter(Boolean);

    res.json(publicKeys);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load wallets.' });
  }
});

app.get('/api/export/:pubkey', (req, res) => {
  const targetKey = req.params.pubkey;
  try {
    const files = fs.readdirSync(walletDir);
    for (let file of files) {
      try {
        const raw = fs.readFileSync(path.join(walletDir, file));
        const iv = raw.slice(0, 16);
        const encryptedData = raw.slice(16);
        const decipher = crypto.createDecipheriv('aes-256-cfb', KEY, iv);
        const decrypted = Buffer.concat([
          decipher.update(encryptedData),
          decipher.final()
        ]);
        const wallet = JSON.parse(decrypted.toString());
        if (wallet.publicKey === targetKey) {
          return res.json(wallet);
        }
      } catch {}
    }
    res.status(404).json({ error: 'Wallet not found' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to export wallet' });
  }
});

app.post('/api/solana', async (req, res) => {
  try {
    const response = await fetch(SOLANA_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const json = await response.json();
    res.json(json);
  } catch (err) {
    res.status(500).json({ error: 'Solana proxy failed', detail: err.message });
  }
});

app.post("/api/sync", (req, res) => {
  try {
    const { wallets } = req.body;
    if (!wallets || !Array.isArray(wallets)) return res.status(400).json({ error: 'Invalid payload' });

    let count = 0;
    wallets.forEach(wallet => {
      const raw = Buffer.from(JSON.stringify(wallet));
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cfb', KEY, iv);
      const encrypted = Buffer.concat([cipher.update(raw), cipher.final()]);
      const payload = Buffer.concat([iv, encrypted]);
      const name = `wallet-${wallet.publicKey}.enc`;
      fs.writeFileSync(path.join(walletDir, name), payload);
      count++;
    });

    res.json({ success: true, count });
  } catch (e) {
    res.status(500).json({ error: 'Sync failed', detail: e.message });
  }
});

app.post("/api/webhook", (req, res) => {
  console.log("🚨 Webhook Triggered:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`🧛 Backend listening at http://localhost:${PORT}`);
});
