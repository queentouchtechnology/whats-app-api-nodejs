// src/api/helper/baileys-loader.js
const logger = require('pino')();

let baileysModule = null;

/**
 * Dynamically loads the official @whiskeysockets/baileys package.
 * Works in both CommonJS (local) and ESM (Vercel) environments.
 */
async function loadBaileys() {
  if (baileysModule) return baileysModule;

  try {
    // Dynamically import Baileys (works with Node 18+ ESM in Vercel)
    const mod = await import('@whiskeysockets/baileys');

    // Normalize exports for both ESM and CommonJS
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
      logger.error(
        `❌ Baileys module missing expected exports. Found keys: ${Object.keys(mod)}`
      );
      throw new Error('Baileys module missing expected exports');
    }

    baileysModule = { makeWASocket, DisconnectReason };
    logger.info('✅ Baileys (official) module successfully loaded');
    return baileysModule;
  } catch (err) {
    logger.error({ err }, '❌ Failed to import official @whiskeysockets/baileys');
    throw err;
  }
}

module.exports = { loadBaileys };
