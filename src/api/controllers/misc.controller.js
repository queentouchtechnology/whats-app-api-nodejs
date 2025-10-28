const { WhatsAppInstance } = require('../class/instance');
const connectToCluster = require('../helper/connectMongoClient');
const logger = require('pino')({ level: process.env.LOG_LEVEL || 'info' });

// 🔧 Helper: Restore WhatsApp instance from MongoDB if missing (Vercel-safe)
async function getOrRestoreInstance(key) {
    if (WhatsAppInstances[key]) return WhatsAppInstances[key];

    const client =
        global.mongoClient ||
        (global.mongoClient = await connectToCluster(process.env.MONGO_URL));

    const db = client.db('whatsapp-api');
    const collections = await db.listCollections().toArray();
    const exists = collections.find((c) => c.name === key);

    if (!exists) throw new Error('invalid key supplied');

    logger.warn(`🧠 Auto-restoring WhatsApp instance for key=${key}`);
    const instance = new WhatsAppInstance(key, false, null);
    await instance.init();
    WhatsAppInstances[key] = instance;
    return instance;
}

// ----------------------------- CHECK IF NUMBER IS ON WHATSAPP -----------------------------
exports.onWhatsapp = async (req, res) => {
    const key = req.query.key;
    const id = req.query.id;

    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.verifyId(instance.getWhatsAppId(id));
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `onWhatsapp: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- DOWNLOAD PROFILE PICTURE -----------------------------
exports.downProfile = async (req, res) => {
    const key = req.query.key;
    const id = req.query.id;

    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.DownloadProfile(id);
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `downProfile: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- GET USER STATUS -----------------------------
exports.getStatus = async (req, res) => {
    const key = req.query.key;
    const id = req.query.id;

    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.getUserStatus(id);
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `getStatus: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- BLOCK OR UNBLOCK USER -----------------------------
exports.blockUser = async (req, res) => {
    const key = req.query.key;
    const id = req.query.id;
    const blockStatus = req.query.block_status;

    try {
        const instance = await getOrRestoreInstance(key);
        await instance.blockUnblock(id, blockStatus);

        const message =
            blockStatus === 'block'
                ? 'Contact Blocked'
                : 'Contact Unblocked';

        return res.status(201).json({ error: false, message });
    } catch (err) {
        logger.error({ err }, `blockUser: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- UPDATE PROFILE PICTURE -----------------------------
exports.updateProfilePicture = async (req, res) => {
    const key = req.query.key;
    const { id, url } = req.body;

    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.updateProfilePicture(id, url);
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `updateProfilePicture: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- GET USER OR GROUP BY ID -----------------------------
exports.getUserOrGroupById = async (req, res) => {
    const key = req.query.key;
    const id = req.query.id;

    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.getUserOrGroupById(id);
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `getUserOrGroupById: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};
