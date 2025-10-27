// src/api/helper/baileys-loader.js
let baileysModule = null;

async function loadBaileys() {
  if (baileysModule) return baileysModule;
  try {
    const mod = await import('@whiskeysockets/baileys');
    baileysModule = mod.default || mod;
    console.log('✅ Baileys ESM dynamically loaded');
    return baileysModule;
  } catch (err) {
    console.error('❌ Failed to import Baileys:', err);
    throw err;
  }
}

module.exports = { loadBaileys };
