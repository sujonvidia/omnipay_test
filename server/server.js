'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { ApolloServer } = require('apollo-server-express');

const { conna } = require('./database/util');
const typeDefs = require('./typeDefs');
const resolvers = require('./Resolvers');
const { verifyGraphqlUser } = require('./helper/context');
const financeRoutes = require('./routes/v1/finance');

const AUTH_NOT_REQUIRED = new Set([
    'signup_otp_send',
    'signup',
    'login',
    'forgot_password',
    'email_otp_verify',
    'set_new_password',
]);

const app = express();
app.use(cors({ origin: (process.env.CLIENT_BASE_URL || '').replace(/\/$/, ''), credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));

const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    context: async ({ req, res }) => {
        const contextObj = {};
        if (req) {
            const opName = req.body?.operationName?.toLowerCase() || '';
            if (!AUTH_NOT_REQUIRED.has(opName)) {
                await verifyGraphqlUser(req);
            }
            contextObj.req = req;
            contextObj.res = res;
            contextObj.email = req.email;
            contextObj.company_id = req.company_id;
            contextObj.firstname = req.firstname;
            contextObj.lastname = req.lastname;
            contextObj.loggedInUserId = req.loggedInUserId;
        }
        return contextObj;
    },
    formatError: (error) => {
        console.error('[graphql]', error.message);
        return { message: error.message };
    },
    debug: process.env.NODE_ENV !== 'production',
});

apolloServer.applyMiddleware({ app, path: '/graphql', cors: false });

app.use('/v1', financeRoutes);

app.get('/v1/health', (req, res) => {
    res.json({ status: true, mongo: conna.readyState === 1 ? 'connected' : 'disconnected' });
});

process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));
process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));

const PORT = process.env.API_SERVER_PORT || 4101;
app.listen(PORT, () => {
    console.log(`OmniPay finance server listening on PORT: ${PORT}`);
    console.log(`GraphQL endpoint: /graphql`);
});
