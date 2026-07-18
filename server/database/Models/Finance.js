const mongoose = require('mongoose');
const { conna } = require('../util');

// ─── Shared sub-schemas ───────────────────────────────────────────────────────

const LineItemSchema = new mongoose.Schema({
    description:  { type: String, required: true },
    quantity:     { type: Number, required: true, min: 0 },
    unit_price:   { type: Number, required: true, min: 0 },
    amount:       { type: Number, required: true },
    tax_rate:     { type: Number, default: 0 },
    product_code: { type: String },
}, { _id: false });

// ─── FinanceCustomer ──────────────────────────────────────────────────────────
// Accounts: contact info, payment terms, risk profile, CardPointe token
const FinanceCustomerSchema = new mongoose.Schema({
    company_id:          { type: String, required: true, index: true },
    name:                { type: String, required: true },
    email:               { type: String },
    phone:               { type: String },
    address: {
        line1:   String,
        city:    String,
        state:   String,
        zip:     String,
        country: { type: String, default: 'US' },
    },
    contact_name:        { type: String },
    payment_terms:       { type: String, enum: ['net15', 'net30', 'net45', 'net60', 'due_on_receipt'], default: 'net30' },
    currency:            { type: String, default: 'USD' },
    credit_limit:        { type: Number, default: 0 },
    credit_used:         { type: Number, default: 0 },
    risk_level:          { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    avg_days_to_pay:     { type: Number, default: 0 },
    // CardPointe tokenized card — from /profile API
    cardpointe_profile_id: { type: String },
    cardpointe_acct_id:    { type: String },
    notes:               { type: String },
    has_delete:          [String],
}, { timestamps: true });

FinanceCustomerSchema.index({ company_id: 1, name: 1 });

// ─── FinanceInvoice ───────────────────────────────────────────────────────────
// Core invoice record. retref links to CardPointe transaction after payment.
const FinanceInvoiceSchema = new mongoose.Schema({
    company_id:    { type: String, required: true, index: true },
    invoice_number:{ type: String, required: true },
    customer_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceCustomer', required: true },
    customer_name: { type: String, required: true },
    line_items:    [LineItemSchema],
    subtotal:      { type: Number, required: true },
    discount:      { type: Number, default: 0 },
    tax_rate:      { type: Number, default: 0 },
    tax_amount:    { type: Number, default: 0 },
    total:         { type: Number, required: true },
    currency:      { type: String, default: 'USD' },
    status: {
        type: String,
        enum: ['draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'cancelled'],
        default: 'draft',
    },
    issued_date:   { type: Date },
    due_date:      { type: Date },
    paid_date:     { type: Date },
    amount_paid:   { type: Number, default: 0 },
    // CardPointe integration
    retref:        { type: String },           // from /inquire after payment
    payment_method:{ type: String, enum: ['card', 'ach', 'check', 'cash', 'other'] },
    // Internal
    created_by:    { type: String },
    notes:         { type: String },
    has_delete:    [String],
}, { timestamps: true });

FinanceInvoiceSchema.index({ company_id: 1, status: 1 });
FinanceInvoiceSchema.index({ company_id: 1, due_date: 1 });
FinanceInvoiceSchema.index({ retref: 1 }, { sparse: true });

// ─── FinanceQuote ─────────────────────────────────────────────────────────────
const FinanceQuoteSchema = new mongoose.Schema({
    company_id:    { type: String, required: true, index: true },
    quote_number:  { type: String, required: true },
    customer_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceCustomer', required: true },
    customer_name: { type: String, required: true },
    line_items:    [LineItemSchema],
    subtotal:      { type: Number, required: true },
    discount:      { type: Number, default: 0 },
    tax_rate:      { type: Number, default: 0 },
    tax_amount:    { type: Number, default: 0 },
    total:         { type: Number, required: true },
    currency:      { type: String, default: 'USD' },
    status: {
        type: String,
        enum: ['draft', 'sent', 'pending_approval', 'approved', 'rejected', 'expired', 'converted'],
        default: 'draft',
    },
    priority:      { type: String, enum: ['standard', 'high', 'urgent'], default: 'standard' },
    created_by:    { type: String },
    submitted_by:  { type: String },
    approved_by:   { type: String },
    rejected_by:   { type: String },
    created_at:    { type: Date, default: Date.now },
    valid_until:   { type: Date },
    approved_at:   { type: Date },
    converted_invoice_id: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceInvoice' },
    notes:         { type: String },
    has_delete:    [String],
}, { timestamps: true });

FinanceQuoteSchema.index({ company_id: 1, status: 1 });

// ─── FinanceApproval ──────────────────────────────────────────────────────────
// Tracks each approval request with full audit trail
const FinanceApprovalSchema = new mongoose.Schema({
    company_id:   { type: String, required: true, index: true },
    quote_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceQuote', required: true },
    quote_number: { type: String },
    customer_name:{ type: String },
    amount:       { type: Number, required: true },
    requested_by: { type: String, required: true },
    approver_id:  { type: String },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'escalated', 'expired'],
        default: 'pending',
    },
    priority:     { type: String, enum: ['standard', 'high', 'urgent'], default: 'standard' },
    submitted_at: { type: Date, default: Date.now },
    decided_at:   { type: Date },
    decision_note:{ type: String },
    // Rule that triggered this approval requirement
    threshold_level: { type: Number },
    has_delete:   [String],
}, { timestamps: true });

FinanceApprovalSchema.index({ company_id: 1, status: 1 });

// ─── FinanceCollection ────────────────────────────────────────────────────────
// Follow-up and collections activity log per invoice
const FinanceCollectionSchema = new mongoose.Schema({
    company_id:   { type: String, required: true, index: true },
    invoice_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceInvoice', required: true },
    customer_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceCustomer', required: true },
    customer_name:{ type: String },
    action_type: {
        type: String,
        enum: ['email_reminder', 'phone_call', 'sms', 'escalation', 'legal', 'note'],
        required: true,
    },
    sent_by:      { type: String },
    sent_at:      { type: Date, default: Date.now },
    response_at:  { type: Date },
    response_text:{ type: String },
    outcome: {
        type: String,
        enum: ['no_response', 'promised', 'partial_paid', 'paid', 'disputed', 'escalated'],
        default: 'no_response',
    },
    next_followup_at: { type: Date },
    notes:        { type: String },
    has_delete:   [String],
}, { timestamps: true });

FinanceCollectionSchema.index({ company_id: 1, invoice_id: 1 });

// ─── FinanceTransaction ───────────────────────────────────────────────────────
// Mirror of CardPointe transaction data stored locally for audit + offline use
const FinanceTransactionSchema = new mongoose.Schema({
    company_id:      { type: String, required: true, index: true },
    merchant_id:     { type: String },
    retref:          { type: String, required: true, unique: true },
    amount:          { type: Number, required: true },      // decimal dollars as CardPointe returns (e.g. 1.50)
    currency:        { type: String, default: 'USD' },
    authcode:        { type: String },
    authdate:        { type: String },                      // YYYYMMDD from CardPointe
    card_last_four:  { type: String },
    cardholder_name: { type: String },
    respstat:        { type: String, enum: ['A', 'B', 'C'] },
    resptext:        { type: String },
    setlstat:        { type: String },
    entrymode:       { type: String },
    voidable:        { type: String, enum: ['Y', 'N'] },
    refundable:      { type: String, enum: ['Y', 'N'] },
    // Link to invoice or quote if payment was matched
    invoice_id:      { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceInvoice' },
    quote_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceQuote' },
    // Void/refund tracking
    voided_at:       { type: Date },
    voided_retref:   { type: String },
    refunded_at:     { type: Date },
    refunded_retref: { type: String },
    refunded_amount: { type: Number },
    // Raw CardPointe response kept for dispute resolution
    raw_response:    { type: mongoose.Schema.Types.Mixed },
    synced_at:       { type: Date, default: Date.now },
    has_delete:      [String],
}, { timestamps: true });

FinanceTransactionSchema.index({ company_id: 1, retref: 1 });
FinanceTransactionSchema.index({ company_id: 1, respstat: 1 });

// ─── FinanceSettings ──────────────────────────────────────────────────────────
// Per-company finance configuration
const ApprovalThresholdSchema = new mongoose.Schema({
    level:       { type: Number, required: true },   // 1 = first approver, 2 = escalation, etc.
    min_amount:  { type: Number, required: true },
    max_amount:  { type: Number },                   // undefined = no cap
    approvers:   [String],                           // user IDs
    label:       { type: String },
}, { _id: false });

const FinanceSettingsSchema = new mongoose.Schema({
    company_id:           { type: String, required: true, unique: true },
    business_name:        { type: String },
    tax_id:               { type: String },
    base_currency:        { type: String, default: 'USD' },
    supported_currencies: [String],
    default_payment_terms:{ type: String, default: 'net30' },
    late_fee_percent:     { type: Number, default: 0 },
    invoice_prefix:       { type: String, default: 'INV' },
    quote_prefix:         { type: String, default: 'Q' },
    next_invoice_seq:     { type: Number, default: 1001 },
    next_quote_seq:       { type: Number, default: 1001 },
    // Revenue-share taken on each auto-charged quote (ledger split only —
    // CardPointe deposits the full amount into this one merchant account;
    // this just records how much of it counts as commission vs. net payout).
    commission_rate_percent: { type: Number, default: 5 },
    tax_rules: [{
        name:      { type: String },
        rate:      { type: Number },
        region:    { type: String },
        applies_to:{ type: String, enum: ['all', 'products', 'services'], default: 'all' },
        _id:       false,
    }],
    approval_thresholds:  [ApprovalThresholdSchema],
    payment_gateway: {
        provider:       { type: String, default: 'cardpointe' },
        merchant_id:    { type: String },
        environment:    { type: String, enum: ['sandbox', 'production'], default: 'sandbox' },
        connected:      { type: Boolean, default: false },
        connected_at:   { type: Date },
    },
    // Notification settings
    reminder_days_before_due:  { type: Number, default: 3 },
    reminder_days_after_due:   [{ type: Number }],    // e.g. [1, 7, 14, 30]
    auto_reminders_enabled:    { type: Boolean, default: false },
}, { timestamps: true });

// ─── Exports ──────────────────────────────────────────────────────────────────

const FinanceCustomer    = conna.model('FinanceCustomer',    FinanceCustomerSchema);
const FinanceInvoice     = conna.model('FinanceInvoice',     FinanceInvoiceSchema);
const FinanceQuote       = conna.model('FinanceQuote',       FinanceQuoteSchema);
const FinanceApproval    = conna.model('FinanceApproval',    FinanceApprovalSchema);
const FinanceCollection  = conna.model('FinanceCollection',  FinanceCollectionSchema);
const FinanceTransaction = conna.model('FinanceTransaction', FinanceTransactionSchema);
const FinanceSettings    = conna.model('FinanceSettings',    FinanceSettingsSchema);

module.exports = {
    FinanceCustomer,
    FinanceInvoice,
    FinanceQuote,
    FinanceApproval,
    FinanceCollection,
    FinanceTransaction,
    FinanceSettings,
};
