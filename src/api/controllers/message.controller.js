const { WhatsAppInstance } = require('../class/instance');
const connectToCluster = require('../helper/connectMongoClient');
const logger = require('pino')({ level: process.env.LOG_LEVEL || 'info' });

// 🔧 Helper: Restore WhatsApp instance from MongoDB if missing (stateless fix)
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

// ----------------------------- SEND TEXT -----------------------------
exports.Text = async (req, res) => {
    const key = req.query.key;
    const { id, message } = req.body;

    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.sendTextMessage(id, message);
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `TEXT: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- SEND IMAGE -----------------------------
exports.Image = async (req, res) => {
    const key = req.query.key;

    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.sendMediaFile(
            req.body.id,
            req.file,
            'image',
            req.body?.caption
        );
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `IMAGE: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- SEND VIDEO -----------------------------
exports.Video = async (req, res) => {
    const key = req.query.key;

    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.sendMediaFile(
            req.body.id,
            req.file,
            'video',
            req.body?.caption
        );
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `VIDEO: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- SEND AUDIO -----------------------------
exports.Audio = async (req, res) => {
    const key = req.query.key;

    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.sendMediaFile(req.body.id, req.file, 'audio');
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `AUDIO: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- SEND DOCUMENT -----------------------------
exports.Document = async (req, res) => {
    const key = req.query.key;

    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.sendMediaFile(
            req.body.id,
            req.file,
            'document',
            '',
            req.body.filename
        );
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `DOCUMENT: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- SEND MEDIA BY URL -----------------------------
exports.Mediaurl = async (req, res) => {
    const key = req.query.key;

    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.sendUrlMediaFile(
            req.body.id,
            req.body.url,
            req.body.type, // [image, video, audio, document]
            req.body.mimetype,
            req.body.caption
        );
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `MEDIAURL: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- SEND BUTTON -----------------------------
exports.Button = async (req, res) => {
    const key = req.query.key;

    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.sendButtonMessage(req.body.id, req.body.btndata);
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `BUTTON: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- SEND CONTACT -----------------------------
exports.Contact = async (req, res) => {
    const key = req.query.key;

    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.sendContactMessage(req.body.id, req.body.vcard);
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `CONTACT: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- SEND LIST -----------------------------
exports.List = async (req, res) => {
    const key = req.query.key;

    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.sendListMessage(req.body.id, req.body.msgdata);
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `LIST: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- SEND MEDIA BUTTON -----------------------------
exports.MediaButton = async (req, res) => {
    const key = req.query.key;

    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.sendMediaButtonMessage(
            req.body.id,
            req.body.btndata
        );
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `MEDIABUTTON: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- SET STATUS -----------------------------
exports.SetStatus = async (req, res) => {
    const key = req.query.key;
    const validStatus = ['unavailable', 'available', 'composing', 'recording', 'paused'];

    if (!validStatus.includes(req.body.status)) {
        return res.status(400).json({
            error: true,
            message: 'status parameter must be one of ' + validStatus.join(', '),
        });
    }

    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.setStatus(req.body.status, req.body.id);
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `SETSTATUS: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- READ MESSAGE -----------------------------
exports.Read = async (req, res) => {
    const key = req.query.key;

    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.readMessage(req.body.msg);
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `READ: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- REACT TO MESSAGE -----------------------------
exports.React = async (req, res) => {
    const key = req.query.key;

    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.reactMessage(
            req.body.id,
            req.body.key,
            req.body.emoji
        );
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `REACT: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};
