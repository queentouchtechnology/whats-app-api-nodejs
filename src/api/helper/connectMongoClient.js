// src/api/helper/connectMongoClient.js

const { MongoClient } = require('mongodb');
const logger = require('pino')();

let cachedClient = null;

/**
 * Creates or reuses a MongoDB connection.
 * Works in both local and serverless (Vercel) environments.
 */
async function connectToCluster(uri) {
  if (!uri) {
    logger.error('❌ MongoDB URI missing! Set MONGO_URL in environment variables.');
    throw new Error('MongoDB connection URI missing');
  }

  // ✅ Return cached connection if available
  if (cachedClient && cachedClient.topology?.isConnected()) {
    return cachedClient;
  }

  try {
    logger.info('STATE: Connecting to MongoDB...');
    const client = new MongoClient(uri, {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    });

    await client.connect();
    logger.info('STATE: Successfully connected to MongoDB ✅');

    cachedClient = client;
    return cachedClient;
  } catch (error) {
    logger.error({ error }, '❌ STATE: Connection to MongoDB failed!');
    // ❌ Never call process.exit() in serverless — just rethrow the error
    throw error;
  }
}

module.exports = connectToCluster;
