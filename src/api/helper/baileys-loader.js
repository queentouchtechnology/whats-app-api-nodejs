// src/api/helper/baileys-loader.js
const logger = require('pino')();

let baileysModule = null;

/**
 * Dynamically imports the official @whiskeysockets/baileys package.
 * Works in both Node 18+ (Vercel) and local CommonJS environments.
 */
async function loadBaileys() {
  if (baileysModule) return baileysModule;

  try {
    logger.info('📦 Attempting to import @whiskeysockets/baileys...');
    const mod = await import('@whiskeysockets/baileys');

    // 🔍 Log structure if something goes wrong later
    if (process.env.NODE_ENV !== 'production') {
      logger.info('🔍 Baileys import keys:', Object.keys(mod));
      if (mod.default) logger.info('🔍 Baileys.default keys:', Object.keys(mod.default));
    }

    // 🧩 Support multiple export structures across Node builds
    const makeWASocket =
      mod.makeWASocket ||
      mod.default?.makeWASocket ||
      mod.default?.default?.makeWASocket ||
      mod?.default?.WASocket ||
      null;

    const DisconnectReason =
      mod.DisconnectReason ||
      mod.default?.DisconnectReason ||
      mod.default?.default?.DisconnectReason ||
      null;

    // 🧠 Defensive check
    if (typeof makeWASocket !== 'function') {
      logger.error(
        `❌ Baileys module missing expected exports. Found keys: ${Object.keys(mod)}`
      );
      throw new Error('Baileys module missing expected exports');
    }

    baileysModule = { makeWASocket, DisconnectReason };
    logger.info('✅ Baileys (official) module successfully loaded');
    return baileysModule;
  } catch (err) {
    logger.error({ err }, '❌ Failed to import @whiskeysockets/baileys');
    throw err;
  }
}

module.exports = { loadBaileys };
