const { WhatsAppInstance } = require('../class/instance');
const { Session } = require('../class/session');
const config = require('../../config/config');
const logger = require('pino')({ level: process.env.LOG_LEVEL || 'info' });
const connectToCluster = require('../helper/connectMongoClient');

// 🔧 Helper: auto restore instance if missing in memory (serverless safe)
async function getOrRestoreInstance(key) {
    if (WhatsAppInstances[key]) return WhatsAppInstances[key];

    const client =
        global.mongoClient ||
        (global.mongoClient = await connectToCluster(process.env.MONGO_URL));

    const db = client.db('whatsapp-api');
    const collections = await db.listCollections().toArray();
    const exists = collections.find((c) => c.name === key);

    if (!exists) throw new Error('invalid key supplied');

    logger.warn(`🧠 Auto-restoring instance for key=${key} from MongoDB`);
    const instance = new WhatsAppInstance(key, false, null);
    await instance.init();
    WhatsAppInstances[key] = instance;
    return instance;
}

// ----------------------------- INIT INSTANCE -----------------------------
exports.init = async (req, res) => {
    const key = req.query.key;
    const webhook = !req.query.webhook ? false : req.query.webhook;
    const webhookUrl = !req.query.webhookUrl ? null : req.query.webhookUrl;
    const appUrl = config.appUrl || req.protocol + '://' + req.headers.host;

    logger.info(`API: /instance/init called | key=${key}`);

    try {
        const instance = new WhatsAppInstance(key, webhook, webhookUrl);
        const data = await instance.init();
        WhatsAppInstances[data.key] = instance;

        res.json({
            error: false,
            message: 'Initializing successfully',
            key: data.key,
            webhook: { enabled: webhook, webhookUrl },
            qrcode: { url: appUrl + '/instance/qr?key=' + data.key },
            browser: config.browser,
        });
    } catch (err) {
        logger.error({ err }, `INIT: Failed to initialize for key=${key}`);
        res.status(500).json({
            error: true,
            message: 'Initialization failed',
            details: err.message,
        });
    }
};

// ----------------------------- GET QR CODE -----------------------------
exports.qr = async (req, res) => {
    const key = req.query.key;
    logger.info(`API: /instance/qr called | key=${key}`);

    try {
        const instance = await getOrRestoreInstance(key);
        let qrcode = instance?.instance.qr;

        if (!qrcode) {
            logger.warn(`QR: No in-memory QR for key=${key}, checking MongoDB...`);
            const db = global.mongoClient.db('whatsapp-api');
            const record = await db.collection(key).findOne({ _id: 'qrCode' });
            qrcode = record?.qr || null;
        }

        res.render('qrcode', { qrcode });
    } catch (err) {
        logger.error({ err }, `QR: Error fetching QR for key=${key}`);
        res.json({
            error: true,
            message: 'Failed to get QR',
            details: err.message,
        });
    }
};

// ----------------------------- GET QR BASE64 -----------------------------
exports.qrbase64 = async (req, res) => {
    const key = req.query.key;
    logger.info(`API: /instance/qrbase64 called | key=${key}`);

    try {
        const instance = await getOrRestoreInstance(key);
        let qrcode = instance?.instance.qr;

        if (!qrcode) {
            const db = global.mongoClient.db('whatsapp-api');
            const record = await db.collection(key).findOne({ _id: 'qrCode' });
            qrcode = record?.qr || null;
        }

        res.json({
            error: false,
            message: 'QR Base64 fetched successfully',
            qrcode,
        });
    } catch (err) {
        logger.error({ err }, `QRBASE64: Failed for key=${key}`);
        res.json({ error: true, qrcode: '' });
    }
};

// ----------------------------- INSTANCE INFO -----------------------------
exports.info = async (req, res) => {
    const key = req.query.key;
    logger.info(`API: /instance/info called | key=${key}`);

    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.getInstanceDetail(key);

        return res.json({
            error: false,
            message: 'Instance fetched successfully',
            instance_data: data,
        });
    } catch (err) {
        logger.error({ err }, `INFO: Failed to fetch instance for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- RESTORE INSTANCES -----------------------------
exports.restore = async (req, res, next) => {
    logger.info('API: /instance/restore called');
    try {
        const session = new Session();
        const restoredSessions = await session.restoreSessions();
        logger.info(`RESTORE: ${restoredSessions.length} sessions restored`);
        return res.json({
            error: false,
            message: 'All instances restored',
            data: restoredSessions,
        });
    } catch (error) {
        logger.error({ error }, 'RESTORE: Failed to restore sessions');
        next(error);
    }
};

// ----------------------------- LOGOUT INSTANCE -----------------------------
exports.logout = async (req, res) => {
    const key = req.query.key;
    logger.info(`API: /instance/logout called | key=${key}`);

    try {
        const instance = await getOrRestoreInstance(key);
        await instance.instance?.sock?.logout();
        logger.info(`LOGOUT: Logout successful for key=${key}`);

        return res.json({
            error: false,
            message: 'Logout successful',
        });
    } catch (error) {
        logger.error({ error }, `LOGOUT: Failed for key=${key}`);
        return res.status(400).json({
            error: true,
            message: 'Logout failed',
            details: error.message,
        });
    }
};

// ----------------------------- DELETE INSTANCE -----------------------------
exports.delete = async (req, res) => {
    const key = req.query.key;
    logger.info(`API: /instance/delete called | key=${key}`);

    try {
        const instance = await getOrRestoreInstance(key);
        await instance.deleteInstance(key);
        delete WhatsAppInstances[key];

        logger.info(`DELETE: Instance deleted for key=${key}`);
        return res.json({
            error: false,
            message: 'Instance deleted successfully',
        });
    } catch (error) {
        logger.error({ error }, `DELETE: Failed for key=${key}`);
        return res.status(400).json({
            error: true,
            message: 'Failed to delete instance',
            details: error.message,
        });
    }
};

// ----------------------------- LIST INSTANCES -----------------------------
exports.list = async (req, res) => {
    logger.info(`API: /instance/list called | active=${req.query.active}`);

    try {
        const client =
            global.mongoClient ||
            (global.mongoClient = await connectToCluster(process.env.MONGO_URL));

        const db = client.db('whatsapp-api');

        if (req.query.active) {
            const result = await db.listCollections().toArray();
            const instanceNames = result.map((c) => c.name);
            logger.info(`LIST: Active instances = ${instanceNames.length}`);
            return res.json({
                error: false,
                message: 'All active instances from DB',
                data: instanceNames,
            });
        }

        const instances = Object.keys(WhatsAppInstances).map((key) =>
            WhatsAppInstances[key].getInstanceDetail(key)
        );
        const data = await Promise.all(instances);

        return res.json({
            error: false,
            message: 'All in-memory instances listed',
            data,
        });
    } catch (err) {
        logger.error({ err }, 'LIST: Failed to list instances');
        res.status(500).json({
            error: true,
            message: 'Failed to list instances',
        });
    }
};
