const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const { verifyFinanceAccess } = require('../../helper/context');
const User = require('../../database/Models/user');

// ── CardPointe / Fiserv payment integration ───────────────────────────────────
const {
    inquireTransaction,
    getTransactionSummary,
    getSettlementStatus,
    getFunding,
    voidTransaction,
    refundTransaction,
    inquireMerchant,
    getBinInfo,
    getGatewayInfo,
    createProfile,
    getProfile,
    deleteProfile,
    authorizePayment,
    getBoltTerminalStatus,
    listBoltTerminals,
} = require('../../services/cardpointeService');
const {
    getTransactionLookups,
    searchTransactions: reportingSearch,
    getTransactionDetail,
    configured: reportingConfigured,
} = require('../../services/cardpointeReportingService');
const {
    FinanceTransaction,
    FinanceQuote,
    FinanceApproval,
    FinanceSettings: FinanceSettingsModel,
    FinanceInvoice,
    FinanceCollection,
    FinanceCustomer,
} = require('../../database/Models/Finance');
const { FinanceCommission } = require('../../database/Models/Commission');
const { FinanceActivityLog } = require('../../database/Models/ActivityLog');
const { conna } = require('../../database/util');

// Fire-and-forget append to the activity feed — never blocks or fails the
// caller's response; a logging hiccup shouldn't break a real finance action.
const logActivity = (company_id, type, title, sub, ref_id, ref_model, actor_id) => {
    FinanceActivityLog.create({ company_id, type, title, sub, ref_id, ref_model, actor_id }).catch((err) =>
        console.error('[finance/activity-log] write failed:', err.message)
    );
};
const isDbReady = () => conna && conna.readyState === 1;

router.get('/finance/payment/:retref', verifyFinanceAccess, async (req, res) => {
    try {
        const data = await inquireTransaction(req.params.retref);
        res.json({ status: true, data });
    } catch (err) {
        const status = err.response?.status || 500;
        res.status(status).json({ status: false, error: err.response?.data || err.message });
    }
});

router.get('/finance/txnsummary', verifyFinanceAccess, async (req, res) => {
    try {
        const data = await getTransactionSummary(undefined, req.query.date);
        res.json({ status: true, data });
    } catch (err) {
        const status = err.response?.status || 500;
        const d = err.response?.data;
        const errMsg = typeof d === 'string' ? d : (d?.error || d?.resptext || d?.message || err.message);
        res.status(status).json({ status: false, error: errMsg });
    }
});

router.get('/finance/settlement', verifyFinanceAccess, async (req, res) => {
    try {
        const data = await getSettlementStatus();
        // Fiserv returns "Null batches" string when no open batch — normalize to null so UI shows "No open batch"
        res.json({ status: true, data: typeof data === 'object' ? data : null });
    } catch (err) {
        const status = err.response?.status || 500;
        const d = err.response?.data;
        const errMsg = typeof d === 'string' ? d : (d?.error || d?.resptext || d?.message || err.message);
        res.status(status).json({ status: false, error: errMsg });
    }
});

// GET /finance/inquire/:retref — look up a single transaction by retref (CardPointe /inquire)
router.get('/finance/inquire/:retref', verifyFinanceAccess, async (req, res) => {
    try {
        const data = await inquireTransaction(req.params.retref);
        if (!data.merchantid) data.merchantid = process.env.CARDPOINTE_MERCHANT_ID || '';
        res.json({ status: true, data });
    } catch (err) {
        const status = err.response?.status || 500;
        const d = err.response?.data;
        const errMsg = typeof d === 'string' ? d : (d?.error || d?.resptext || d?.message || err.message);
        res.status(status).json({ status: false, error: errMsg });
    }
});

router.get('/finance/funding', verifyFinanceAccess, async (req, res) => {
    try {
        // date is optional — omitting returns most recent funding record
        // format: MMDDYYYY (Fiserv) or YYYYMMDD (auto-converted below)
        let date = req.query.date || undefined;
        if (date && date.length === 8 && date.startsWith('20')) {
            // Convert YYYYMMDD → MMDDYYYY
            date = date.slice(4, 6) + date.slice(6, 8) + date.slice(0, 4);
        }
        const merchantId = req.query.merchantId || undefined;
        const data = await getFunding(date, merchantId);
        res.json({ status: true, data });
    } catch (err) {
        const status = err.response?.status || 500;
        const d = err.response?.data;
        const errMsg = typeof d === 'string' ? d : (d?.error || d?.resptext || d?.message || err.message);
        res.status(status).json({ status: false, error: errMsg });
    }
});

router.get('/finance/gateway', verifyFinanceAccess, async (req, res) => {
    try {
        const info = getGatewayInfo();
        // Verify credentials work by pinging settlestat.
        // A 4xx response from CardPointe (e.g. "no open batch") still proves creds are valid.
        // Only network errors or 401/403 mean not connected.
        let connected = false;
        let connError = null;
        try {
            await getSettlementStatus();
            connected = true;
        } catch (e) {
            const status = e.response?.status;
            if (status && status !== 401 && status !== 403) {
                connected = true; // got a real response — credentials work
            } else {
                connError = e.response?.data?.resptext || e.message;
            }
        }
        res.json({ status: true, data: { ...info, connected, connError } });
    } catch (err) {
        res.status(500).json({ status: false, error: err.message });
    }
});

router.put('/finance/void/:retref', verifyFinanceAccess, async (req, res) => {
    try {
        const data = await voidTransaction(req.params.retref);
        res.json({ status: true, data });
    } catch (err) {
        const status = err.response?.status || 500;
        res.status(status).json({ status: false, error: err.response?.data || err.message });
    }
});

router.put('/finance/refund/:retref', verifyFinanceAccess, async (req, res) => {
    try {
        const data = await refundTransaction(req.params.retref, req.body?.amount);
        res.json({ status: true, data });
    } catch (err) {
        const status = err.response?.status || 500;
        res.status(status).json({ status: false, error: err.response?.data || err.message });
    }
});

// List all imported CardPointe transactions for this company
router.get('/finance/transactions', verifyFinanceAccess, async (req, res) => {
    if (!isDbReady()) return res.json({ status: true, data: [] });
    try {
        const company_id = req.company_id;
        const filter = company_id ? { company_id, has_delete: { $ne: company_id } } : {};
        const txns = await FinanceTransaction.find(filter)
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();
        res.json({ status: true, data: txns });
    } catch (err) {
        res.status(500).json({ status: false, error: err.message });
    }
});

// Import a retref: call /inquire then upsert into FinanceTransaction
router.post('/finance/transactions/import', verifyFinanceAccess, async (req, res) => {
    if (!isDbReady()) return res.status(503).json({ status: false, error: 'Database not connected. Start MongoDB to import transactions.' });
    try {
        const { retref } = req.body || {};
        if (!retref) return res.status(400).json({ status: false, error: 'retref required' });
        const company_id = req.company_id;
        const raw = await inquireTransaction(retref);
        if (raw.respstat === 'C' && raw.resptext === 'Txn not found') {
            return res.status(404).json({ status: false, error: 'Transaction not found in CardPointe' });
        }
        const doc = await FinanceTransaction.findOneAndUpdate(
            { retref: raw.retref },
            {
                company_id,
                merchant_id:     raw.merchid,
                retref:          raw.retref,
                amount:          parseFloat(raw.amount) || 0,
                currency:        raw.currency || 'USD',
                authcode:        raw.authcode,
                authdate:        raw.authdate,
                card_last_four:  raw.lastfour,
                cardholder_name: raw.name,
                respstat:        raw.respstat,
                resptext:        raw.resptext,
                setlstat:        raw.setlstat,
                entrymode:       raw.entrymode,
                voidable:        raw.voidable,
                refundable:      raw.refundable,
                raw_response:    raw,
                synced_at:       new Date(),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        res.json({ status: true, data: doc });
    } catch (err) {
        const status = err.response?.status || 500;
        res.status(status).json({ status: false, error: err.response?.data || err.message });
    }
});

// GET /finance/merchant - live merchant config from CardPointe /inquireMerchant
router.get('/finance/merchant', verifyFinanceAccess, async (req, res) => {
    try {
        const data = await inquireMerchant();
        res.json({ status: true, data });
    } catch (err) {
        res.status(err.response?.status || 500).json({ status: false, error: err.response?.data || err.message });
    }
});

// GET /finance/bin/:token - BIN info for a card token
router.get('/finance/bin/:token', verifyFinanceAccess, async (req, res) => {
    try {
        const data = await getBinInfo(req.params.token);
        res.json({ status: true, data });
    } catch (err) {
        res.status(err.response?.status || 500).json({ status: false, error: err.response?.data || err.message });
    }
});

// POST /finance/cardpointe/create-profile — raw CardPointe profile creation, no DB
router.post('/finance/cardpointe/create-profile', verifyFinanceAccess, async (req, res) => {
    try {
        const { account, expiry, name, email, phone, postal, address, city, region, country, company, profile } = req.body || {};
        if (!account) return res.status(400).json({ status: false, error: 'account (card token or PAN) required' });
        const profileData = { account, ...(expiry && { expiry }), ...(name && { name }), ...(email && { email }), ...(phone && { phone }), ...(postal && { postal }), ...(address && { address }), ...(city && { city }), ...(region && { region }), ...(country && { country }), ...(company && { company }), ...(profile && { profile }) };
        const result = await createProfile(profileData);
        if (!result.profileid) {
            return res.status(402).json({ status: false, error: result.resptext || 'Profile creation failed', data: result });
        }
        res.json({ status: true, profileid: result.profileid, acctid: result.acctid, card_valid: result.respstat === 'A', resptext: result.resptext, data: result });
    } catch (err) {
        res.status(err.response?.status || 500).json({ status: false, error: err.response?.data || err.message });
    }
});

// GET /finance/cardpointe/profile/:profileid/:acctid — fetch stored profile from CardPointe live
router.get('/finance/cardpointe/profile/:profileid/:acctid', verifyFinanceAccess, async (req, res) => {
    try {
        const result = await getProfile(req.params.profileid, req.params.acctid);
        res.json({ status: true, data: result });
    } catch (err) {
        res.status(err.response?.status || 500).json({ status: false, error: err.response?.data || err.message });
    }
});

// ── My Profile (per logged-in user) ──────────────────────────────────────────
// NOTE: unlike the Workfreeli original, this app has no client-side merchant
// credentials at all — every call here is gated purely by the caller's own
// Bearer JWT (see verifyFinanceAccess), never Basic auth from the browser.

router.get('/finance/cardpointe/my-profile', verifyFinanceAccess, async (req, res) => {
    try {
        const userId = req.loggedInUserId !== 'finance_service' ? req.loggedInUserId : (req.query.user_id || '');
        const user = await User.findOne({ id: userId }).lean();
        if (!user) return res.status(404).json({ status: false, error: 'User not found' });
        let cardpointe_data = null;
        if (user.cardpointe_profile_id) {
            try { cardpointe_data = await getProfile(user.cardpointe_profile_id, user.cardpointe_acct_id || '0'); } catch (_) {}
        }
        res.json({
            status: true,
            has_profile: !!user.cardpointe_profile_id,
            cardpointe_profile_id: user.cardpointe_profile_id || null,
            cardpointe_acct_id: user.cardpointe_acct_id || null,
            cardpointe_data,
            source: cardpointe_data ? 'live' : 'cache'
        });
    } catch (err) {
        res.status(500).json({ status: false, error: err.message });
    }
});

router.post('/finance/cardpointe/my-profile', verifyFinanceAccess, async (req, res) => {
    try {
        const userId = req.loggedInUserId !== 'finance_service' ? req.loggedInUserId : (req.body.user_id || '');
        const user = await User.findOne({ id: userId }).lean();
        if (!user) return res.status(404).json({ status: false, error: 'User not found' });
        const { account, expiry, name, email, phone, postal, address, city, region, country, company, currency } = req.body || {};
        if (!account) return res.status(400).json({ status: false, error: 'account (card token) required' });
        const profileData = {
            account,
            ...(expiry   && { expiry }),
            ...(name     && { name }),
            ...(email    && { email }),
            ...(phone    && { phone }),
            ...(postal   && { postal }),
            ...(address  && { address }),
            ...(city     && { city }),
            ...(region   && { region }),
            ...(country  && { country }),
            ...(company  && { company }),
            ...(currency && { currency }),
            // include existing profileid so CardPointe adds acct to the same profile instead of creating a new one
            ...(user.cardpointe_profile_id && { profile: user.cardpointe_profile_id }),
        };
        const result = await createProfile(profileData);
        if (!result.profileid) {
            return res.status(402).json({ status: false, error: result.resptext || 'Profile creation failed', data: result });
        }
        await User.findOneAndUpdate(
            { id: userId },
            { $set: { cardpointe_profile_id: result.profileid, cardpointe_acct_id: result.acctid } }
        );
        res.json({ status: true, profileid: result.profileid, acctid: result.acctid, card_valid: result.respstat === 'A', resptext: result.resptext, data: result });
    } catch (err) {
        res.status(err.response?.status || 500).json({ status: false, error: err.response?.data || err.message });
    }
});

router.delete('/finance/cardpointe/my-profile', verifyFinanceAccess, async (req, res) => {
    try {
        const userId = req.loggedInUserId !== 'finance_service' ? req.loggedInUserId : (req.query.user_id || '');
        const user = await User.findOne({ id: userId }).lean();
        if (!user?.cardpointe_profile_id) return res.status(400).json({ status: false, error: 'No profile linked to this user' });
        try {
            await deleteProfile(user.cardpointe_profile_id, user.cardpointe_acct_id || '0');
        } catch (cpErr) {
            // 404 means already deleted on CardPointe side — still clear from DB
            if (cpErr.response?.status !== 404) throw cpErr;
        }
        await User.findOneAndUpdate(
            { id: userId },
            { $unset: { cardpointe_profile_id: 1, cardpointe_acct_id: 1 } }
        );
        res.json({ status: true, message: 'Profile deleted' });
    } catch (err) {
        res.status(err.response?.status || 500).json({ status: false, error: err.response?.data || err.message });
    }
});

// GET /finance/quotes - list FinanceQuote docs for this company
router.get('/finance/quotes', verifyFinanceAccess, async (req, res) => {
    if (!isDbReady()) return res.json({ status: true, data: [] });
    try {
        const company_id = req.company_id;
        const filter = company_id ? { company_id, has_delete: { $ne: company_id } } : {};
        const quotes = await FinanceQuote.find(filter)
            .sort({ createdAt: -1 }).limit(50).lean();
        res.json({ status: true, data: quotes });
    } catch (err) {
        res.status(500).json({ status: false, error: err.message });
    }
});

// GET /finance/quotes/:id — full detail for one quote: the quote record plus
// its linked charge (FinanceTransaction) and revenue split (FinanceCommission),
// looked up by quote_id since a quote is charged synchronously on creation.
router.get('/finance/quotes/:id', verifyFinanceAccess, async (req, res) => {
    if (!isDbReady()) return res.status(503).json({ status: false, error: 'Database not connected.' });
    try {
        const company_id = req.company_id;
        const quote = await FinanceQuote.findOne({ _id: req.params.id, company_id }).lean();
        if (!quote) return res.status(404).json({ status: false, error: 'Quote not found' });
        const [transaction, commission] = await Promise.all([
            FinanceTransaction.findOne({ quote_id: quote._id }).lean(),
            FinanceCommission.findOne({ quote_id: quote._id }).lean(),
        ]);
        res.json({ status: true, data: quote, transaction: transaction || null, commission: commission || null });
    } catch (err) {
        res.status(500).json({ status: false, error: err.message });
    }
});

// POST /finance/quotes — create a FinanceQuote AND immediately charge the
// customer's stored CardPointe profile for the full amount. Requires an
// existing FinanceCustomer with a card on file (see /finance/customers or
// /finance/customers/:id/link-profile) — the quote is not saved if the
// customer has no profile or the charge is declined.
//
// On success, also records a FinanceTransaction (the charge) and a
// FinanceCommission ledger entry splitting the gross amount into a
// commission cut and the net payout to the omnipay channel, using
// FinanceSettings.commission_rate_percent (default 5%). This is a
// bookkeeping split only — CardPointe deposits the full amount into the
// single merchant account; nothing is physically routed to a second account.
router.post('/finance/quotes', verifyFinanceAccess, async (req, res) => {
    if (!isDbReady()) return res.status(503).json({ status: false, error: 'Database not connected.' });
    try {
        const company_id = req.company_id || 'shared';
        const { customer_id, total, line_items = [], notes, valid_until, tax_rate = 0, discount = 0, priority = 'standard', test_mode } = req.body || {};

        if (!customer_id) return res.status(400).json({ status: false, error: 'customer_id required' });
        const customer = await FinanceCustomer.findOne({ _id: customer_id, company_id }).lean();
        if (!customer) return res.status(404).json({ status: false, error: 'Customer not found' });
        if (!customer.cardpointe_profile_id) {
            return res.status(400).json({ status: false, error: 'Customer has no payment profile on file — add one before creating a quote (see Accounts)' });
        }

        const subtotal = line_items.reduce((s, i) => s + (parseFloat(i.amount) || parseFloat(i.unit_price) * parseFloat(i.quantity) || 0), 0)
            || parseFloat(total) || 0;
        const tax_amount = parseFloat(((subtotal - discount) * (tax_rate / 100)).toFixed(2));
        const computed_total = parseFloat((subtotal - discount + tax_amount).toFixed(2));
        if (computed_total <= 0) return res.status(400).json({ status: false, error: 'total must be greater than 0' });

        // Sequence-generator pattern: atomic $inc on FinanceSettings per company_id avoids race conditions on numbering.
        const settings = await FinanceSettingsModel.findOneAndUpdate(
            { company_id },
            { $inc: { next_quote_seq: 1 } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        const seq = (settings.next_quote_seq || 1002) - 1;
        const quote_number = `${settings.quote_prefix || 'Q'}-${seq}`;

        // Charge the customer's stored card for the full amount before saving anything.
        // test_mode skips the real CardPointe /auth call and synthesizes an approved
        // result instead — for verifying the commission/ledger math end-to-end while
        // the merchant account's real Authorization permission is still being sorted
        // out (see /finance/gateway 401 on /auth). Never real money either way in
        // this sandbox, but test_mode also never touches CardPointe at all.
        let authResult;
        if (test_mode) {
            authResult = {
                respstat: 'A', resptext: 'TEST MODE — no real charge attempted',
                retref: `TEST-${Date.now()}`, authcode: 'TEST00', authdate: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
                lastfour: '1111', merchantid: process.env.CARDPOINTE_MERCHANT_ID, entrymode: 'test',
                voidable: 'N', refundable: 'N',
            };
        } else {
            const amountCents = String(Math.round(computed_total * 100));
            try {
                authResult = await authorizePayment({
                    account:  `${customer.cardpointe_profile_id}/${customer.cardpointe_acct_id || '0'}`,
                    amount:   amountCents,
                    name:     customer.name,
                    currency: customer.currency || 'USD',
                    orderid:  quote_number,
                    ...(customer.address?.zip && { postal: customer.address.zip }),
                    capture:  'Y',
                });
            } catch (cpErr) {
                return res.status(cpErr.response?.status || 502).json({ status: false, error: cpErr.response?.data || cpErr.message });
            }
            if (authResult.respstat !== 'A') {
                logActivity(company_id, 'payment_declined', 'Payment declined', `${customer.name} · ${authResult.resptext || 'declined'}`, customer._id, 'FinanceCustomer', req.loggedInUserId);
                return res.status(402).json({ status: false, error: authResult.resptext || 'Card was declined', data: authResult });
            }
        }

        const quote = await FinanceQuote.create({
            company_id,
            quote_number,
            customer_id:   customer._id,
            customer_name: customer.name,
            line_items,
            subtotal,
            discount,
            tax_rate,
            tax_amount,
            total:         computed_total,
            status:        'approved',
            priority,
            notes,
            valid_until:   valid_until ? new Date(valid_until) : undefined,
            approved_at:   new Date(),
            created_by:    req.loggedInUserId || 'system',
        });

        const transaction = await FinanceTransaction.create({
            company_id,
            merchant_id:     authResult.merchantid || process.env.CARDPOINTE_MERCHANT_ID,
            retref:          authResult.retref,
            amount:          computed_total,
            currency:        customer.currency || 'USD',
            authcode:        authResult.authcode,
            authdate:        authResult.authdate,
            card_last_four:  authResult.lastfour,
            cardholder_name: customer.name,
            respstat:        authResult.respstat,
            resptext:        authResult.resptext,
            setlstat:        authResult.setlstat,
            entrymode:       authResult.entrymode || 'keyed',
            voidable:        authResult.voidable,
            refundable:      authResult.refundable,
            quote_id:        quote._id,
            raw_response:    authResult,
        });

        const commission_rate = settings.commission_rate_percent ?? 5;
        const commission_amount = parseFloat((computed_total * (commission_rate / 100)).toFixed(2));
        const net_amount = parseFloat((computed_total - commission_amount).toFixed(2));
        const commission = await FinanceCommission.create({
            company_id,
            quote_id:          quote._id,
            transaction_id:    transaction._id,
            customer_id:       customer._id,
            customer_name:     customer.name,
            retref:            authResult.retref,
            gross_amount:      computed_total,
            commission_rate,
            commission_amount,
            net_amount,
            currency:          customer.currency || 'USD',
        });

        logActivity(company_id, 'quote_created', `Quote created for ${customer.name}`, `${quote_number} · $${computed_total.toFixed(2)}`, quote._id, 'FinanceQuote', req.loggedInUserId);
        logActivity(company_id, 'payment_charged', 'Payment charged', `${customer.name} · $${computed_total.toFixed(2)}${test_mode ? ' (test)' : ''}`, transaction._id, 'FinanceTransaction', req.loggedInUserId);
        logActivity(company_id, 'commission_recorded', `Commission recorded (${commission_rate}%)`, `$${commission_amount.toFixed(2)} · net $${net_amount.toFixed(2)}`, commission._id, 'FinanceCommission', req.loggedInUserId);

        res.json({ status: true, data: quote, transaction, commission });
    } catch (err) {
        res.status(500).json({ status: false, error: err.message });
    }
});

// GET /finance/commissions — ledger of the revenue split recorded on each auto-charged quote
router.get('/finance/commissions', verifyFinanceAccess, async (req, res) => {
    if (!isDbReady()) return res.json({ status: true, data: [] });
    try {
        const company_id = req.company_id;
        const filter = company_id ? { company_id, has_delete: { $ne: company_id } } : {};
        const commissions = await FinanceCommission.find(filter).sort({ createdAt: -1 }).limit(200).lean();
        const totals = commissions.reduce((acc, c) => ({
            gross: acc.gross + (c.gross_amount || 0),
            commission: acc.commission + (c.commission_amount || 0),
            net: acc.net + (c.net_amount || 0),
        }), { gross: 0, commission: 0, net: 0 });
        res.json({ status: true, data: commissions, totals });
    } catch (err) {
        res.status(500).json({ status: false, error: err.message });
    }
});

// GET /finance/activity-log — chronological feed backing the header
// Notifications + Recent popovers. ?limit= caps how many rows come back
// (defaults 20, capped at 100).
router.get('/finance/activity-log', verifyFinanceAccess, async (req, res) => {
    if (!isDbReady()) return res.json({ status: true, data: [] });
    try {
        const company_id = req.company_id;
        const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
        const filter = company_id ? { company_id, has_delete: { $ne: company_id } } : {};
        const events = await FinanceActivityLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
        res.json({ status: true, data: events });
    } catch (err) {
        res.status(500).json({ status: false, error: err.message });
    }
});

// POST /finance/quotes/:id/convert — convert an approved quote to an invoice
router.post('/finance/quotes/:id/convert', verifyFinanceAccess, async (req, res) => {
    if (!isDbReady()) return res.status(503).json({ status: false, error: 'Database not connected.' });
    try {
        const company_id = req.company_id;
        const quote = await FinanceQuote.findOne({ _id: req.params.id, company_id }).lean();
        if (!quote) return res.status(404).json({ status: false, error: 'Quote not found' });
        if (quote.status === 'converted') return res.status(400).json({ status: false, error: 'Quote already converted' });
        if (!['approved', 'sent', 'pending_approval'].includes(quote.status)) {
            return res.status(400).json({ status: false, error: `Cannot convert quote in status "${quote.status}"` });
        }

        const { due_date } = req.body || {};
        const settings = await FinanceSettingsModel.findOneAndUpdate(
            { company_id },
            { $inc: { next_invoice_seq: 1 } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        const seq = (settings.next_invoice_seq || 1002) - 1;
        const invoice = await FinanceInvoice.create({
            company_id,
            invoice_number: `${settings.invoice_prefix || 'INV'}-${seq}`,
            customer_id:    quote.customer_id,
            customer_name:  quote.customer_name,
            line_items:     quote.line_items,
            subtotal:       quote.subtotal,
            discount:       quote.discount || 0,
            tax_rate:       quote.tax_rate  || 0,
            tax_amount:     quote.tax_amount || 0,
            total:          quote.total,
            currency:       quote.currency || 'USD',
            status:         'draft',
            issued_date:    new Date(),
            due_date:       due_date ? new Date(due_date) : undefined,
            notes:          quote.notes,
            created_by:     req.loggedInUserId || 'system',
        });

        await FinanceQuote.findOneAndUpdate(
            { _id: req.params.id, company_id },
            { $set: { status: 'converted', converted_invoice_id: invoice._id } }
        );
        res.json({ status: true, data: invoice, quote_id: quote._id });
    } catch (err) {
        res.status(500).json({ status: false, error: err.message });
    }
});

// GET /finance/approvals - list FinanceApproval docs for this company
router.get('/finance/approvals', verifyFinanceAccess, async (req, res) => {
    if (!isDbReady()) return res.json({ status: true, data: [] });
    try {
        const company_id = req.company_id;
        const { status } = req.query;
        const filter = company_id ? { company_id, has_delete: { $ne: company_id } } : {};
        if (status) filter.status = status;
        const approvals = await FinanceApproval.find(filter)
            .sort({ createdAt: -1 }).limit(50).lean();
        res.json({ status: true, data: approvals });
    } catch (err) {
        res.status(500).json({ status: false, error: err.message });
    }
});

// ── Customer Profiles (stored card tokens / recurring) ───────────────────────

// GET /finance/profile/:profileid — fetch all accounts under a profile
router.get('/finance/profile/:profileid', verifyFinanceAccess, async (req, res) => {
    try {
        const acctId = req.query.acctid || '0'; // '0' = all accounts
        const data = await getProfile(req.params.profileid, acctId);
        res.json({ status: true, data });
    } catch (err) {
        res.status(err.response?.status || 500).json({ status: false, error: err.response?.data || err.message });
    }
});

// PUT /finance/profile — create or update a customer card profile
router.put('/finance/profile', verifyFinanceAccess, async (req, res) => {
    try {
        const data = await createProfile(req.body || {});
        res.json({ status: true, data });
    } catch (err) {
        res.status(err.response?.status || 500).json({ status: false, error: err.response?.data || err.message });
    }
});

// DELETE /finance/profile/:profileid/:acctid
router.delete('/finance/profile/:profileid/:acctid', verifyFinanceAccess, async (req, res) => {
    try {
        const data = await deleteProfile(req.params.profileid, req.params.acctid);
        res.json({ status: true, data });
    } catch (err) {
        res.status(err.response?.status || 500).json({ status: false, error: err.response?.data || err.message });
    }
});

// ── Surcharge MID ────────────────────────────────────────────────────────────

// GET /finance/txnsummary/surcharge?date=MMDDYYYY — transaction summary for surcharge MID
router.get('/finance/txnsummary/surcharge', verifyFinanceAccess, async (req, res) => {
    const mid = process.env.CARDPOINTE_SURCHARGE_MID || '';
    if (!mid) return res.status(400).json({ status: false, error: 'CARDPOINTE_SURCHARGE_MID not configured' });
    try {
        const data = await getTransactionSummary(mid, req.query.date);
        res.json({ status: true, data, mid });
    } catch (err) {
        const status = err.response?.status || 500;
        const d = err.response?.data;
        const errMsg = typeof d === 'string' ? d : (d?.error || d?.resptext || d?.message || err.message);
        res.status(status).json({ status: false, error: errMsg });
    }
});

// GET /finance/settlement/surcharge — settlement status for surcharge MID
router.get('/finance/settlement/surcharge', verifyFinanceAccess, async (req, res) => {
    const mid = process.env.CARDPOINTE_SURCHARGE_MID || '';
    if (!mid) return res.status(400).json({ status: false, error: 'CARDPOINTE_SURCHARGE_MID not configured' });
    try {
        const data = await getSettlementStatus(mid);
        res.json({ status: true, data: typeof data === 'object' ? data : null, mid });
    } catch (err) {
        const status = err.response?.status || 500;
        const d = err.response?.data;
        const errMsg = typeof d === 'string' ? d : (d?.error || d?.resptext || d?.message || err.message);
        res.status(status).json({ status: false, error: errMsg });
    }
});

// ── Bolt Terminal API (card-present) ────────────────────────────────────────

// GET /finance/terminal/list — list all Bolt terminals on this account
router.get('/finance/terminal/list', verifyFinanceAccess, async (req, res) => {
    try {
        const data = await listBoltTerminals();
        res.json({ status: true, data });
    } catch (err) {
        res.status(err.response?.status || 500).json({ status: false, error: err.response?.data || err.message });
    }
});

// GET /finance/terminal/status/:hsn — status of a specific terminal by hardware serial
router.get('/finance/terminal/status/:hsn', verifyFinanceAccess, async (req, res) => {
    try {
        const data = await getBoltTerminalStatus(req.params.hsn);
        res.json({ status: true, data });
    } catch (err) {
        res.status(err.response?.status || 500).json({ status: false, error: err.response?.data || err.message });
    }
});

// ── CNP Authorization ────────────────────────────────────────────────────────

// POST /finance/authorize — card-not-present authorization
// Body: { account, expiry, amount, name, address, city, region, country, postal, currency, orderid }
// account can be raw PAN, iFrame token, or "profileid/acctid" to charge stored profile
router.post('/finance/authorize', verifyFinanceAccess, async (req, res) => {
    try {
        if (!req.body?.account || !req.body?.amount) {
            return res.status(400).json({ status: false, error: 'account and amount required' });
        }
        const data = await authorizePayment(req.body);
        res.json({ status: true, data });
    } catch (err) {
        console.error('[finance/authorize] CardPointe error status=%s data=%j', err.response?.status, err.response?.data);
        res.status(err.response?.status || 500).json({ status: false, error: err.response?.data || err.message });
    }
});

// ── CardPointe Reporting Portal ───────────────────────────────────────────────

// GET /finance/reporting/lookups — filter metadata (dateMap, statusMap, brandMap, entryMethodMap, etc.)
router.get('/finance/reporting/lookups', verifyFinanceAccess, async (req, res) => {
    try {
        if (!reportingConfigured()) return res.json({ status: false, error: 'Reporting portal credentials not configured (CARDPOINTE_REPORTING_USERNAME / CARDPOINTE_REPORTING_PASSWORD)' });
        const data = await getTransactionLookups();
        res.json({ status: true, data });
    } catch (err) {
        res.status(err.response?.status || 500).json({ status: false, error: err.response?.data || err.message });
    }
});

// POST /finance/reporting/search — search transactions with rich filters
router.post('/finance/reporting/search', verifyFinanceAccess, async (req, res) => {
    try {
        if (!reportingConfigured()) return res.json({ status: false, error: 'Reporting portal credentials not configured' });
        const data = await reportingSearch(req.body || {});
        res.json({ status: true, data });
    } catch (err) {
        res.status(err.response?.status || 500).json({ status: false, error: err.response?.data || err.message });
    }
});

// GET /finance/reporting/transaction/:retref — fetch single transaction detail from reporting portal
router.get('/finance/reporting/transaction/:retref', verifyFinanceAccess, async (req, res) => {
    try {
        if (!reportingConfigured()) return res.json({ status: false, error: 'Reporting portal credentials not configured' });
        const data = await getTransactionDetail(req.params.retref);
        res.json({ status: true, data });
    } catch (err) {
        res.status(err.response?.status || 500).json({ status: false, error: err.response?.data || err.message });
    }
});

// ── Customers ────────────────────────────────────────────────────────────────

router.get('/finance/customers', verifyFinanceAccess, async (req, res) => {
    if (!isDbReady()) return res.json({ status: true, data: [] });
    try {
        const company_id = req.company_id;
        const filter = company_id ? { company_id, has_delete: { $ne: company_id } } : {};
        const customers = await FinanceCustomer.find(filter).sort({ createdAt: -1 }).limit(200).lean();
        res.json({ status: true, data: customers });
    } catch (err) {
        res.status(500).json({ status: false, error: err.message });
    }
});

router.post('/finance/customers', verifyFinanceAccess, async (req, res) => {
    if (!isDbReady()) return res.status(503).json({ status: false, error: 'Database not connected.' });
    try {
        const company_id = req.company_id || 'shared';
        const { name, email, phone, address, contact_name, payment_terms, currency, credit_limit, notes, account, expiry } = req.body || {};
        if (!name) return res.status(400).json({ status: false, error: 'name required' });

        let cardpointe_profile_id = null;
        let cardpointe_acct_id = null;
        let cp_profile = null;
        if (account) {
            try {
                cp_profile = await createProfile({
                    account,
                    name,
                    ...(email && { email }),
                    ...(phone && { phone }),
                    ...(expiry && { expiry }),
                    ...(address?.zip && { postal: address.zip }),
                });
                if (cp_profile?.profileid) {
                    cardpointe_profile_id = cp_profile.profileid;
                    cardpointe_acct_id    = cp_profile.acctid;
                }
            } catch (cpErr) {
                console.error('[finance/customers] CardPointe profile failed:', cpErr.response?.data || cpErr.message);
            }
        }

        const customer = await FinanceCustomer.create({
            company_id, name, email, phone, address, contact_name,
            payment_terms: payment_terms || 'net30',
            currency: currency || 'USD',
            credit_limit: parseFloat(credit_limit) || 0,
            notes,
            ...(cardpointe_profile_id && { cardpointe_profile_id, cardpointe_acct_id }),
        });
        logActivity(company_id, 'customer_created', 'New customer added', customer.name, customer._id, 'FinanceCustomer', req.loggedInUserId);
        res.json({ status: true, data: customer, cardpointe_profile: cp_profile || null });
    } catch (err) {
        res.status(500).json({ status: false, error: err.message });
    }
});

// POST /finance/customers/import-profile — create a FinanceCustomer from a
// CardPointe profile/account that already exists (e.g. created via the
// CardPointe portal, or via a test call) instead of tokenizing a new card.
// Body: { profileid, acctid, name?, payment_terms?, credit_limit? }
router.post('/finance/customers/import-profile', verifyFinanceAccess, async (req, res) => {
    if (!isDbReady()) return res.status(503).json({ status: false, error: 'Database not connected.' });
    try {
        const company_id = req.company_id || 'shared';
        const { profileid, acctid, name, payment_terms, credit_limit } = req.body || {};
        if (!profileid || !acctid) {
            return res.status(400).json({ status: false, error: 'profileid and acctid required (both visible in the CardPointe portal contact URL)' });
        }

        const existing = await FinanceCustomer.findOne({ company_id, cardpointe_profile_id: profileid, cardpointe_acct_id: acctid }).lean();
        if (existing) return res.status(409).json({ status: false, error: 'This profile/account is already imported as a customer', data: existing });

        let cp;
        try {
            cp = await getProfile(profileid, acctid);
        } catch (cpErr) {
            return res.status(cpErr.response?.status || 502).json({ status: false, error: cpErr.response?.data || cpErr.message });
        }
        const record = Array.isArray(cp) ? cp[0] : cp;
        if (!record) {
            return res.status(404).json({ status: false, error: 'No such profile/account on CardPointe', data: cp });
        }

        const customer = await FinanceCustomer.create({
            company_id,
            name: name || record.name || 'Imported Customer',
            email: record.email,
            phone: record.phone,
            address: {
                line1: record.address,
                city: record.city,
                state: record.region,
                zip: record.postal,
                country: record.country || 'US',
            },
            payment_terms: payment_terms || 'net30',
            credit_limit: parseFloat(credit_limit) || 0,
            cardpointe_profile_id: profileid,
            cardpointe_acct_id: acctid,
        });
        logActivity(company_id, 'customer_profile_imported', 'CardPointe profile imported', customer.name, customer._id, 'FinanceCustomer', req.loggedInUserId);
        res.json({ status: true, data: customer, cardpointe_data: record });
    } catch (err) {
        res.status(500).json({ status: false, error: err.message });
    }
});

router.put('/finance/customers/:id', verifyFinanceAccess, async (req, res) => {
    if (!isDbReady()) return res.status(503).json({ status: false, error: 'Database not connected.' });
    try {
        const customer = await FinanceCustomer.findOneAndUpdate(
            { _id: req.params.id, company_id: req.company_id },
            { $set: req.body },
            { new: true }
        );
        if (!customer) return res.status(404).json({ status: false, error: 'Customer not found' });
        res.json({ status: true, data: customer });
    } catch (err) {
        res.status(500).json({ status: false, error: err.message });
    }
});

// GET /finance/customers/:id — DB record enriched with live CardPointe profile data
router.get('/finance/customers/:id', verifyFinanceAccess, async (req, res) => {
    if (!isDbReady()) return res.status(503).json({ status: false, error: 'Database not connected.' });
    try {
        const customer = await FinanceCustomer.findOne({ _id: req.params.id, company_id: req.company_id }).lean();
        if (!customer) return res.status(404).json({ status: false, error: 'Customer not found' });

        let cardpointe_data = null;
        if (customer.cardpointe_profile_id) {
            try {
                cardpointe_data = await getProfile(customer.cardpointe_profile_id, customer.cardpointe_acct_id || '0');
            } catch (_) { /* fallback to DB-only */ }
        }
        res.json({ status: true, data: customer, cardpointe_data, source: cardpointe_data ? 'live' : 'cache' });
    } catch (err) {
        res.status(500).json({ status: false, error: err.message });
    }
});

// POST /finance/customers/:id/link-profile — create/update CardPointe stored-card profile for existing customer
router.post('/finance/customers/:id/link-profile', verifyFinanceAccess, async (req, res) => {
    if (!isDbReady()) return res.status(503).json({ status: false, error: 'Database not connected.' });
    try {
        const customer = await FinanceCustomer.findOne({ _id: req.params.id, company_id: req.company_id }).lean();
        if (!customer) return res.status(404).json({ status: false, error: 'Customer not found' });

        const { account, expiry } = req.body || {};
        if (!account) return res.status(400).json({ status: false, error: 'account (card token) required' });

        const cp_profile = await createProfile({
            account,
            name: customer.name,
            ...(customer.email && { email: customer.email }),
            ...(customer.phone && { phone: customer.phone }),
            ...(expiry && { expiry }),
            ...(customer.address?.zip && { postal: customer.address.zip }),
            // if customer already has a profile, add new acct to it
            ...(customer.cardpointe_profile_id && { profile: customer.cardpointe_profile_id }),
        });

        const updated = await FinanceCustomer.findOneAndUpdate(
            { _id: req.params.id, company_id: req.company_id },
            { $set: { cardpointe_profile_id: cp_profile.profileid, cardpointe_acct_id: cp_profile.acctid } },
            { new: true }
        );
        res.json({ status: true, data: updated, cardpointe_profile: cp_profile });
    } catch (err) {
        res.status(err.response?.status || 500).json({ status: false, error: err.response?.data || err.message });
    }
});

// ── Invoices (Receivables) ────────────────────────────────────────────────────

router.get('/finance/invoices', verifyFinanceAccess, async (req, res) => {
    if (!isDbReady()) return res.json({ status: true, data: [] });
    try {
        const company_id = req.company_id;
        const filter = company_id ? { company_id, has_delete: { $ne: company_id } } : {};
        if (req.query.status) filter.status = req.query.status;
        const invoices = await FinanceInvoice.find(filter).sort({ createdAt: -1 }).limit(200).lean();
        res.json({ status: true, data: invoices });
    } catch (err) {
        res.status(500).json({ status: false, error: err.message });
    }
});

router.post('/finance/invoices', verifyFinanceAccess, async (req, res) => {
    if (!isDbReady()) return res.status(503).json({ status: false, error: 'Database not connected.' });
    try {
        const company_id = req.company_id || 'shared';
        const { customer_id, customer_name: passedName, total, line_items = [], status = 'draft', due_date, notes, retref, tax_rate = 0, discount = 0 } = req.body || {};

        let customer_name = passedName;
        let linked_customer_id;
        if (customer_id) {
            const customer = await FinanceCustomer.findOne({ _id: customer_id, company_id }).lean();
            if (!customer) return res.status(404).json({ status: false, error: 'Customer not found' });
            customer_name = customer.name;
            linked_customer_id = customer._id;
        }
        if (!customer_name) return res.status(400).json({ status: false, error: 'customer_name or customer_id required' });

        const subtotal = line_items.reduce((s, i) => s + (parseFloat(i.amount) || parseFloat(i.unit_price) * parseFloat(i.quantity) || 0), 0)
            || parseFloat(total) || 0;
        const tax_amount = parseFloat(((subtotal - discount) * (tax_rate / 100)).toFixed(2));
        const computed_total = parseFloat((subtotal - discount + tax_amount).toFixed(2));

        const settings = await FinanceSettingsModel.findOneAndUpdate(
            { company_id },
            { $inc: { next_invoice_seq: 1 } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        const seq = (settings.next_invoice_seq || 1002) - 1;
        const invoice = await FinanceInvoice.create({
            company_id,
            invoice_number: `${settings.invoice_prefix || 'INV'}-${seq}`,
            customer_id: linked_customer_id || new mongoose.Types.ObjectId(),
            customer_name,
            line_items,
            subtotal,
            discount,
            tax_rate,
            tax_amount,
            total: computed_total,
            status,
            due_date: due_date ? new Date(due_date) : undefined,
            issued_date: new Date(),
            notes,
            retref: retref || undefined,
            created_by: req.loggedInUserId || 'system',
        });
        res.json({ status: true, data: invoice });
    } catch (err) {
        res.status(500).json({ status: false, error: err.message });
    }
});

router.put('/finance/invoices/:id', verifyFinanceAccess, async (req, res) => {
    if (!isDbReady()) return res.status(503).json({ status: false, error: 'Database not connected.' });
    try {
        const { status, retref, amount_paid, paid_date, notes } = req.body || {};
        const updates = {};
        if (status)              updates.status      = status;
        if (retref)              updates.retref      = retref;
        if (amount_paid != null) updates.amount_paid = parseFloat(amount_paid);
        if (paid_date)           updates.paid_date   = new Date(paid_date);
        if (notes)               updates.notes       = notes;
        const invoice = await FinanceInvoice.findOneAndUpdate(
            { _id: req.params.id, company_id: req.company_id },
            { $set: updates },
            { new: true }
        );
        if (!invoice) return res.status(404).json({ status: false, error: 'Invoice not found' });
        res.json({ status: true, data: invoice });
    } catch (err) {
        res.status(500).json({ status: false, error: err.message });
    }
});

// POST /finance/invoices/:id/charge — charge outstanding balance via customer's stored CardPointe profile
router.post('/finance/invoices/:id/charge', verifyFinanceAccess, async (req, res) => {
    if (!isDbReady()) return res.status(503).json({ status: false, error: 'Database not connected.' });
    try {
        const company_id = req.company_id;
        const invoice = await FinanceInvoice.findOne({ _id: req.params.id, company_id }).lean();
        if (!invoice) return res.status(404).json({ status: false, error: 'Invoice not found' });
        if (invoice.status === 'paid') return res.status(400).json({ status: false, error: 'Invoice already paid' });

        const customer = await FinanceCustomer.findOne({ _id: invoice.customer_id, company_id }).lean();
        if (!customer?.cardpointe_profile_id) {
            return res.status(400).json({ status: false, error: 'Customer has no CardPointe profile on file — use /link-profile first' });
        }

        const owed = parseFloat((invoice.total - (invoice.amount_paid || 0)).toFixed(2));
        if (owed <= 0) return res.status(400).json({ status: false, error: 'No outstanding balance' });

        const amountCents = String(Math.round(owed * 100));
        const authResult = await authorizePayment({
            account:    `${customer.cardpointe_profile_id}/${customer.cardpointe_acct_id || '0'}`,
            amount:     amountCents,
            name:       customer.name,
            currency:   invoice.currency || 'USD',
            orderid:    invoice.invoice_number,
            ...(customer.address?.zip && { postal: customer.address.zip }),
            capture:    'Y',
        });

        if (authResult.respstat !== 'A') {
            return res.status(402).json({ status: false, error: authResult.resptext || 'Authorization declined', data: authResult });
        }

        const updated = await FinanceInvoice.findOneAndUpdate(
            { _id: req.params.id, company_id },
            { $set: { retref: authResult.retref, status: 'paid', amount_paid: invoice.total, paid_date: new Date() } },
            { new: true }
        );
        res.json({ status: true, data: updated, auth: authResult });
    } catch (err) {
        res.status(err.response?.status || 500).json({ status: false, error: err.response?.data || err.message });
    }
});

// ── Collections (follow-up activity log) ─────────────────────────────────────

router.get('/finance/collections', verifyFinanceAccess, async (req, res) => {
    if (!isDbReady()) return res.json({ status: true, data: [] });
    try {
        const company_id = req.company_id;
        const filter = company_id ? { company_id, has_delete: { $ne: company_id } } : {};
        if (req.query.invoice_id) filter.invoice_id = req.query.invoice_id;
        const collections = await FinanceCollection.find(filter).sort({ createdAt: -1 }).limit(200).lean();
        res.json({ status: true, data: collections });
    } catch (err) {
        res.status(500).json({ status: false, error: err.message });
    }
});

router.post('/finance/collections', verifyFinanceAccess, async (req, res) => {
    if (!isDbReady()) return res.status(503).json({ status: false, error: 'Database not connected.' });
    try {
        const company_id = req.company_id || 'shared';
        const { invoice_id, customer_id, customer_name, action_type, notes, next_followup_at } = req.body || {};
        if (!invoice_id || !action_type) return res.status(400).json({ status: false, error: 'invoice_id and action_type required' });
        const col = await FinanceCollection.create({
            company_id,
            invoice_id:   new mongoose.Types.ObjectId(invoice_id),
            customer_id:  customer_id ? new mongoose.Types.ObjectId(customer_id) : new mongoose.Types.ObjectId(),
            customer_name,
            action_type,
            notes,
            next_followup_at: next_followup_at ? new Date(next_followup_at) : undefined,
            sent_by: req.loggedInUserId || 'system',
        });
        res.json({ status: true, data: col });
    } catch (err) {
        res.status(500).json({ status: false, error: err.message });
    }
});

module.exports = router;
