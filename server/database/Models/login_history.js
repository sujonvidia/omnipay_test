const { conna } = require('../util')
const mongoose = require('mongoose')

const loginHistorySchema = new mongoose.Schema({
    user_id: { type: String, default: "" },
    company_id: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
    os_name: { type: String, default: "" },
    os_version: { type: String, default: "" },
    ua_client: { type: String, default: "" },
    ua_client_version: { type: String, default: "" },
    login_status: { type: Boolean, default: false },
}, {
    timestamps: true
})

loginHistorySchema.index({ user_id: 1 });

module.exports = conna.model('login_history', loginHistorySchema)
