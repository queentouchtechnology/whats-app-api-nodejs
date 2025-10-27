// src/api/helper/baileys-loader.js
const logger = require('pino')();
let baileysModule = null;

async function loadBaileys() {
  if (baileysModule) return baileysModule;

  try {
    const mod = await import('@whiskeysockets/baileys');

    // Try every export pattern possible
    const makeWASocket =
      mod.makeWASocket ||
      mod.default?.makeWASocket ||
      mod.default ||
      null;

    const DisconnectReason =
      mod.DisconnectReason ||
      mod.default?.DisconnectReason ||
      null;

    if (!makeWASocket) {
      throw new Error(
        `Baileys module missing expected exports — found keys: ${Object.keys(mod)}`
      );
    }

    baileysModule = { makeWASocket, DisconnectReason };
    logger.info('✅ Baileys dynamically loaded (compatible mode)');
    return baileysModule;
  } catch (err) {
    logger.error({ err }, '❌ Failed to import Baileys');
    throw err;
  }
}

module.exports = { loadBaileys };
