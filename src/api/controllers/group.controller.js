const { WhatsAppInstance } = require('../class/instance');
const connectToCluster = require('../helper/connectMongoClient');
const logger = require('pino')({ level: process.env.LOG_LEVEL || 'info' });

// 🔧 Helper: Restore instance from MongoDB if missing (Vercel stateless fix)
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

// ----------------------------- CREATE GROUP -----------------------------
exports.create = async (req, res) => {
    const key = req.query.key;
    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.createNewGroup(req.body.name, req.body.users);
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `GROUP_CREATE: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- ADD NEW PARTICIPANT -----------------------------
exports.addNewParticipant = async (req, res) => {
    const key = req.query.key;
    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.addNewParticipant(req.body.id, req.body.users);
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `ADD_PARTICIPANT: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- MAKE ADMIN -----------------------------
exports.makeAdmin = async (req, res) => {
    const key = req.query.key;
    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.makeAdmin(req.body.id, req.body.users);
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `MAKE_ADMIN: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- DEMOTE ADMIN -----------------------------
exports.demoteAdmin = async (req, res) => {
    const key = req.query.key;
    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.demoteAdmin(req.body.id, req.body.users);
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `DEMOTE_ADMIN: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- LIST ALL GROUPS -----------------------------
exports.listAll = async (req, res) => {
    const key = req.query.key;
    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.getAllGroups(key);
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `LIST_ALL_GROUPS: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- LEAVE GROUP -----------------------------
exports.leaveGroup = async (req, res) => {
    const key = req.query.key;
    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.leaveGroup(req.query.id);
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `LEAVE_GROUP: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- GET INVITE CODE -----------------------------
exports.getInviteCodeGroup = async (req, res) => {
    const key = req.query.key;
    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.getInviteCodeGroup(req.query.id);
        return res.status(201).json({
            error: false,
            link: 'https://chat.whatsapp.com/' + data,
        });
    } catch (err) {
        logger.error({ err }, `INVITE_CODE: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- GET INSTANCE INVITE CODE -----------------------------
exports.getInstanceInviteCodeGroup = async (req, res) => {
    const key = req.query.key;
    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.getInstanceInviteCodeGroup(req.query.id);
        return res.status(201).json({
            error: false,
            link: 'https://chat.whatsapp.com/' + data,
        });
    } catch (err) {
        logger.error({ err }, `INSTANCE_INVITE_CODE: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- FETCH ALL GROUPS -----------------------------
exports.getAllGroups = async (req, res) => {
    const key = req.query.key;
    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.groupFetchAllParticipating();
        return res.json({
            error: false,
            message: 'Groups fetched successfully',
            instance_data: data,
        });
    } catch (err) {
        logger.error({ err }, `GET_ALL_GROUPS: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- UPDATE GROUP PARTICIPANTS -----------------------------
exports.groupParticipantsUpdate = async (req, res) => {
    const key = req.query.key;
    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.groupParticipantsUpdate(
            req.body.id,
            req.body.users,
            req.body.action
        );
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `GROUP_PARTICIPANTS_UPDATE: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- UPDATE GROUP SETTINGS -----------------------------
exports.groupSettingUpdate = async (req, res) => {
    const key = req.query.key;
    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.groupSettingUpdate(
            req.body.id,
            req.body.action
        );
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `GROUP_SETTING_UPDATE: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- UPDATE GROUP SUBJECT -----------------------------
exports.groupUpdateSubject = async (req, res) => {
    const key = req.query.key;
    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.groupUpdateSubject(req.body.id, req.body.subject);
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `GROUP_SUBJECT_UPDATE: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- UPDATE GROUP DESCRIPTION -----------------------------
exports.groupUpdateDescription = async (req, res) => {
    const key = req.query.key;
    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.groupUpdateDescription(
            req.body.id,
            req.body.description
        );
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `GROUP_DESC_UPDATE: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- GET INVITE INFO -----------------------------
exports.groupInviteInfo = async (req, res) => {
    const key = req.query.key;
    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.groupGetInviteInfo(req.body.code);
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `GROUP_INVITE_INFO: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};

// ----------------------------- JOIN GROUP VIA INVITE -----------------------------
exports.groupJoin = async (req, res) => {
    const key = req.query.key;
    try {
        const instance = await getOrRestoreInstance(key);
        const data = await instance.groupAcceptInvite(req.body.code);
        return res.status(201).json({ error: false, data });
    } catch (err) {
        logger.error({ err }, `GROUP_JOIN: Failed for key=${key}`);
        return res.status(400).json({ error: true, message: err.message });
    }
};
