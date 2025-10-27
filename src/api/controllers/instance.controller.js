const { WhatsAppInstance } = require('../class/instance')
const fs = require('fs')
const path = require('path')
const config = require('../../config/config')
const { Session } = require('../class/session')
const logger = require('pino')({ level: process.env.LOG_LEVEL || 'info' })

// ----------------------------- INIT INSTANCE -----------------------------
exports.init = async (req, res) => {
    const key = req.query.key
    const webhook = !req.query.webhook ? false : req.query.webhook
    const webhookUrl = !req.query.webhookUrl ? null : req.query.webhookUrl
    const appUrl = config.appUrl || req.protocol + '://' + req.headers.host

    logger.info(`API: /instance/init called | key=${key} | webhook=${webhook} | webhookUrl=${webhookUrl}`)

    try {
        const instance = new WhatsAppInstance(key, webhook, webhookUrl)
        logger.info(`INIT: Created new WhatsAppInstance for key=${key}`)

        const data = await instance.init()
        logger.info(`INIT: instance.init() finished for key=${data.key}`)

        WhatsAppInstances[data.key] = instance
        logger.info(`INIT: WhatsAppInstances updated. Total active: ${Object.keys(WhatsAppInstances).length}`)

        const response = {
            error: false,
            message: 'Initializing successfully',
            key: data.key,
            webhook: { enabled: webhook, webhookUrl: webhookUrl },
            qrcode: { url: appUrl + '/instance/qr?key=' + data.key },
            browser: config.browser,
        }

        logger.info(`INIT: Responding success for key=${data.key}`)
        res.json(response)
    } catch (err) {
        logger.error({ err }, `INIT: Failed to initialize for key=${key}`)
        res.status(500).json({ error: true, message: 'Initialization failed', details: err.message })
    }
}

// ----------------------------- GET QR CODE -----------------------------
exports.qr = async (req, res) => {
    const key = req.query.key
    logger.info(`API: /instance/qr called | key=${key}`)

    try {
        const instance = WhatsAppInstances[key]
        if (!instance) {
            logger.warn(`QR: No instance found for key=${key}`)
            return res.render('qrcode', { qrcode: null })
        }

        const qrcode = await instance.instance.qr
        logger.info(`QR: Fetched QR value for key=${key} | present=${!!qrcode}`)

        res.render('qrcode', { qrcode })
    } catch (err) {
        logger.error({ err }, `QR: Error while fetching QR for key=${req.query.key}`)
        res.json({ error: true, message: 'Failed to get QR', details: err.message })
    }
}

// ----------------------------- GET QR BASE64 -----------------------------
exports.qrbase64 = async (req, res) => {
    const key = req.query.key
    logger.info(`API: /instance/qrbase64 called | key=${key}`)

    try {
        const qrcode = await WhatsAppInstances[key]?.instance.qr
        logger.info(`QRBASE64: QR exists=${!!qrcode} | key=${key}`)

        res.json({
            error: false,
            message: 'QR Base64 fetched successfully',
            qrcode: qrcode,
        })
    } catch (err) {
        logger.error({ err }, `QRBASE64: Failed for key=${key}`)
        res.json({ error: true, qrcode: '' })
    }
}

// ----------------------------- INSTANCE INFO -----------------------------
exports.info = async (req, res) => {
    const key = req.query.key
    logger.info(`API: /instance/info called | key=${key}`)

    const instance = WhatsAppInstances[key]
    let data

    try {
        data = await instance.getInstanceDetail(key)
        logger.info(`INFO: Instance detail fetched for key=${key}`)
    } catch (error) {
        data = {}
        logger.error({ error }, `INFO: Failed to fetch instance for key=${key}`)
    }

    return res.json({
        error: false,
        message: 'Instance fetched successfully',
        instance_data: data,
    })
}

// ----------------------------- RESTORE INSTANCES -----------------------------
exports.restore = async (req, res, next) => {
    logger.info('API: /instance/restore called')
    try {
        const session = new Session()
        let restoredSessions = await session.restoreSessions()
        logger.info(`RESTORE: ${restoredSessions.length} sessions restored`)
        return res.json({
            error: false,
            message: 'All instances restored',
            data: restoredSessions,
        })
    } catch (error) {
        logger.error({ error }, 'RESTORE: Failed to restore sessions')
        next(error)
    }
}

// ----------------------------- LOGOUT INSTANCE -----------------------------
exports.logout = async (req, res) => {
    const key = req.query.key
    logger.info(`API: /instance/logout called | key=${key}`)
    let errormsg

    try {
        await WhatsAppInstances[key].instance?.sock?.logout()
        logger.info(`LOGOUT: Logout successful for key=${key}`)
    } catch (error) {
        errormsg = error
        logger.error({ error }, `LOGOUT: Failed for key=${key}`)
    }

    return res.json({
        error: false,
        message: 'Logout successful',
        errormsg: errormsg ? errormsg : null,
    })
}

// ----------------------------- DELETE INSTANCE -----------------------------
exports.delete = async (req, res) => {
    const key = req.query.key
    logger.info(`API: /instance/delete called | key=${key}`)
    let errormsg

    try {
        await WhatsAppInstances[key].deleteInstance(key)
        delete WhatsAppInstances[key]
        logger.info(`DELETE: Instance deleted for key=${key}`)
    } catch (error) {
        errormsg = error
        logger.error({ error }, `DELETE: Failed to delete instance key=${key}`)
    }

    return res.json({
        error: false,
        message: 'Instance deleted successfully',
        data: errormsg ? errormsg : null,
    })
}

// ----------------------------- LIST INSTANCES -----------------------------
exports.list = async (req, res) => {
    logger.info(`API: /instance/list called | active=${req.query.active}`)

    try {
        if (req.query.active) {
            let instance = []
            const db = mongoClient.db('whatsapp-api')
            const result = await db.listCollections().toArray()
            result.forEach((collection) => instance.push(collection.name))

            logger.info(`LIST: Active instances from DB = ${instance.length}`)
            return res.json({
                error: false,
                message: 'All active instance',
                data: instance,
            })
        }

        let instance = Object.keys(WhatsAppInstances).map(async (key) =>
            WhatsAppInstances[key].getInstanceDetail(key)
        )
        let data = await Promise.all(instance)

        logger.info(`LIST: In-memory instances count=${data.length}`)

        return res.json({
            error: false,
            message: 'All instance listed',
            data: data,
        })
    } catch (err) {
        logger.error({ err }, 'LIST: Failed to list instances')
        res.status(500).json({ error: true, message: 'Failed to list instances' })
    }
}
