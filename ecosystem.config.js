module.exports = {
  apps: [
    {
      name: "dracula-bot",
      script: "bot.js",
      watch: true,
      env: {
        RPC_URL: "https://rpc.helius.xyz/?api-key=YOUR_KEY",
        JUPITER_URL: "https://quote-api.jup.ag",
        PRIVATE_KEY: "...",
        TELEGRAM_WEBHOOK: "https://api.telegram.org/bot<token>/sendMessage"
      }
    }
  ]
}
