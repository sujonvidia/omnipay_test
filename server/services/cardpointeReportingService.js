const axios = require('axios');

const REPORTING_BASE = process.env.CARDPOINTE_REPORTING_URL || 'https://cardpointe-uat.cardconnect.com';
const REPORTING_USER = process.env.CARDPOINTE_REPORTING_USERNAME || '';
const REPORTING_PASS = process.env.CARDPOINTE_REPORTING_PASSWORD || '';

// ── Session token cache ───────────────────────────────────────────────────────
// The reporting portal uses session auth. We login once and cache the token.
let _token = null;
let _tokenExpiry = 0;

async function acquireToken() {
    if (_token && Date.now() < _tokenExpiry) return _token;
    const { data } = await axios.post(`${REPORTING_BASE}/account/api/auth/login`, {
        username: REPORTING_USER,
        password: REPORTING_PASS,
    }, { timeout: 10000 });
    // Portal may return token under different keys
    _token = data.token || data.accessToken || data.jwtToken || data.authToken || null;
    if (!_token) throw new Error('Login response did not contain a token');
    _tokenExpiry = Date.now() + 50 * 60 * 1000; // 50 min
    return _token;
}

async function authHeader() {
    const token = await acquireToken();
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// ── Helper ────────────────────────────────────────────────────────────────────

async function reportingPost(path, body = {}) {
    const headers = await authHeader();
    const { data } = await axios.post(`${REPORTING_BASE}${path}`, body, { headers, timeout: 15000 });
    return data;
}

async function reportingGet(path) {
    const headers = await authHeader();
    const { data } = await axios.get(`${REPORTING_BASE}${path}`, { headers, timeout: 15000 });
    return data;
}

// ── API calls ─────────────────────────────────────────────────────────────────

// Returns all filter metadata: dateMap, statusMap, brandMap, entryMethodMap, methodMap, tenderTypeMap, etc.
async function getTransactionLookups() {
    return reportingPost('/account/api/transaction/lookups');
}

// Search transactions with rich filters.
// filters: { date, merchantId, status, brand, method, tenderType, entryMethod, pageSize, pageNumber }
// date = 'CD' | 'PD' | '7' | '30' | '90'
async function searchTransactions(filters = {}) {
    return reportingPost('/account/api/transaction/search', filters);
}

// Fetch detail for a single transaction by retref.
async function getTransactionDetail(retref) {
    return reportingGet(`/account/api/transaction/${retref}`);
}

function configured() {
    return !!(REPORTING_USER && REPORTING_PASS);
}

module.exports = {
    getTransactionLookups,
    searchTransactions,
    getTransactionDetail,
    configured,
};
