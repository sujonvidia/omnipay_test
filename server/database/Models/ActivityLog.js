const mongoose = require('mongoose');
const { conna } = require('../util');

// Append-only feed backing the header Notifications + Recent popovers.
// Written explicitly at the point each event happens (customer created,
// quote charged, profile imported, etc.) rather than re-derived from other
// collections, so new event types can be logged here going forward without
// touching the read side.
const FinanceActivityLogSchema = new mongoose.Schema({
    company_id: { type: String, required: true, index: true },
    type: {
        type: String,
        required: true,
        enum: [
            'customer_created',
            'customer_profile_imported',
            'quote_created',
            'payment_charged',
            'payment_declined',
            'commission_recorded',
        ],
    },
    title: { type: String, required: true },
    sub: { type: String },
    ref_id: { type: mongoose.Schema.Types.ObjectId },
    ref_model: { type: String },
    actor_id: { type: String },
    has_delete: [String],
}, { timestamps: true });

FinanceActivityLogSchema.index({ company_id: 1, createdAt: -1 });

module.exports = {
    FinanceActivityLog: conna.model('FinanceActivityLog', FinanceActivityLogSchema),
};
