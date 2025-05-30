// Dracula Bot (REST API version for ES modules with .mjs config)
import fetch from "node-fetch";
import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import ecosystem config (must be .mjs)
const ecosystem = await import(path.resolve(__dirname, "./ecosystem.config.mjs"));
const envVars = ecosystem.default.apps[0].env;
Object.entries(envVars).forEach(([k, v]) => process.env[k] = v);

const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const connection = new Connection(RPC_URL, "confirmed");

async function main() {
  console.log("🧛 Starting Dracula Bot (REST mode)...");

  try {
    const wallet = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(PRIVATE_KEY)));
    const pubkey = wallet.publicKey.toBase58();
    console.log("🔑 Wallet:", pubkey);

    // Test Jupiter Quote API (1 SOL -> USDC)
    const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=4k3Dyjzvzp8e2dtcwVhnVzr7kV9EYshKqfqAfsYyExDP&amount=1000000&slippage=1`;
    const quote = await fetch(quoteUrl).then(res => res.json());
    console.log("💰 Jupiter quote:", quote);

    // Heartbeat loop
    while (true) {
      console.log("⏱️  Heartbeat @", new Date().toLocaleTimeString());
      await new Promise(res => setTimeout(res, 30000));
    }
  } catch (err) {
    console.error("❌ Bot crashed:", err);
    process.exit(1);
  }
}

main();
