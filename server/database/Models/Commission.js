const mongoose = require('mongoose');
const { conna } = require('../util');

// Ledger record of the revenue split on an auto-charged quote. This is
// bookkeeping only — CardPointe deposits the full gross_amount into the
// single omnipay merchant account (MID); there is no real fund routing to
// a second account. commission_amount + net_amount always sum to gross_amount.
const FinanceCommissionSchema = new mongoose.Schema({
    company_id:       { type: String, required: true, index: true },
    quote_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceQuote', required: true },
    transaction_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceTransaction', required: true },
    customer_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceCustomer' },
    customer_name:    { type: String },
    retref:           { type: String, required: true },
    gross_amount:     { type: Number, required: true },
    commission_rate:  { type: Number, required: true },   // percent, snapshot at charge time
    commission_amount:{ type: Number, required: true },   // taken by the other service
    net_amount:       { type: Number, required: true },   // remainder paid to the omnipay channel
    currency:         { type: String, default: 'USD' },
    status:           { type: String, enum: ['recorded', 'reversed'], default: 'recorded' },
    has_delete:       [String],
}, { timestamps: true });

FinanceCommissionSchema.index({ company_id: 1, quote_id: 1 });
FinanceCommissionSchema.index({ company_id: 1, createdAt: -1 });

module.exports = {
    FinanceCommission: conna.model('FinanceCommission', FinanceCommissionSchema),
};
