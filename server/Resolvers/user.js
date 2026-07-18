const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const isUuid = require('uuid-validate');
const Validator = require('validator');
const { combineResolvers } = require('graphql-resolvers');
const useragent = require('useragent');
const sanitizeHtml = require('sanitize-html');

const User = require('../database/Models/user');
const Company = require('../database/Models/company');
const Login_history = require('../database/Models/login_history');
const OTP = require('../database/Models/otp');
const { sg_email_send } = require('../utils/sg_email');
const {
    passwordToHass, containsNumberAndLetter,
    check_company_limit, addNewCompany, signup_add_user,
} = require('../utils/common');
const { isAuthenticated } = require('./middleware');

const OTP_TTL_MS = 5 * 60 * 1000;
const ACCESS_COOKIE_MAX_AGE = 24 * 60 * 60 * 1000;
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

function emailFooter() {
    return `${process.env.APP_TITLE} Team<br>W: ${process.env.APP_DOMAIN}<br>E: ${process.env.APP_SUPPORT_EMAIL}`;
}

function generateOtpCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function getJwtSecrets() {
    const secret = process.env.JWT_SECRET_KEY;
    const refreshSecret = process.env.REFRESH_JWT_SECRET_KEY;
    if (!secret || !refreshSecret) {
        throw new Error('JWT_SECRET_KEY and REFRESH_JWT_SECRET_KEY environment variables must be set');
    }
    return { secret, refreshSecret };
}

function signTokens(userId) {
    const { secret, refreshSecret } = getJwtSecrets();
    return {
        token: jwt.sign({ id: userId }, secret, { expiresIn: '1d' }),
        refresh_token: jwt.sign({ id: userId }, refreshSecret, { expiresIn: '30d' }),
    };
}

function setCookies(res, token, refresh_token) {
    if (!res) return;
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('access_token', token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: ACCESS_COOKIE_MAX_AGE,
        path: '/',
    });
    res.cookie('refresh_token', refresh_token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        maxAge: REFRESH_COOKIE_MAX_AGE,
        path: '/',
    });
}

// Single OTP mechanism for the whole app — one collection (`OTP`), scoped
// by `purpose` so a signup code can't be replayed against forgot-password.
async function issueOtp(email, purpose) {
    const code = generateOtpCode();
    await OTP.create({
        email: email.toLowerCase().trim(),
        code,
        purpose,
        expires_at: new Date(Date.now() + OTP_TTL_MS),
    });
    return code;
}

async function verifyAndConsumeOtp(email, purpose, code) {
    const otp = await OTP.findOneAndUpdate(
        {
            email: email.toLowerCase().trim(),
            purpose,
            code: code.toString(),
            consumed: false,
            expires_at: { $gt: new Date() },
        },
        { $set: { consumed: true } },
    );
    return !!otp;
}

async function recordLoginHistory(user, req, login_status) {
    try {
        const ua = useragent.parse(req.headers['user-agent'] || '');
        await Login_history.create({
            user_id: user.id,
            company_id: user.company_id,
            ipAddress: req.headers['x-forwarded-for'] || req.ip || '',
            os_name: ua.os?.family || '',
            os_version: ua.os?.toVersion?.() || '',
            ua_client: ua.family || '',
            ua_client_version: ua.toVersion?.() || '',
            login_status,
        });
    } catch (e) {
        console.error('login_history save error:', e.message);
    }
}

function toUserPayload(user, tokens) {
    return {
        id: user.id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        company_id: user.company_id,
        role: user.role,
        is_verified: user.is_verified,
        cardpointe_profile_id: user.cardpointe_profile_id,
        cardpointe_acct_id: user.cardpointe_acct_id,
        token: tokens?.token || null,
        refresh_token: tokens?.refresh_token || null,
    };
}

module.exports = {
    Query: {
        me: combineResolvers(isAuthenticated, async (_, __, { loggedInUserId }) => {
            const user = await User.findOne({ id: loggedInUserId }).lean();
            if (!user) return null;
            return toUserPayload(user);
        }),
        user: combineResolvers(isAuthenticated, async (_, { id }, { loggedInUserId }) => {
            const user = await User.findOne({ id: id || loggedInUserId }).lean();
            if (!user) return null;
            return toUserPayload(user);
        }),
        users: combineResolvers(isAuthenticated, async (_, __, { company_id }) => {
            const list = await User.find({ company_id, is_delete: 0 }).lean();
            return list.map(u => toUserPayload(u));
        }),
    },

    Mutation: {
        signup_otp_send: async (_, { input }) => {
            try {
                if (!Validator.isEmail(input.email)) {
                    return { status: false, message: 'Email is invalid.' };
                }

                if (input.company_id) {
                    const alreadyRegistered = await User.findOne({ email: input.email, company_id: input.company_id }).lean();
                    if (alreadyRegistered) {
                        return { status: false, message: 'This user is already registered.' };
                    }
                }

                const code = await issueOtp(input.email, 'signup');
                const firstName = input.firstname || input.email;
                const lastName = input.lastname || '';

                const emaildata = {
                    to: input.email,
                    subject: `${process.env.APP_TITLE} email verification code`,
                    text: `${code} is your ${process.env.APP_TITLE} verification code.`,
                    html: `Hi ${firstName} ${lastName},<br><br>Thanks for signing up with ${process.env.APP_TITLE}! Verify your email with this code:<h2>${code}</h2>This code expires in 5 minutes.<br><br>${emailFooter()}`,
                };

                const result = await sg_email_send(emaildata);
                if (result.msg !== 'success') {
                    return { status: false, message: `${process.env.APP_TITLE} verification code could not be sent.` };
                }

                return { status: true, message: 'Verification code sent successfully.' };
            } catch (error) {
                console.error('signup_otp_send error:', error);
                return { status: false, message: 'Unexpected error.' };
            }
        },

        signup: async (_, { input }) => {
            try {
                if (!Validator.isEmail(input.email)) {
                    return { status: false, message: 'Email is invalid.' };
                }
                if (!containsNumberAndLetter(input.password) || input.password.length < 8) {
                    return { status: false, message: 'Password must be at least 8 characters and contain both letters and numbers.' };
                }

                const codeOk = await verifyAndConsumeOtp(input.email, 'signup', input.code);
                if (!codeOk) {
                    return { status: false, message: 'Verification code is invalid or expired.' };
                }

                let company_id = input.company_id;
                if (input.company_name?.trim()) {
                    if (!input.industry) return { status: false, message: 'Industry is required.' };
                    if (!input.company_size) return { status: false, message: 'Company size is required.' };

                    const company = await addNewCompany(input);
                    if (!company?.company_id) {
                        return { status: false, message: 'A company with this name already exists.' };
                    }
                    company_id = company.company_id;
                }

                if (!company_id || !isUuid(company_id)) {
                    return { status: false, message: 'A valid company_id (or company_name to create one) is required.' };
                }

                const [hasLimit, alreadyRegistered] = await Promise.all([
                    check_company_limit(company_id, 1),
                    User.findOne({ email: input.email, company_id }).lean(),
                ]);
                if (!hasLimit) return { status: false, message: 'This company has reached its user limit.' };
                if (alreadyRegistered) return { status: false, message: 'This user is already registered.' };

                const addeduser = await signup_add_user({ ...input, company_id });
                const tokens = signTokens(addeduser.id);

                return {
                    status: true,
                    message: `${process.env.APP_TITLE} account created successfully.`,
                    data: toUserPayload(addeduser, tokens),
                };
            } catch (e) {
                console.error('signup error:', e);
                return { status: false, message: 'Unexpected error.' };
            }
        },

        login: async (_, { input }, { req, res }) => {
            try {
                if (!Validator.isEmail(input.email)) {
                    return { status: false, message: 'Email is invalid.' };
                }

                const user = await User.findOne({ email: input.email.toLowerCase().trim() });
                if (!user) {
                    return { status: false, message: 'Invalid email or password.' };
                }
                if (user.is_delete === 1 || user.is_active !== 1) {
                    return { status: false, message: 'This account is disabled.' };
                }

                const passwordMatch = await bcrypt.compare(input.password, user.password);
                if (!passwordMatch) {
                    await recordLoginHistory(user, req, false);
                    return { status: false, message: 'Invalid email or password.' };
                }

                const tokens = signTokens(user.id);
                setCookies(res, tokens.token, tokens.refresh_token);

                user.login_total = (user.login_total || 0) + 1;
                user.last_login = new Date();
                await user.save();
                await recordLoginHistory(user, req, true);

                return {
                    status: true,
                    message: 'Login successful.',
                    data: toUserPayload(user, tokens),
                };
            } catch (error) {
                console.error('login error:', error);
                return { status: false, message: 'Unexpected error.' };
            }
        },

        forgot_password: async (_, { input }) => {
            try {
                if (!Validator.isEmail(input.email)) {
                    return { status: false, message: 'Email is invalid.' };
                }

                const user = await User.findOne({ email: input.email.toLowerCase().trim() }).lean();
                // Always return a generic success message regardless of whether the
                // account exists, so this endpoint can't be used to enumerate emails.
                if (user) {
                    const code = await issueOtp(input.email, 'forgot_password');
                    const emaildata = {
                        to: user.email,
                        subject: `${process.env.APP_TITLE} password reset code`,
                        text: `${code} is your ${process.env.APP_TITLE} password reset code.`,
                        html: `Hi ${user.firstname} ${user.lastname},<br><br>A password reset was requested for your account. Use this code to reset your password. If you didn't request this, ignore this email.<br><br><b>Code: ${code}</b><br><br>This code expires in 5 minutes.<br><br>${emailFooter()}`,
                    };
                    await sg_email_send(emaildata);
                }

                return { status: true, message: 'If that email is registered, a reset code has been sent.' };
            } catch (error) {
                console.error('forgot_password error:', error);
                return { status: false, message: 'Unexpected error.' };
            }
        },

        email_otp_verify: async (_, { input }) => {
            try {
                const otp = await OTP.findOne({
                    email: input.email.toLowerCase().trim(),
                    purpose: 'forgot_password',
                    code: input.code.toString(),
                    consumed: false,
                    expires_at: { $gt: new Date() },
                }).lean();

                return otp
                    ? { status: true, message: 'Code verified successfully.' }
                    : { status: false, message: 'Code is invalid or expired.' };
            } catch (e) {
                console.error('email_otp_verify error:', e);
                return { status: false, message: 'Unexpected error.' };
            }
        },

        set_new_password: async (_, { input }) => {
            try {
                if (!containsNumberAndLetter(input.password) || input.password.length < 8) {
                    return { status: false, message: 'Password must be at least 8 characters and contain both letters and numbers.' };
                }

                const codeOk = await verifyAndConsumeOtp(input.email, 'forgot_password', input.code);
                if (!codeOk) {
                    return { status: false, message: 'Code is invalid or expired.' };
                }

                const hashed = await passwordToHass(input.password);
                const result = await User.updateOne(
                    { email: input.email.toLowerCase().trim() },
                    { $set: { password: hashed } },
                );
                if (result.matchedCount === 0) {
                    return { status: false, message: 'Account not found.' };
                }

                return { status: true, message: 'Password updated successfully.' };
            } catch (error) {
                console.error('set_new_password error:', error);
                return { status: false, message: 'Unexpected error.' };
            }
        },

        update_user: combineResolvers(isAuthenticated, async (_, { input }, { loggedInUserId }) => {
            try {
                const updates = {};
                if (input.firstname !== undefined) updates.firstname = sanitizeHtml(input.firstname);
                if (input.lastname !== undefined) updates.lastname = sanitizeHtml(input.lastname);
                if (input.phone !== undefined) updates.phone = sanitizeHtml(input.phone);

                const user = await User.findOneAndUpdate(
                    { id: loggedInUserId },
                    { $set: updates },
                    { new: true },
                );
                if (!user) return { status: false, message: 'User not found.' };

                return { status: true, message: 'Profile updated successfully.', data: toUserPayload(user) };
            } catch (error) {
                console.error('update_user error:', error);
                return { status: false, message: 'Unexpected error.' };
            }
        }),

        logout: combineResolvers(isAuthenticated, async (_, __, { req, res }) => {
            try {
                res?.clearCookie('access_token', { path: '/' });
                res?.clearCookie('refresh_token', { path: '/' });
                return { status: true, message: 'Logged out successfully.' };
            } catch (error) {
                console.error('logout error:', error);
                return { status: false, message: 'Unexpected error.' };
            }
        }),
    },
};
