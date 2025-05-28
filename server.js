const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cors = require("cors");

const app = express();
const PORT = 3001;
const PASSWORD = "!@2025DraculaWallet2025!@";
const KEY = crypto.createHash("sha256").update(PASSWORD).digest();
const walletDir = path.join(__dirname, "wallets");

app.use(cors());
app.use(express.json());

// GET /api/wallets — list all public keys
app.get("/api/wallets", (req, res) => {
  try {
    const files = fs.readdirSync(walletDir);
    const publicKeys = files
      .filter(f => f.endsWith(".enc"))
      .map(f => {
        try {
          const raw = fs.readFileSync(path.join(walletDir, f));
          const iv = raw.slice(0, 16);
          const encryptedData = raw.slice(16);
          const decipher = crypto.createDecipheriv("aes-256-cfb", KEY, iv);
          const decrypted = Buffer.concat([
            decipher.update(encryptedData),
            decipher.final()
          ]);
          const wallet = JSON.parse(decrypted.toString());
          return { publicKey: wallet.publicKey };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    res.json(publicKeys);
  } catch {
    res.status(500).json({ error: "Failed to load wallets." });
  }
});

// GET /api/export/:pubkey — return full decrypted wallet
app.get("/api/export/:pubkey", (req, res) => {
  const targetKey = req.params.pubkey;
  try {
    const files = fs.readdirSync(walletDir);
    for (let file of files) {
      if (!file.endsWith(".enc")) continue;
      try {
        const raw = fs.readFileSync(path.join(walletDir, file));
        const iv = raw.slice(0, 16);
        const encryptedData = raw.slice(16);
        const decipher = crypto.createDecipheriv("aes-256-cfb", KEY, iv);
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
    res.status(404).json({ error: "Wallet not found" });
  } catch {
    res.status(500).json({ error: "Failed to export wallet" });
  }
});

// POST /api/sync — write wallets back to encrypted .enc files
app.post("/api/sync", (req, res) => {
  try {
    const wallets = req.body.wallets;
    if (!Array.isArray(wallets)) return res.status(400).json({ error: "Invalid wallet array" });

    // Remove all .enc files before syncing
    fs.readdirSync(walletDir).forEach(f => {
      if (f.endsWith(".enc")) fs.unlinkSync(path.join(walletDir, f));
    });

    wallets.forEach(wallet => {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv("aes-256-cfb", KEY, iv);
      const encrypted = Buffer.concat([
        cipher.update(Buffer.from(JSON.stringify(wallet))),
        cipher.final()
      ]);
      const out = Buffer.concat([iv, encrypted]);
      fs.writeFileSync(path.join(walletDir, `${wallet.publicKey}.enc`), out);
    });

    res.json({ success: true, count: wallets.length });
  } catch (err) {
    console.error("Sync error:", err);
    res.status(500).json({ error: "Failed to sync" });
  }
});

// GET / — fix \"Cannot GET /\"
app.get("/", (req, res) => {
  res.send("🧛 Dracula Wallet API is running.");
});

app.listen(PORT, () => {
  console.log(`🧛 Backend listening at http://localhost:${PORT}`);
});
