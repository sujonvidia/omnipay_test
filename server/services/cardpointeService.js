const axios = require('axios');

const BOLT_BASE_URL = process.env.BOLT_TERMINAL_URL || 'https://bolt-uat.cardpointe.com/api/';

function cfg() {
    return {
        baseUrl:      process.env.CARDPOINTE_BASE_URL       || 'https://fts-uat.cardconnect.com/cardconnect/rest',
        merchId:      process.env.CARDPOINTE_MERCHANT_ID    || '',
        surchargeMid: process.env.CARDPOINTE_SURCHARGE_MID  || '',
        username:     process.env.CARDPOINTE_USERNAME       || '',
        password:     process.env.CARDPOINTE_PASSWORD       || '',
        boltKey:      process.env.BOLT_AUTH_KEY             || '',
    };
}


function authHeader() {
    const { username, password } = cfg();
    return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
}

function headers() {
    return { Authorization: authHeader(), 'Content-Type': 'application/json' };
}

function boltHeaders() {
    return { Authorization: cfg().boltKey, 'Content-Type': 'application/json' };
}

// ── Transaction / Inquire ────────────────────────────────────────────────────

async function inquireTransaction(retref, merchantId) {
    const { baseUrl, merchId } = cfg();
    const mid = merchantId || merchId;
    const { data } = await axios.get(`${baseUrl}/inquire/${retref}/${mid}`, {
        headers: headers(), timeout: 10000,
    });
    return data;
}

async function getTransactionSummary(merchantId, date) {
    const { baseUrl, merchId } = cfg();
    const mid = merchantId || merchId;
    const path = date ? `/txnsummary/${date}/${mid}` : `/txnsummary/${mid}`;
    const { data } = await axios.get(`${baseUrl}${path}`, {
        headers: headers(), timeout: 10000,
    });
    return data;
}

// ── Settlement / Funding ─────────────────────────────────────────────────────

async function getSettlementStatus(merchantId, date) {
    const { baseUrl, merchId } = cfg();
    const mid = merchantId || merchId;
    let url = `${baseUrl}/settlestat?merchid=${mid}`;
    if (date) url += `&date=${date}`;
    const { data } = await axios.get(url, {
        headers: headers(), timeout: 10000,
    });
    return data;
}

async function getFunding(date, merchantId) {
    const { baseUrl, merchId } = cfg();
    const mid = merchantId || merchId;
    let url = `${baseUrl}/funding?merchid=${mid}`;
    if (date) url += `&date=${date}`;
    const { data } = await axios.get(url, {
        headers: headers(), timeout: 10000,
    });
    return data;
}

// ── Void / Refund ────────────────────────────────────────────────────────────

async function voidTransaction(retref, merchantId) {
    const { baseUrl, merchId } = cfg();
    const mid = merchantId || merchId;
    const { data } = await axios.put(`${baseUrl}/void`,
        { retref, merchantid: mid },
        { headers: headers(), timeout: 10000 }
    );
    return data;
}

async function refundTransaction(retref, amount, merchantId) {
    const { baseUrl, merchId } = cfg();
    const mid = merchantId || merchId;
    const body = { retref, merchantid: mid };
    if (amount) body.amount = String(amount);
    const { data } = await axios.put(`${baseUrl}/refund`, body, {
        headers: headers(), timeout: 10000,
    });
    return data;
}

// ── Merchant Info ────────────────────────────────────────────────────────────

async function inquireMerchant(merchantId) {
    const { baseUrl, merchId } = cfg();
    const mid = merchantId || merchId;
    const { data } = await axios.get(`${baseUrl}/inquireMerchant/${mid}`, {
        headers: headers(), timeout: 10000,
    });
    return data;
}

async function getBinInfo(token, merchantId) {
    const { baseUrl, merchId } = cfg();
    const mid = merchantId || merchId;
    const { data } = await axios.get(`${baseUrl}/bin/${mid}/${token}`, {
        headers: headers(), timeout: 10000,
    });
    return data;
}

// ── Customer Profiles (stored card tokens / recurring) ───────────────────────
// CardPointe Profile API stores tokenized card data server-side so no raw PANs
// are transmitted after initial tokenization.

async function createProfile(profileData, merchantId) {
    const { baseUrl, merchId } = cfg();
    const mid = merchantId || merchId;
    // profile field = existing "profileid/acctid" string for updates; omit for new profile creation
    const body = { ...profileData, merchid: mid };
    if (!body.profile) delete body.profile;
    const { data } = await axios.put(`${baseUrl}/profile`, body, {
        headers: headers(), timeout: 10000,
    });
    return data;
}

async function getProfile(profileId, acctId, merchantId) {
    const { baseUrl, merchId } = cfg();
    const mid = merchantId || merchId;
    const aid = acctId || '0';
    const { data } = await axios.get(`${baseUrl}/profile/${profileId}/${aid}/${mid}`, {
        headers: headers(), timeout: 10000,
    });
    return data;
}

async function deleteProfile(profileId, acctId, merchantId) {
    const { baseUrl, merchId } = cfg();
    const mid = merchantId || merchId;
    const { data } = await axios.delete(`${baseUrl}/profile/${profileId}/${acctId}/${mid}`, {
        headers: headers(), timeout: 10000,
    });
    return data;
}

// ── Authorize (CNP) ─────────────────────────────────────────────────────────
// Used for card-not-present charges. account can be raw PAN, token, or profileid/acctid.

async function authorizePayment(body, merchantId) {
    const { baseUrl, merchId } = cfg();
    const mid = merchantId || merchId;
    const payload = { ...body, merchantid: mid };
    const { data } = await axios.post(`${baseUrl}/auth`, payload, {
        headers: headers(), timeout: 15000,
    });
    return data;
}

// ── Bolt Terminal API (card-present) ────────────────────────────────────────
// Requires a physical HSN (device serial). HSN is assigned when hardware ships.

async function getBoltTerminalStatus(hsn) {
    const { data } = await axios.get(`${BOLT_BASE_URL}v3/status?hsn=${hsn}`, {
        headers: boltHeaders(), timeout: 10000,
    });
    return data;
}

async function listBoltTerminals() {
    const { data } = await axios.get(`${BOLT_BASE_URL}v3/listTerminals`, {
        headers: boltHeaders(), timeout: 10000,
    });
    return data;
}

async function boltReadCard(hsn, amount, orderId) {
    const body = { hsn, amount, orderId };
    const { data } = await axios.post(`${BOLT_BASE_URL}v3/readCard`, body, {
        headers: boltHeaders(), timeout: 30000,
    });
    return data;
}

// ── Gateway metadata ─────────────────────────────────────────────────────────

function getGatewayInfo() {
    const { baseUrl, merchId, surchargeMid, username, password, boltKey } = cfg();
    const isLive = baseUrl && !baseUrl.includes('uat');
    return {
        merchantId:    merchId,
        surchargeMid:  surchargeMid,
        environment:   isLive ? 'production' : 'sandbox',
        baseUrl:       baseUrl,
        boltBaseUrl:   BOLT_BASE_URL,
        boltConfigured: !!boltKey,
        configured:    !!(merchId && username && password),
    };
}

module.exports = {
    // Transaction
    inquireTransaction,
    getTransactionSummary,
    // Settlement / Funding
    getSettlementStatus,
    getFunding,
    // Void / Refund
    voidTransaction,
    refundTransaction,
    // Merchant
    inquireMerchant,
    getBinInfo,
    // Customer Profiles
    createProfile,
    getProfile,
    deleteProfile,
    // Authorize (CNP)
    authorizePayment,
    // Bolt Terminal
    getBoltTerminalStatus,
    listBoltTerminals,
    boltReadCard,
    // Metadata
    getGatewayInfo,
};
