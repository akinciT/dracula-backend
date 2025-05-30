export class SellLogic {
  constructor(dracula) {
    this.dracula = dracula;
    this.setupUI();
  }

  setupUI() {
    this.dracula.log("📉 Sell logic loaded");
  }

  sellFromGroup(group) {
    this.dracula.log(`💥 Sell triggered from Group ${group}`);
    const bots = this.dracula.wallets.bot || [];
    bots.forEach((bot, index) => {
      if (index % 4 === group.charCodeAt(0) % 4) {
        this.dracula.log(`🧨 Bot ${index} from Group ${group} selling...`);
        // Insert actual sell logic here if needed
      }
    });
  }
}

window.SellLogic = SellLogic;
