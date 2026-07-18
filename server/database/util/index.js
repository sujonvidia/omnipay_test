const mongoose = require('mongoose')

// Fail loud at boot if the URL is missing — without it createConnection
// returns a dead Connection that buffers every query for 10s then rejects
// with `Operation 'users.findOne()' buffering timed out`.
if (!process.env.MONGO_DB_URL) {
    console.error('[mongo] FATAL: MONGO_DB_URL is not set — every DB query will buffer-timeout');
}

const conna = mongoose.createConnection(process.env.MONGO_DB_URL)

const ts = () => new Date().toISOString()
conna.on('connected',    () => console.log('[' + ts() + '] [mongo] connected host=' + (conna.host || '?') + ' db=' + (conna.name || '?')))
conna.on('disconnected', () => console.error('[' + ts() + '] [mongo] disconnected — queries will buffer until reconnect or timeout'))
conna.on('reconnected',  () => console.log('[' + ts() + '] [mongo] reconnected'))
conna.on('error',        (err) => console.error('[' + ts() + '] [mongo] error: ' + (err && err.message ? err.message : String(err))))

module.exports.conna = conna

module.exports.isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id)
}
