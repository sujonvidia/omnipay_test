const { conna } = require('../util')
const mongoose = require('mongoose')
const { v4: uuidv4 } = require('uuid')

const userSchema = new mongoose.Schema({
    id: { type: String, default: uuidv4, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    firstname: { type: String, default: "", required: true },
    lastname: { type: String, default: "" },
    phone: { type: String, default: "" },
    company_id: { type: String, default: "" },
    // 'admin' = created the company at signup, 'member' = joined an existing one
    role: { type: String, enum: ['admin', 'member'], default: 'admin' },
    is_verified: { type: Boolean, default: false },
    is_active: { type: Number, default: 1 },
    is_delete: { type: Number, default: 0 },
    login_total: { type: Number, default: 0 },
    last_login: { type: Date, default: Date.now },
    timezone: { type: String, default: "" },
    created_by: { type: String, default: "" },
    // Per-user CardPointe tokenized card (stored payment profile)
    cardpointe_profile_id: { type: String, default: null },
    cardpointe_acct_id: { type: String, default: null },
}, {
    timestamps: true
})

userSchema.index({ id: 1 });
userSchema.index({ email: 1, company_id: 1 });
userSchema.index({ company_id: 1 });

module.exports = conna.model('User', userSchema)
