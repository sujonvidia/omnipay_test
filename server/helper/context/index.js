const jwt = require('jsonwebtoken')
const { conna } = require('../../database/util')
const User = require('../../database/Models/user')

// Populates req.email / req.loggedInUserId / req.company_id from the
// access_token cookie (or Authorization header as a Postman-friendly
// fallback), for the GraphQL context builder.
module.exports.verifyGraphqlUser = async (req) => {
    if (conna.readyState !== 1) {
        const err = new Error('Database unavailable (mongo readyState=' + conna.readyState + ')');
        err.code = 'DB_UNAVAILABLE';
        throw err;
    }
    req.email = null;
    req.company_id = null;
    req.loggedInUserId = null;

    let token = req.cookies?.access_token;

    if (!token && req.headers.cookie) {
        const cookies = {};
        req.headers.cookie.split(';').forEach(cookie => {
            const parts = cookie.match(/(.*?)=(.*)$/);
            if (parts) cookies[parts[1].trim()] = (parts[2] || '').trim();
        });
        token = cookies.access_token;
    }

    if (!token && req.headers.authorization) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        throw new Error('Authorization error');
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const user = await User.findOne({ id: payload.id }).lean();
    if (!user) throw new Error('Authorization error');

    req.email = user.email;
    req.loggedInUserId = user.id;
    req.company_id = user.company_id;
    req.firstname = user.firstname;
    req.lastname = user.lastname;
}

module.exports.verifyRestAPIUser = async (req, res, next) => {
    const bearerHeader = req.headers.authorization;
    if (!bearerHeader) {
        return res.status(401).json({ error: 'Unauthorized - Token not provided' });
    }
    try {
        const token = bearerHeader.split(' ')[1];
        const payload = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const user = await User.findOne({ id: payload.id });
        if (!user?.email) return res.status(401).json({ error: 'Unauthorized - Invalid token' });
        req.company_id = user.company_id;
        req.loggedInUserId = user.id;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
}

// Finance routes: accepts Basic Auth (CARDPOINTE_USERNAME:CARDPOINTE_PASSWORD,
// for Postman / service-to-service calls) OR Bearer JWT (logged-in users).
module.exports.verifyFinanceAccess = async (req, res, next) => {
    const authHeader = req.headers.authorization || '';

    if (authHeader.startsWith('Basic ')) {
        try {
            const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
            const [user, pass] = decoded.split(':');
            if (
                user === process.env.CARDPOINTE_USERNAME &&
                pass === process.env.CARDPOINTE_PASSWORD
            ) {
                req.company_id = null;
                req.loggedInUserId = 'finance_service';
                return next();
            }
        } catch (_) { /* fall through to 401 */ }
        return res.status(401).json({ error: 'Unauthorized - Invalid credentials' });
    }

    if (authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.slice(7);
            const payload = jwt.verify(token, process.env.JWT_SECRET_KEY);
            const user = await User.findOne({ id: payload.id });
            if (user?.email) {
                req.company_id = user.company_id;
                req.loggedInUserId = user.id;
                return next();
            }
        } catch (_) { /* fall through to 401 */ }
        return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

    return res.status(401).json({ error: 'Unauthorized - Provide Basic or Bearer auth' });
}

module.exports.verifyRefreshToken = async (req) => {
    const refreshToken = req?.cookies?.refresh_token || req?.body?.refresh_token;
    if (!refreshToken) throw new Error('No refresh token provided');
    const payload = jwt.verify(refreshToken, process.env.REFRESH_JWT_SECRET_KEY);
    const user = await User.findOne({ id: payload.id });
    if (!user) throw new Error('User Authentication Failed');
    return user;
}
