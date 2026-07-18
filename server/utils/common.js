const bcrypt = require('bcryptjs');
const shortUuid = require('short-uuid');
const { v4: uuidv4 } = require('uuid');
const User = require('../database/Models/user');
const Company = require('../database/Models/company');

function passwordToHass(str) {
    return new Promise((resolve, reject) => {
        bcrypt.genSalt(10, (err, salt) => {
            if (err) return reject(err);
            bcrypt.hash(str, salt, (err, hash) => {
                if (err) return reject(err);
                resolve(hash);
            });
        });
    });
}

function containsNumberAndLetter(input) {
    const numberRegex = /\d/;
    const letterRegex = /[a-zA-Z]/;
    return numberRegex.test(input) && letterRegex.test(input);
}

function setShortID() {
    return shortUuid.generate();
}

// Plan seat-limit check — mirrors Workfreeli's check_company_limit.
async function check_company_limit(company_id, len) {
    const c = await Company.findOne({ company_id }).lean();
    if (!c) return false;
    let plan_user_limit = parseInt(c.plan_user_limit, 10);
    plan_user_limit = plan_user_limit > 50 ? plan_user_limit : 50;
    const count = await User.countDocuments({ company_id: company_id.toString(), is_active: 1 });
    return plan_user_limit > (count + len);
}

// Creates a Company doc at signup time. Returns false if the company name
// already exists (caller treats that as a duplicate error).
async function addNewCompany(data) {
    const existing = await Company.findOne({ company_name: data.company_name }).lean();
    if (existing) return false;

    const company = new Company({
        company_id: uuidv4(),
        company_name: data.company_name,
        industry: data.industry || '',
        domain_name: data.domain_name || '',
        company_size: data.company_size || '',
        created_by_role: data.role || '',
    });
    const saved = await company.save();
    return Company.findOne({ company_id: saved.company_id }).lean();
}

// Creates the User document for a fresh signup.
async function signup_add_user(input) {
    const id = uuidv4();
    const newUser = {
        id,
        firstname: input.firstname || '',
        lastname: input.lastname || '',
        email: input.email.toLowerCase().trim(),
        password: await passwordToHass(input.password),
        role: input.company_name?.trim() ? 'admin' : 'member',
        phone: input.phone || '',
        company_id: input.company_id || '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        is_verified: true,
        created_by: id,
    };
    const addeduser = await User.create(newUser);
    if (newUser.role === 'admin') {
        await Company.updateOne({ company_id: addeduser.company_id }, { created_by: addeduser.id });
    }
    return addeduser;
}

module.exports = {
    passwordToHass,
    containsNumberAndLetter,
    setShortID,
    check_company_limit,
    addNewCompany,
    signup_add_user,
};
