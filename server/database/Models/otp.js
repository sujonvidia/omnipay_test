const { conna } = require('../util')
const mongoose = require('mongoose')

// Single consolidated OTP mechanism for the whole app (signup verification,
// login step-up, forgot-password reset) — one collection, one code path.
// `expires_at` has a TTL index so Mongo garbage-collects expired codes
// automatically instead of relying on setTimeout (which is lost on restart).
const otpSchema = new mongoose.Schema({
    email: { type: String, required: true, lowercase: true, trim: true },
    code: { type: String, required: true },
    purpose: { type: String, enum: ['signup', 'login', 'forgot_password'], required: true },
    consumed: { type: Boolean, default: false },
    expires_at: { type: Date, required: true },
}, {
    timestamps: true
})

otpSchema.index({ email: 1, purpose: 1 });
otpSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = conna.model('OTP', otpSchema)
