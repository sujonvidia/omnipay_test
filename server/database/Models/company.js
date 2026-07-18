const { conna } = require('../util')
const mongoose = require('mongoose')
const { v4: uuidv4 } = require('uuid')

const companySchema = new mongoose.Schema({
    company_id: { type: String, default: uuidv4 },
    company_name: { type: String, required: true },
    industry: { type: String, default: "" },
    domain_name: { type: String, default: "" },
    company_size: { type: String, default: "" },
    created_by: { type: String, default: "" },
    created_by_role: { type: String, default: "" },
    plan_name: { type: String, default: "starter" },
    plan_user_limit: { type: String, default: "50" },
    is_deactivate: { type: Number, default: 0 },
}, {
    timestamps: true
})

companySchema.index({ company_id: 1 });
companySchema.index({ company_name: 1 });

module.exports = conna.model('company', companySchema)
