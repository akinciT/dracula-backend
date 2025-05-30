import { TradeLogic } from './tradeLogic.js';
import { shuffleArray, getGroupBots } from './botUtils.js';

// Group Configuration (Fully Defined)
const GROUP_CONFIG = {
  A: { 
    buyType: 'FULL_BALANCE',
    sellStrategy: { type: 'TIERS', targets: [1.5, 2.0, 3.0] },
    delayWeight: 0.4 
  },
  B: { 
    buyType: 'HALF_BALANCE', 
    sellStrategy: { type: 'SINGLE', target: 2.5 },
    delayWeight: 0.7 
  },
  C: { 
    buyType: 'FIXED', 
    amount: 0.3,
    sellStrategy: { type: 'RAYDIUM' },
    delayWeight: 0.9 
  },
  D: { 
    buyType: 'FIXED', 
    amount: 0.1,
    sellStrategy: { type: 'MC_TARGETS', targets: [50000, 100000] },
    delayWeight: 1.0 
  }
};

export class TradingWorker {
  constructor(connection, tokenAddress) {
    this.trader = new TradeLogic(connection);
    this.tokenAddress = tokenAddress;
  }

  async executeGroup(groupName) {
    const config = GROUP_CONFIG[groupName];
    const bots = shuffleArray(getGroupBots(groupName));

    for (const bot of bots) {
      try {
        // Anti-MEV Buy
        const buyAmount = this._calculateBuyAmount(bot, config);
        await this.trader.buyExactSOL(bot, this.tokenAddress, buyAmount);

        // Anti-MEV Sell
        await this._executeSellStrategy(bot, config.sellStrategy);

      } catch (error) {
        console.error(`[GROUP ${groupName} FAIL]`, error);
      }
    }
  }

  _calculateBuyAmount(bot, config) {
    switch(config.buyType) {
      case 'FULL_BALANCE': return bot.balance * 0.99;
      case 'HALF_BALANCE': return bot.balance * 0.5;
      case 'FIXED': return config.amount;
      default: return 0;
    }
  }

  async _executeSellStrategy(bot, strategy) {
    switch(strategy.type) {
      case 'TIERS':
        for (const target of strategy.targets) {
          await this.trader.sellAtTarget(bot, this.tokenAddress, target);
          await this._randomDelay(2000, 5000);
        }
        break;
      case 'SINGLE':
        await this.trader.sellAtTarget(bot, this.tokenAddress, strategy.target);
        break;
      case 'RAYDIUM':
        await this.trader.sellOnRaydium(bot, this.tokenAddress);
        break;
      case 'MC_TARGETS':
        await this.trader.sellAtMcTargets(bot, this.tokenAddress, strategy.targets);
        break;
    }
  }

  async _randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}