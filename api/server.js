// api/server.js

const dotenv = require("dotenv");
const mongoose = require("mongoose");
const logger = require("pino")();
dotenv.config();

const app = require("../src/config/express");
const config = require("../src/config/config");
const { Session } = require("../src/api/class/session");
const connectToCluster = require("../src/api/helper/connectMongoClient");

// ---------------------------------------------
// ⚙️ MongoDB Connection (only connect if not connected)
// ---------------------------------------------
if (config.mongoose.enabled) {
  mongoose.set("strictQuery", true);

  if (mongoose.connection.readyState === 0) {
    mongoose
      .connect(config.mongoose.url, config.mongoose.options)
      .then(() => {
        logger.info("✅ Connected to MongoDB");
      })
      .catch((err) => logger.error("❌ MongoDB Connection Error:", err));
  }
}

// ---------------------------------------------
// 🧠 Restore Sessions (only when enabled)
// ---------------------------------------------
(async () => {
  try {
    global.mongoClient = await connectToCluster(config.mongoose.url);

    if (config.restoreSessionsOnStartup) {
      logger.info("🔁 Restoring Sessions");
      const session = new Session();
      const restored = await session.restoreSessions();
      logger.info(`${restored.length} Session(s) Restored`);
    }
  } catch (err) {
    logger.error("⚠️ Error restoring sessions:", err);
  }
})();

// ---------------------------------------------
// 🚀 Root route for testing
// ---------------------------------------------
app.get("/", (req, res) => {
  res.send("✅ WhatsApp API running successfully on Vercel!");
});

// ---------------------------------------------
// ❗ No app.listen() on Vercel
// ---------------------------------------------
module.exports = app;
