// src/api/helper/baileys-loader.js
const logger = require('pino')();

let baileysModule = null;

/**
 * Dynamically imports the official @whiskeysockets/baileys package.
 * Handles ESM variations in Node 18+ and Vercel environments.
 */
async function loadBaileys() {
  if (baileysModule) return baileysModule;

  try {
    const mod = await import('@whiskeysockets/baileys');

    // Try multiple known export shapes (covers Vercel & local)
    const makeWASocket =
      mod.makeWASocket ||
      mod.default?.makeWASocket ||
      mod.default?.default?.makeWASocket ||
      null;

    const DisconnectReason =
      mod.DisconnectReason ||
      mod.default?.DisconnectReason ||
      mod.default?.default?.DisconnectReason ||
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
    logger.error({ err }, '❌ Failed to import @whiskeysockets/baileys');
    throw err;
  }
}

module.exports = { loadBaileys };
