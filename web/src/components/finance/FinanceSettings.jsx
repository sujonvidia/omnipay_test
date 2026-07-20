import { useState, useEffect } from 'react';
import {
    FiDollarSign, FiPercent, FiCalendar, FiSettings, FiShield, FiUsers,
    FiAlertCircle, FiCheckCircle, FiX, FiFileText, FiGrid, FiTrendingUp,
    FiPlus, FiEdit2, FiMoreHorizontal, FiMapPin, FiStar, FiLayout,
} from 'react-icons/fi';

const BASE = import.meta.env.VITE_BASE_URL || '';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

const money = (n) => `$${Number(n).toLocaleString()}`;

function SparkleIcon({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3z" fill="var(--primary)" />
            <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14z" fill="var(--primary)" />
        </svg>
    );
}

function Badge({ tone = 'gray', children }) {
    return <span className={`badge ${tone}`}>{children}</span>;
}

// ─── Reference data for the non-Business-Config settings tabs (mirrors the
// OmniPay POS design reference — same static shape as Business Config's own
// mock setup-status content above; not backed by an API yet). ─────────────

const PRICING_RULES = [
    { id: 'high-value', name: 'High-Value Discount Rule', status: 'Active', statusColor: 'green',
        desc: 'Discounts above 15% require approval.',
        trigger: 'When discount exceeds 15%',
        appliesTo: ['All quotes', 'High-value deals'],
        behavior: 'Requires approval before proceeding',
        routing: [
            { role: 'Sales Manager', note: 'Initial review' },
            { role: 'Finance', note: 'Margin validation' },
            { role: 'Director', note: 'Final approval for high-value cases' },
        ] },
    { id: 'standard', name: 'Standard Discount Rule', status: 'Active', statusColor: 'green',
        desc: 'Allows discounts up to 10% without approval.', sub: 'Used across most quotes' },
    { id: 'customer-specific', name: 'Customer-Specific Pricing', status: 'Warning', statusColor: 'amber',
        desc: 'Special terms for strategic accounts.', sub: 'Limited coverage' },
    { id: 'uncontrolled', name: 'Uncontrolled Discounting', status: 'Missing', statusColor: 'red',
        desc: 'No rule defined for discounts above 20%.', sub: 'Risk of margin erosion' },
    { id: 'promotional', name: 'Promotional Discount Rule', status: 'Active', statusColor: 'green',
        desc: 'Time-bound discounts for campaigns.', sub: 'Seasonal promotions' },
    { id: 'volume', name: 'Volume-Based Discount Rule', status: 'Active', statusColor: 'green',
        desc: 'Tiered discounts applied to high-volume orders.', sub: 'Applied to repeat orders' },
];

const APPROVAL_RULES = [
    { id: 'high-value-quotes', name: 'High-value quotes', sub: 'Quotes above $25K',
        status: 'Active', statusColor: 'green', icon: '$',
        desc: 'Requires approval for quotes with a total value above $25,000.',
        trigger: 'Approval required when quote total exceeds $25,000',
        appliesTo: ['All companies', 'Quote transactions only'],
        routing: [
            { role: 'Sales Manager', note: 'Initial review of quote and commercial terms' },
            { role: 'Finance', note: 'Financial validation and risk assessment' },
            { role: 'Director', note: 'Final approval for high-value cases' },
        ],
        escalation: [
            'If not approved within 24 hours, escalate to next approver',
            'If quote value exceeds $50,000, skip to Director',
        ],
        outcome: [
            'Quote cannot be sent to customer until fully approved',
            'System prevents conversion to invoice until approval is completed',
        ] },
    { id: 'large-discounts', name: 'Large discounts', sub: 'Discounts above 15%',
        status: 'Warning', statusColor: 'amber', icon: '%' },
    { id: 'extended-payment', name: 'Extended payment', sub: 'Terms above Net 30',
        status: 'Missing', statusColor: 'red', icon: 'calendar' },
    { id: 'custom-rule', name: 'Custom rule', sub: 'Special conditions',
        status: 'Warning', statusColor: 'amber', icon: 'settings' },
];

const ROLES = [
    { id: 'finance', name: 'Finance', users: 2, status: 'Active', icon: 'grid',
        desc: 'Manages financial data, transactions, and approvals',
        companies: 'All companies', financial: 'Full access', config: 'Limited access',
        authority: [
            { ok: true, label: 'Approve quotes up to $25K', note: 'Within limit' },
            { ok: true, label: 'Approve discounts up to 15%', note: 'Within limit' },
            { ok: false, label: 'Cannot approve beyond threshold', note: 'Escalates to higher authority' },
        ],
        permissions: [
            { key: 'Quotes', val: 'Can create, edit, and send quotes' },
            { key: 'Invoices', val: 'Full access to invoice lifecycle' },
            { key: 'Payments', val: 'Can record and refund payments' },
            { key: 'Configuration', val: 'View-only access to settings' },
        ] },
    { id: 'admin', name: 'Admin', users: 3, icon: 'shield' },
    { id: 'sales', name: 'Sales', users: 4, icon: 'users' },
    { id: 'operations', name: 'Operations', users: 3, icon: 'settings' },
];

const TEMPLATES = {
    quote: [
        { id: 'standard', name: 'Standard Quote Template', tag: 'Default', tagColor: 'gray',
            sub: 'Default template for most customer quotes',
            usage: 'Used across sales team', note: 'Primary template for everyday quotes' },
        { id: 'enterprise', name: 'Enterprise Pricing Template', tag: 'Most used', tagColor: 'violet',
            sub: 'Includes volume discounts and custom terms',
            usage: 'Used for high-value deals', note: 'Tailored for complex pricing needs' },
        { id: 'simple', name: 'Simple Quote Template',
            sub: 'Clean and simple format for small projects',
            usage: 'Used for small and quick quotes', note: 'Optimized for speed and clarity' },
        { id: 'renewal', name: 'Renewal Quote Template',
            sub: 'Designed for contract renewals and extensions',
            usage: 'Used for existing customers', note: 'Supports renewals and extensions' },
        { id: 'construction', name: 'Construction Quote Template',
            sub: 'For construction and infrastructure projects',
            usage: 'Used by construction team', note: 'Aligned to project and site requirements' },
        { id: 'education', name: 'Education Quote Template', tag: 'Recently updated', tagColor: 'green',
            sub: 'Customized for schools and education clients',
            usage: 'Used for education sector deals', note: 'Includes education-specific terms' },
    ],
    invoice: [
        { id: 'standard-inv', name: 'Standard Invoice Template', tag: 'Default', tagColor: 'gray',
            sub: 'Default template for all invoices',
            usage: 'Used across operations', note: 'Reflects standard billing terms' },
        { id: 'milestone-inv', name: 'Milestone Invoice Template',
            sub: 'Phased billing for project milestones',
            usage: 'Used for project-based clients', note: 'Aligns billing with delivery' },
    ],
};

const CATALOG = {
    equipment: [
        { initial: 'I', name: 'Industrial Pump Assembly', desc: 'Industrial-grade pump for high-pressure fluid systems', price: 280, unit: 'per unit' },
        { initial: 'H', name: 'Hydraulic Filter Kit', desc: 'Replacement filter set for hydraulic systems', price: 280, unit: 'per unit' },
        { initial: 'C', name: 'Control Panel Unit', desc: 'Automated control panel for industrial machinery', price: 1750, unit: 'per unit', tag: 'High-usage', tagColor: 'violet' },
        { initial: 'H', name: 'Heavy-Duty Valve Set', desc: 'Heavy-duty ball valves for industrial piping', price: 450, unit: 'per unit' },
    ],
    services: [
        { initial: 'M', name: 'Maintenance Service Package', desc: 'Scheduled preventive maintenance visits', price: 950, unit: 'per month', tag: 'Recurring', tagColor: 'green' },
        { initial: 'I', name: 'Installation & Deployment', desc: 'Professional installation and site commissioning', price: 3200, unit: 'per project' },
        { initial: 'E', name: 'Emergency Repair Service', desc: 'Priority emergency repair and parts replacement', price: 1250, unit: 'per incident' },
        { initial: 'A', name: 'Annual Service Contract', desc: 'Full-coverage annual maintenance agreement', price: 14000, unit: 'per year', tag: 'Recurring', tagColor: 'green' },
    ],
};

const TABS = [
    { id: 'business', label: 'Business Config' },
    { id: 'approvals', label: 'Approval Rules' },
    { id: 'pricing', label: 'Pricing & Discounts' },
    { id: 'roles', label: 'Roles & Permissions' },
    { id: 'templates', label: 'Templates' },
    { id: 'catalog', label: 'Products & Catalog' },
];

const CHIP_ICONS = {
    Sparkle: SparkleIcon, Plus: FiPlus, Alert: FiAlertCircle, Users: FiUsers,
    Percent: FiPercent, Dollar: FiDollarSign, TrendUp: FiTrendingUp, Star: FiStar, Layout: FiLayout,
};

const TAB_META = {
    approvals: { title: 'Approval Rules', sub: 'Define when approvals are required and who is responsible',
        placeholder: 'Ask anything about approval rules...', chips: [
            { icon: 'Sparkle', title: 'What requires approval?', cat: 'Approvals' },
            { icon: 'Plus', title: 'Create a new rule', cat: 'Rules' },
            { icon: 'Alert', title: 'Review approval gaps', cat: 'Gaps' },
            { icon: 'Users', title: 'Who approves high-value quotes?', cat: 'Routing' },
        ] },
    pricing: { title: 'Pricing Rules & Discounts', sub: 'Control pricing decisions and discount behavior across your organization',
        placeholder: 'Ask anything about pricing rules and discounts...', chips: [
            { icon: 'Plus', title: 'Create a new rule', cat: 'Rules' },
            { icon: 'Percent', title: 'What discounts require approval?', cat: 'Approvals' },
            { icon: 'Alert', title: 'Show risky discounts', cat: 'Risk' },
            { icon: 'Sparkle', title: 'Review margin impact', cat: 'Margin' },
        ] },
    roles: { title: 'Roles & Permissions', sub: 'Control access, actions, and approvals across your organization',
        placeholder: 'Ask anything about roles and permissions...', chips: [
            { icon: 'Sparkle', title: 'Who can approve quotes above $25K?', cat: 'Approvals' },
            { icon: 'Plus', title: 'Create a new role', cat: 'Roles' },
            { icon: 'Alert', title: 'Review access risks', cat: 'Risk' },
            { icon: 'Users', title: 'Show finance users', cat: 'Users' },
        ] },
    templates: { title: 'Templates', sub: 'Create, manage, and standardize your quotes and invoices',
        placeholder: 'Ask anything about your templates...', chips: [
            { icon: 'Plus', title: 'Create a new template', cat: 'Templates' },
            { icon: 'Star', title: 'Which templates are used most?', cat: 'Usage' },
            { icon: 'Sparkle', title: 'Standardize quote format', cat: 'Consistency' },
            { icon: 'Layout', title: 'Review invoice templates', cat: 'Invoices' },
        ] },
    catalog: { title: 'Products & Catalog', sub: 'Structured catalog for pricing quotes, standardizing pricing, and enabling consistent information',
        placeholder: 'Ask anything about your products and catalog...', chips: [
            { icon: 'TrendUp', title: 'Which products are used most?', cat: 'Usage' },
            { icon: 'Dollar', title: 'Show high-margin items', cat: 'Margin' },
            { icon: 'Sparkle', title: 'Suggest upsells', cat: 'Revenue' },
            { icon: 'Percent', title: 'Review pricing consistency', cat: 'Pricing' },
        ] },
};

const TAB_AI = {
    approvals: { title: 'Approval Intelligence',
        alert: { tone: 'red', title: 'High-value approvals lack full coverage', text: 'Critical gaps in approval rules' },
        sections: [
            { kind: 'list', items: [
                { tone: 'red', title: 'No rule exists for quotes above $50k' },
                { tone: 'red', title: 'Discount approvals not defined' },
                { tone: 'green', title: 'Define escalation for high-value quotes' },
                { tone: 'green', title: 'Add approval rule for discounts above 20%' },
            ] },
            { label: 'Final Insight', kind: 'list', items: [
                { tone: 'violet', title: 'Ensure all financial thresholds are covered by approval rules', sub: 'Complete coverage reduces risk and improves control' },
            ] },
        ],
        suggested: { title: 'Add rule for quotes above $50k', text: 'with automatic Director approval' } },
    pricing: { title: 'Pricing Insights',
        sections: [
            { kind: 'signals', items: [
                { tone: 'amber', icon: 'alert', title: 'Discounts above typical levels are not consistently controlled', sub: 'Gaps in rules create opportunities for unapproved discounts.' },
                { tone: 'violet', icon: 'alert', title: 'A small number of deals drive most pricing risk', sub: 'Focus on high-impact quotes to reduce margin exposure.' },
                { tone: 'violet', icon: 'alert', title: 'High-value quotes require stricter discount rules', sub: 'Stronger controls protect margins on larger transactions.' },
                { tone: 'violet', icon: 'trend-up', title: 'Inconsistent pricing can reduce margin predictability', sub: 'Standardized rules help maintain reliable pricing outcomes.' },
                { tone: 'green', icon: 'check', title: 'Clear discount rules reduce approval friction', sub: 'Well-defined rules speed up deal cycles and reduce back-and-forth.' },
            ] },
        ],
        suggested: { title: 'Ask AI about pricing rules', text: '' } },
    roles: { title: 'Access Intelligence',
        alert: { tone: 'red', title: 'High-value approvals lack coverage', text: 'Critical gap in approval authority' },
        sections: [
            { kind: 'list', items: [
                { tone: 'red', title: 'No role can approve quotes above $50k', sub: 'High-value quotes need coverage' },
                { tone: 'amber', title: 'Too many users have full financial access', sub: 'Increases risk of exposure' },
                { tone: 'green', title: 'Assign approval authority for high-value quotes' },
                { tone: 'green', title: 'Reduce admin-level access', sub: 'Apply least-privilege principles' },
            ] },
        ],
        suggested: { title: 'Ensure approval coverage across all financial thresholds', text: 'Strengthen controls and reduce financial risk' } },
    templates: { title: 'Template Insights',
        sections: [
            { kind: 'list', items: [
                { tone: 'violet', title: 'Most quotes use the standard template', sub: "It's the primary choice for everyday quotes across the team." },
                { tone: 'violet', title: 'High-value deals often require custom templates', sub: 'Custom pricing and terms are commonly needed for complex transactions.' },
                { tone: 'green', title: 'Invoice structure is consistent across customers', sub: 'A unified structure helps maintain clarity and reduces rework.' },
                { tone: 'amber', title: 'Updating templates could improve efficiency', sub: 'Updating default templates could improve efficiency.' },
                { tone: 'violet', title: 'A small set of templates drives most usage', sub: 'Focusing on a few key templates creates the biggest impact.' },
            ] },
        ],
        suggested: { title: 'Ask AI about your templates', text: '' } },
    catalog: { title: 'Catalog Insights',
        alert: { tone: 'amber', title: 'Pricing varies across similar items', text: 'Inconsistent rates may affect quote accuracy' },
        sections: [
            { kind: 'list', items: [
                { tone: 'violet', title: 'A small group of products drives most revenue' },
                { tone: 'green', title: 'Service packages create consistent recurring income' },
                { tone: 'amber', title: 'Pricing varies across similar items' },
                { tone: 'red', title: 'High-margin items are underutilized' },
                { tone: 'violet', title: 'Standardize pricing model across equipment lines' },
            ] },
            { kind: 'snapshot', label: 'Catalog Summary', rows: [
                { label: 'Equipment items', val: '4' },
                { label: 'Service packages', val: '4' },
                { label: 'Recurring products', val: '2' },
                { label: 'Pricing gaps', val: '3', color: 'var(--amber-text)' },
            ] },
        ],
        suggested: { title: 'Review pricing consistency', text: 'Standardized rates improve quote accuracy and customer trust' } },
};

const TAB_BANNER = {
    approvals: '2 approval rules have critical gaps — quotes above $50K and extended payment terms have no coverage.',
    pricing: 'Uncontrolled discounting gap detected — no rule covers discounts above threshold, creating margin erosion risk.',
    roles: 'No role currently covers approvals above $50K — high-value quotes are at risk.',
    catalog: 'Pricing varies across similar equipment items — standardizing rates could reduce quote inconsistencies.',
};

function SettingsTabs({ active, onChange }) {
    return (
        <div className="tabs" style={{ margin: '24px 0px 16px', overflowX: 'auto' }}>
            {TABS.map((t) => (
                <div key={t.id} className={`tab${active === t.id ? ' active' : ''}`} onClick={() => onChange(t.id)}>
                    {t.label}
                </div>
            ))}
        </div>
    );
}

function AiInsightsPanel({ ai }) {
    const SIGNAL_ICONS = { alert: FiAlertCircle, 'trend-up': FiTrendingUp, check: FiCheckCircle };
    return (
        <>
            <div className="ai-panel-header">
                <div className="ai-panel-title">
                    <SparkleIcon size={16} />
                    <span>{ai.title}</span>
                </div>
                <span className="ai-live">Live</span>
            </div>

            {ai.alert && (
                <div className={`ai-alert ${ai.alert.tone}`}>
                    <div className="ai-alert-icon"><FiAlertCircle size={18} /></div>
                    <div className="ai-alert-body">
                        <div className="ai-alert-title">{ai.alert.title}</div>
                        <div className="ai-alert-text">{ai.alert.text}</div>
                    </div>
                </div>
            )}

            {ai.sections.map((s, si) => {
                if (s.kind === 'snapshot') {
                    return (
                        <div key={si}>
                            <div className="ai-section-label">{s.label}</div>
                            <div className="ai-snapshot">
                                {s.rows.map((row, i) => (
                                    <div key={i} className="ai-snapshot-row">
                                        <span className="label">{row.label}</span>
                                        <span className="val" style={row.color ? { color: row.color } : undefined}>{row.val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                }
                if (s.kind === 'signals') {
                    return (
                        <div key={si}>
                            {s.label && <div className="ai-section-label">{s.label}</div>}
                            {s.items.map((it, i) => {
                                const I = SIGNAL_ICONS[it.icon] || FiAlertCircle;
                                return (
                                    <div key={i} className="ai-signal-card">
                                        <div className={`ai-signal-icon ${it.tone}`}><I size={16} /></div>
                                        <div style={{ flex: '1 1 0%' }}>
                                            <div className="ai-signal-title">{it.title}</div>
                                            {it.sub && <div className="ai-signal-sub">{it.sub}</div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                }
                return (
                    <div key={si}>
                        {s.label && <div className="ai-section-label">{s.label}</div>}
                        <div className="ai-list">
                            {s.items.map((it, i) => (
                                <div key={i} className={`ai-list-item ${it.tone}`}>
                                    <div className="dot" />
                                    <div>
                                        <div className="ai-list-item-title">{it.title}</div>
                                        {it.sub && <div className="ai-list-item-sub">{it.sub}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

            {ai.suggested && (
                <div className="ai-signal-card" style={{ marginTop: 16 }}>
                    <div className="ai-signal-icon violet"><SparkleIcon size={16} /></div>
                    <div style={{ flex: '1 1 0%' }}>
                        <div className="ai-signal-title">{ai.suggested.title}</div>
                        {ai.suggested.text && <div className="ai-signal-sub">{ai.suggested.text}</div>}
                    </div>
                </div>
            )}
        </>
    );
}

function ApprovalRulesTab() {
    const [selectedId, setSelectedId] = useState(APPROVAL_RULES[0].id);
    const selected = APPROVAL_RULES.find((r) => r.id === selectedId) || APPROVAL_RULES[0];
    const ICONS = { $: FiDollarSign, '%': FiPercent, calendar: FiCalendar, settings: FiSettings };

    return (
        <div className="settings-split mt-4">
            <div className="settings-list">
                <div className="ai-section-label" style={{ margin: '4px 12px 8px' }}>Approval Rules</div>
                {APPROVAL_RULES.map((r) => {
                    const I = ICONS[r.icon] || FiSettings;
                    return (
                        <div key={r.id} className={`item${selectedId === r.id ? ' active' : ''}`} onClick={() => setSelectedId(r.id)}>
                            <div className="item-icon"><I size={14} /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 500, fontSize: 13.5 }}>{r.name}</div>
                                <div className="text-meta" style={{ fontSize: 12 }}>{r.sub}</div>
                            </div>
                            <div className={`item-status ${r.statusColor}`} />
                        </div>
                    );
                })}
                <div className="item" style={{ marginTop: 8, color: 'var(--text-tertiary)', border: '1px dashed var(--border)' }}>
                    <FiPlus size={14} /> Add Rule
                </div>
            </div>

            <div className="detail-card">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div style={{ fontWeight: 600, fontSize: 16 }}>{selected.name}</div>
                        <Badge tone={selected.statusColor === 'green' ? 'green' : selected.statusColor === 'amber' ? 'amber' : 'red'}>{selected.status}</Badge>
                    </div>
                    <button className="btn btn-secondary btn-sm"><FiEdit2 size={13} style={{ marginRight: 6 }} />Edit Rule</button>
                </div>
                {selected.desc && <div className="text-secondary" style={{ fontSize: 13.5, marginBottom: 14 }}>{selected.desc}</div>}

                {selected.trigger && (
                    <>
                        <div className="ai-section-label">Trigger</div>
                        <div className="ai-list-item"><div className="dot" /><div>{selected.trigger}</div></div>
                    </>
                )}

                {selected.appliesTo && (
                    <>
                        <div className="ai-section-label">Applies To</div>
                        <div className="flex gap-4">
                            {selected.appliesTo.map((x, i) => <div key={i} className="ai-list-item"><div className="dot" /><div>{x}</div></div>)}
                        </div>
                    </>
                )}

                {selected.routing && (
                    <>
                        <div className="ai-section-label">Approval Routing</div>
                        <div className="flex flex-col gap-2">
                            {selected.routing.map((r, i) => (
                                <div key={i} className="flex items-center gap-3" style={{ fontSize: 13.5 }}>
                                    <FiCheckCircle size={14} color="var(--green-text)" />
                                    <div style={{ width: 140, fontWeight: 600 }}>{r.role}</div>
                                    <div className="text-tertiary">{r.note}</div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {selected.escalation && (
                    <>
                        <div className="ai-section-label">Escalation</div>
                        <div className="flex flex-col gap-2">
                            {selected.escalation.map((x, i) => (
                                <div key={i} className="flex gap-2" style={{ fontSize: 13.5 }}>
                                    <FiTrendingUp size={14} color="var(--text-tertiary)" />
                                    <div>{x}</div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {selected.outcome && (
                    <>
                        <div className="ai-section-label">Outcome</div>
                        <div className="flex flex-col gap-2">
                            {selected.outcome.map((x, i) => (
                                <div key={i} className="flex gap-2" style={{ fontSize: 13.5 }}>
                                    <FiShield size={14} color="var(--text-tertiary)" />
                                    <div>{x}</div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function PricingRulesTab() {
    const [selectedId, setSelectedId] = useState('high-value');
    const selected = PRICING_RULES.find((r) => r.id === selectedId) || PRICING_RULES[0];
    const ICONS = {
        'high-value': FiShield, standard: FiPercent, 'customer-specific': FiUsers,
        uncontrolled: FiAlertCircle, promotional: FiPercent, volume: FiTrendingUp,
    };

    return (
        <div className="settings-split mt-4">
            <div className="settings-list">
                <div className="ai-section-label" style={{ margin: '4px 12px 8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Pricing Rules</span><span>{PRICING_RULES.length}</span>
                </div>
                {PRICING_RULES.map((r) => {
                    const I = ICONS[r.id] || FiPercent;
                    return (
                        <div key={r.id} className={`item${selectedId === r.id ? ' active' : ''}`} onClick={() => setSelectedId(r.id)}>
                            <div className="item-icon"><I size={14} /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 500, fontSize: 13.5 }}>{r.name}</div>
                                <div className="text-meta" style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    <span style={{ color: r.statusColor === 'green' ? 'var(--green-text)' : r.statusColor === 'amber' ? 'var(--amber-text)' : 'var(--red-text)' }}>● {r.status}</span>
                                    {r.sub ? ` · ${r.sub}` : ''}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div className="item" style={{ marginTop: 8, color: 'var(--text-tertiary)', border: '1px dashed var(--border)' }}>
                    <FiPlus size={14} /> Add Rule
                </div>
            </div>

            <div className="detail-card">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div style={{ fontWeight: 600, fontSize: 16 }}>{selected.name}</div>
                        <Badge tone={selected.statusColor === 'green' ? 'green' : selected.statusColor === 'amber' ? 'amber' : 'red'}>{selected.status}</Badge>
                    </div>
                    <button className="btn btn-secondary btn-sm"><FiEdit2 size={13} style={{ marginRight: 6 }} />Edit Rule</button>
                </div>
                <div className="text-secondary mb-4" style={{ fontSize: 13.5 }}>{selected.desc}</div>

                {selected.trigger && (
                    <>
                        <div className="ai-section-label">Trigger</div>
                        <div className="ai-list-item"><div className="dot" /><div>{selected.trigger}</div></div>
                    </>
                )}

                {selected.appliesTo && (
                    <>
                        <div className="ai-section-label">Applies To</div>
                        <div className="flex flex-col gap-2">
                            {selected.appliesTo.map((x, i) => <div key={i} className="ai-list-item"><div className="dot" /><div>{x}</div></div>)}
                        </div>
                    </>
                )}

                {selected.behavior && (
                    <>
                        <div className="ai-section-label">Behavior</div>
                        <div className="ai-list-item"><div className="dot" /><div>{selected.behavior}</div></div>
                    </>
                )}

                {selected.routing && (
                    <>
                        <div className="ai-section-label">Approval Routing</div>
                        <div className="flex flex-col gap-2">
                            {selected.routing.map((r, i) => (
                                <div key={i} className="flex items-center gap-3" style={{ fontSize: 13.5 }}>
                                    <FiCheckCircle size={14} color="var(--green-text)" />
                                    <div style={{ width: 140, fontWeight: 600 }}>{r.role}</div>
                                    <div className="text-tertiary">— {r.note}</div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function RolesTab() {
    const [selectedId, setSelectedId] = useState(ROLES[0].id);
    const selected = ROLES.find((r) => r.id === selectedId) || ROLES[0];
    const ICONS = { grid: FiGrid, shield: FiShield, users: FiUsers, settings: FiSettings };
    const PERM_ICONS = { Quotes: FiFileText, Invoices: FiGrid, Payments: FiDollarSign, Configuration: FiSettings };
    const SelectedIcon = ICONS[selected.icon] || FiSettings;

    return (
        <div className="settings-split mt-4">
            <div className="settings-list">
                <div className="ai-section-label" style={{ margin: '4px 12px 8px' }}>Roles</div>
                {ROLES.map((r) => {
                    const I = ICONS[r.icon] || FiSettings;
                    return (
                        <div key={r.id} className={`item${selectedId === r.id ? ' active' : ''}`} onClick={() => setSelectedId(r.id)}>
                            <div className="item-icon"><I size={14} /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 500, fontSize: 13.5 }}>{r.name}</div>
                                <div className="text-meta" style={{ fontSize: 12 }}>{r.users} users</div>
                            </div>
                            {selectedId === r.id && <div className="item-status" style={{ background: 'var(--primary)' }} />}
                        </div>
                    );
                })}
                <div className="item" style={{ marginTop: 8, color: 'var(--text-tertiary)', border: '1px dashed var(--border)' }}>
                    <FiPlus size={14} /> Add Role
                </div>
            </div>

            <div className="detail-card">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="avatar" style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}>
                            <SelectedIcon size={14} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <div style={{ fontWeight: 600, fontSize: 16 }}>{selected.name}</div>
                                {selected.status && <Badge tone="green">{selected.status}</Badge>}
                            </div>
                            <div className="text-tertiary" style={{ fontSize: 13 }}>{selected.desc}</div>
                        </div>
                    </div>
                    <button className="btn btn-secondary btn-sm"><FiEdit2 size={13} style={{ marginRight: 6 }} />Edit Role</button>
                </div>

                {selected.companies && (
                    <>
                        <div className="flex items-center gap-2 mb-2" style={{ fontWeight: 600, fontSize: 14 }}>
                            <FiMapPin size={14} color="var(--text-tertiary)" /> Access Scope
                        </div>
                        <div className="kv-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
                            <div><div className="kv-label">Companies</div><div className="kv-value">{selected.companies}</div></div>
                            <div><div className="kv-label">Financial data</div><div className="kv-value">{selected.financial}</div></div>
                            <div><div className="kv-label">Configuration access</div><div className="kv-value">{selected.config}</div></div>
                        </div>
                    </>
                )}

                {selected.authority && (
                    <>
                        <div className="flex items-center gap-2 mb-2 mt-4" style={{ fontWeight: 600, fontSize: 14 }}>
                            <FiUsers size={14} color="var(--text-tertiary)" /> Approval Authority
                        </div>
                        <div className="flex flex-col gap-2">
                            {selected.authority.map((a, i) => (
                                <div key={i} className="flex items-center justify-between" style={{ fontSize: 13.5, padding: '6px 0' }}>
                                    <div className="flex items-center gap-2">
                                        {a.ok ? <FiCheckCircle size={14} color="var(--green-text)" /> : <FiX size={12} color="var(--red-text)" />}
                                        <span>{a.label}</span>
                                    </div>
                                    <span className="text-tertiary">{a.note}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {selected.permissions && (
                    <>
                        <div className="flex items-center gap-2 mb-2 mt-4" style={{ fontWeight: 600, fontSize: 14 }}>
                            <FiFileText size={14} color="var(--text-tertiary)" /> Permissions
                        </div>
                        <div className="flex flex-col">
                            {selected.permissions.map((p, i) => {
                                const I = PERM_ICONS[p.key] || FiFileText;
                                return (
                                    <div key={i} className="flex items-center gap-3" style={{ fontSize: 13.5, padding: '8px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                                        <I size={14} color="var(--text-tertiary)" />
                                        <div style={{ width: 140, fontWeight: 500 }}>{p.key}</div>
                                        <div className="text-tertiary">{p.val}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function TemplatesTab() {
    const [sub, setSub] = useState('quote');
    const list = TEMPLATES[sub];

    return (
        <>
            <div className="tabs" style={{ margin: '4px 0 16px' }}>
                <div className={`tab${sub === 'quote' ? ' active' : ''}`} onClick={() => setSub('quote')}>Quote Templates</div>
                <div className={`tab${sub === 'invoice' ? ' active' : ''}`} onClick={() => setSub('invoice')}>Invoice Templates</div>
            </div>
            <div className="dlist">
                {list.map((t) => (
                    <div key={t.id} className="entity-row flat" style={{ padding: '16px 18px' }}>
                        <div className="avatar" style={{ background: 'var(--violet-bg)', color: 'var(--violet-text)' }}>
                            <FiFileText size={16} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="flex items-center gap-2">
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                                {t.tag && <Badge tone={t.tagColor || 'gray'}>{t.tag}</Badge>}
                            </div>
                            <div className="text-tertiary" style={{ fontSize: 13, marginTop: 2 }}>{t.sub}</div>
                        </div>
                        <div style={{ width: 220, fontSize: 13 }}>
                            <div>{t.usage}</div>
                            <div className="text-meta" style={{ fontSize: 12 }}>{t.note}</div>
                        </div>
                        <a style={{ color: 'var(--primary)', fontWeight: 500, fontSize: 13.5, cursor: 'pointer' }}>Edit →</a>
                        <button className="topbar-icon" style={{ width: 28, height: 28 }}><FiMoreHorizontal size={14} /></button>
                    </div>
                ))}
                <div className="entity-row flat" style={{ padding: '14px 18px', color: 'var(--text-tertiary)' }}>
                    <div className="avatar" style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}>
                        <FiPlus size={16} />
                    </div>
                    <div>Create a new {sub} template</div>
                </div>
            </div>
        </>
    );
}

const AVATAR_TONES = ['violet', 'green', 'amber', 'gray'];
const avatarTone = (initial) => AVATAR_TONES[(initial || 'A').charCodeAt(0) % AVATAR_TONES.length];

function ProductRow({ p }) {
    const tone = avatarTone(p.initial);
    return (
        <div className="entity-row flat">
            <div className="avatar" style={{ background: `var(--${tone}-bg)`, color: `var(--${tone}-text)` }}>{p.initial}</div>
            <div className="row-body">
                <div className="flex items-center gap-2">
                    <div className="row-title">{p.name}</div>
                    {p.tag && <Badge tone={p.tagColor || 'gray'}>{p.tag}</Badge>}
                </div>
                <div className="row-sub">{p.desc}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
                <div className="row-amount">{money(p.price)}</div>
                <div className="text-tertiary" style={{ fontSize: 11.5 }}>{p.unit}</div>
            </div>
        </div>
    );
}

function CatalogTab() {
    return (
        <>
            <div className="section-header violet" style={{ marginTop: 4 }}>
                <span className="dot" />
                <span className="section-title">Equipment</span>
                <span className="section-count">{CATALOG.equipment.length}</span>
            </div>
            <div className="dlist">
                {CATALOG.equipment.map((p, i) => <ProductRow key={i} p={p} />)}
            </div>

            <div className="section-header green" style={{ marginTop: 20 }}>
                <span className="dot" />
                <span className="section-title">Services</span>
                <span className="section-count">{CATALOG.services.length}</span>
            </div>
            <div className="dlist">
                {CATALOG.services.map((p, i) => <ProductRow key={i} p={p} />)}
            </div>
        </>
    );
}

export default function FinanceSettings() {
    const [activeTab, setActiveTab] = useState('business');
    const [gateway, setGateway] = useState(null);
    const [gatewayLoading, setGatewayLoading] = useState(false);
    const [gatewayError, setGatewayError] = useState('');
    const [testLoading, setTestLoading] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [merchant, setMerchant] = useState(null);
    const [merchantLoading, setMerchantLoading] = useState(false);

    useEffect(() => {
        setGatewayLoading(true);
        fetch(`${BASE}/v1/finance/gateway`, { headers: authH(), credentials: 'include' })
            .then(r => r.json())
            .then(j => { if (j.status) setGateway(j.data); else setGatewayError(j.error || 'Failed'); })
            .catch(e => setGatewayError(e.message))
            .finally(() => setGatewayLoading(false));

        setMerchantLoading(true);
        fetch(`${BASE}/v1/finance/merchant`, { headers: authH(), credentials: 'include' })
            .then(r => r.json())
            .then(j => { if (j.status) setMerchant(j.data); })
            .catch(() => {})
            .finally(() => setMerchantLoading(false));
    }, []);

    async function testConnection() {
        setTestLoading(true);
        setTestResult(null);
        try {
            const r = await fetch(`${BASE}/v1/finance/gateway`, { headers: authH(), credentials: 'include' });
            const j = await r.json();
            setTestResult(j.status && j.data?.connected ? 'connected' : 'error');
            if (j.status) setGateway(j.data);
        } catch {
            setTestResult('error');
        } finally {
            setTestLoading(false);
        }
    }

    const meta = TAB_META[activeTab];

    return (
        <>
            <main className="page-main">
                {activeTab === 'business' ? (
                    <>
                        <div className="hero">
                            <div className="hero-icon"><SparkleIcon size={22} /></div>
                            <h1 className="hero-title">Business Configuration</h1>
                            <p className="hero-sub">Manage your business setup and system configuration</p>
                        </div>

                        <div className="aibar">
                            <form>
                                <div className="cmd-input">
                                    <SparkleIcon size={16} />
                                    <input placeholder="Ask anything about your business setup..." defaultValue="" />
                                    <button type="button" className="cmd-input-mic">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                            <line x1="12" y1="19" x2="12" y2="23" />
                                            <line x1="8" y1="23" x2="16" y2="23" />
                                        </svg>
                                    </button>
                                    <button type="submit" className="cmd-input-btn">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="19" x2="12" y2="5" />
                                            <polyline points="5 12 12 5 19 12" />
                                        </svg>
                                    </button>
                                </div>
                            </form>

                            <div className="chips">
                                <div className="chip">
                                    <span className="chip-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="4" y="3" width="16" height="18" rx="1" />
                                            <path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01" />
                                        </svg>
                                    </span>
                                    <div className="chip-body">
                                        <div className="chip-title">Set up a new company</div>
                                        <div className="chip-cat">Companies</div>
                                    </div>
                                </div>
                                <div className="chip">
                                    <span className="chip-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="1" x2="12" y2="23" />
                                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                        </svg>
                                    </span>
                                    <div className="chip-body">
                                        <div className="chip-title">Add a currency</div>
                                        <div className="chip-cat">Finance</div>
                                    </div>
                                </div>
                                <div className="chip">
                                    <span className="chip-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="3" />
                                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                        </svg>
                                    </span>
                                    <div className="chip-body">
                                        <div className="chip-title">Configure approval rules</div>
                                        <div className="chip-cat">Governance</div>
                                    </div>
                                </div>
                                <div className="chip">
                                    <span className="chip-icon">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="8" x2="12" y2="12" />
                                            <line x1="12" y1="16" x2="12.01" y2="16" />
                                        </svg>
                                    </span>
                                    <div className="chip-body">
                                        <div className="chip-title">Review missing setup</div>
                                        <div className="chip-cat">Status</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="hero">
                            <div className="hero-icon"><SparkleIcon size={22} /></div>
                            <h1 className="hero-title">{meta.title}</h1>
                            <p className="hero-sub">{meta.sub}</p>
                        </div>

                        <div className="aibar">
                            <form onSubmit={(e) => e.preventDefault()}>
                                <div className="cmd-input">
                                    <SparkleIcon size={16} />
                                    <input placeholder={meta.placeholder} defaultValue="" />
                                    <button type="button" className="cmd-input-mic">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                            <line x1="12" y1="19" x2="12" y2="23" />
                                            <line x1="8" y1="23" x2="16" y2="23" />
                                        </svg>
                                    </button>
                                    <button type="submit" className="cmd-input-btn">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="12" y1="19" x2="12" y2="5" />
                                            <polyline points="5 12 12 5 19 12" />
                                        </svg>
                                    </button>
                                </div>
                            </form>

                            <div className="chips">
                                {meta.chips.map((chip) => {
                                    const I = CHIP_ICONS[chip.icon] || SparkleIcon;
                                    return (
                                        <div className="chip" key={chip.title}>
                                            <span className="chip-icon"><I size={16} /></span>
                                            <div className="chip-body">
                                                <div className="chip-title">{chip.title}</div>
                                                <div className="chip-cat">{chip.cat}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                <SettingsTabs active={activeTab} onChange={setActiveTab} />

                {activeTab !== 'business' && TAB_BANNER[activeTab] && (
                    <div className="ai-update-banner"><span className="dot" /><div>{TAB_BANNER[activeTab]}</div></div>
                )}

                {activeTab === 'approvals' && <ApprovalRulesTab />}
                {activeTab === 'pricing' && <PricingRulesTab />}
                {activeTab === 'roles' && <RolesTab />}
                {activeTab === 'templates' && <TemplatesTab />}
                {activeTab === 'catalog' && <CatalogTab />}

                {activeTab === 'business' && (
                    <>
                        <div className="section-header amber">
                            <span className="dot"></span>
                            <span className="section-title">Core Setup</span>
                            <span className="section-meta">Review recommended</span>
                        </div>

                        <div className="entity-row" style={{ cursor: 'pointer' }}>
                            <div className="avatar" style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="4" y="3" width="16" height="18" rx="1" />
                                    <path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01" />
                                </svg>
                            </div>
                            <div className="row-body">
                                <div className="flex items-center gap-2">
                                    <div className="row-title">Business Identity</div>
                                    <span className="badge green">Complete</span>
                                </div>
                                <div className="row-sub">Legal entity and organization details</div>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                            </svg>
                        </div>

                        <div className="entity-row" style={{ cursor: 'pointer' }}>
                            <div className="avatar" style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="4" y="3" width="16" height="18" rx="1" />
                                    <path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01" />
                                </svg>
                            </div>
                            <div className="row-body">
                                <div className="flex items-center gap-2">
                                    <div className="row-title">Companies &amp; Entities</div>
                                    <span className="badge green">2 companies configured</span>
                                </div>
                                <div className="row-sub">Manage companies and entity-level settings</div>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                            </svg>
                        </div>

                        <div className="entity-row" style={{ cursor: 'pointer' }}>
                            <div className="avatar" style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="1" x2="12" y2="23" />
                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                </svg>
                            </div>
                            <div className="row-body">
                                <div className="flex items-center gap-2">
                                    <div className="row-title">Currency &amp; Finance</div>
                                    <span className="badge amber">Exchange rates not configured</span>
                                </div>
                                <div className="row-sub">Base currency set, exchange rates missing</div>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                            </svg>
                        </div>

                        <div className="section-header red">
                            <span className="dot"></span>
                            <span className="section-title">Financial Setup</span>
                            <span className="section-meta">Needs attention</span>
                        </div>

                        <div className="entity-row" style={{ cursor: 'pointer' }}>
                            <div className="avatar" style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                            </div>
                            <div className="row-body">
                                <div className="flex items-center gap-2">
                                    <div className="row-title">Tax Configuration</div>
                                    <span className="badge red">Incomplete</span>
                                </div>
                                <div className="row-sub">Payments, tax, and pricing configuration</div>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                            </svg>
                        </div>

                        <div className="section-header amber">
                            <span className="dot"></span>
                            <span className="section-title">Governance</span>
                            <span className="section-meta">Review recommended</span>
                        </div>

                        <div className="entity-row" style={{ cursor: 'pointer' }}>
                            <div className="avatar" style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                </svg>
                            </div>
                            <div className="row-body">
                                <div className="flex items-center gap-2">
                                    <div className="row-title">Approvals &amp; Access</div>
                                    <span className="badge amber">Approval rules need attention</span>
                                </div>
                                <div className="row-sub">Approvals, roles and access management</div>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                            </svg>
                        </div>

                        <div className="section-header violet">
                            <span className="dot"></span>
                            <span className="section-title">System</span>
                        </div>

                        <div className="entity-row" style={{ cursor: 'pointer' }}>
                            <div className="avatar" style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                </svg>
                            </div>
                            <div className="row-body">
                                <div className="flex items-center gap-2">
                                    <div className="row-title">Automation &amp; Integrations</div>
                                    <span className="badge gray">Automation partially configured</span>
                                </div>
                                <div className="row-sub">Automation, integrations and system behavior</div>
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                            </svg>
                        </div>

                        <div className="status-banner blue">
                            <span className="dot"></span>
                            <div>Complete financial setup before processing invoices</div>
                        </div>

                        <div className="section-header violet" style={{ marginTop: 28 }}>
                            <span className="dot"></span>
                            <span className="section-title">Payment Gateway</span>
                        </div>

                        <div className="card" style={{ padding: '18px 20px' }}>
                            <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
                                <div className="avatar" style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                                        <line x1="1" y1="10" x2="23" y2="10" />
                                    </svg>
                                </div>
                                <div style={{ flex: '1 1 0%' }}>
                                    <div className="flex items-center gap-2">
                                        <div style={{ fontWeight: 600 }}>CardPointe by Fiserv</div>
                                        {gatewayLoading && <span className="text-tertiary" style={{ fontSize: 12 }}>Loading…</span>}
                                        {gateway && (
                                            <span className={`badge ${gateway.connected ? 'green' : 'red'}`}>
                                                {gateway.connected ? 'Connected' : 'Not connected'}
                                            </span>
                                        )}
                                        {gateway && (
                                            <span className="badge gray" style={{ textTransform: 'capitalize' }}>{gateway.environment}</span>
                                        )}
                                    </div>
                                    <div className="text-tertiary" style={{ fontSize: 13 }}>
                                        {gateway ? `Merchant ID: ${gateway.merchantId || '—'}` : 'Fiserv CardPointe payment gateway'}
                                    </div>
                                </div>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={testConnection}
                                    disabled={testLoading}
                                >
                                    {testLoading ? 'Testing…' : 'Test Connection'}
                                </button>
                            </div>

                            {testResult && (
                                <div style={{
                                    fontSize: 13, borderRadius: 8, padding: '8px 12px', marginBottom: 10,
                                    background: testResult === 'connected' ? 'var(--green-bg)' : 'var(--red-bg)',
                                    color: testResult === 'connected' ? 'var(--green-text)' : 'var(--red-text)',
                                }}>
                                    {testResult === 'connected' ? '✓ Connection successful — gateway is reachable.' : '✗ Connection failed — check credentials in .env.'}
                                </div>
                            )}

                            {gateway && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 16px', fontSize: 13 }}>
                                    <div>
                                        <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>Provider</div>
                                        <div style={{ fontWeight: 500 }}>Fiserv / CardConnect</div>
                                    </div>
                                    <div>
                                        <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>Merchant ID</div>
                                        <div style={{ fontWeight: 500 }}>{gateway.merchantId || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>Environment</div>
                                        <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{gateway.environment}</div>
                                    </div>
                                    <div>
                                        <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>API Endpoint</div>
                                        <div style={{ fontWeight: 500, fontSize: 12 }}>{gateway.baseUrl}</div>
                                    </div>
                                    <div>
                                        <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>Credentials</div>
                                        <div style={{ fontWeight: 500, color: gateway.configured ? 'var(--green-text)' : 'var(--red-text)' }}>
                                            {gateway.configured ? 'Configured' : 'Missing — add to .env'}
                                        </div>
                                    </div>
                                    {gateway.connected && (
                                        <div>
                                            <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>Status</div>
                                            <div style={{ fontWeight: 500, color: 'var(--green-text)' }}>Active</div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {gatewayError && (
                                <div style={{ color: 'var(--red-text)', fontSize: 12.5 }}>{gatewayError}</div>
                            )}
                        </div>

                        <div className="section-header violet" style={{ marginTop: 28 }}>
                            <span className="dot"></span>
                            <span className="section-title">Merchant Configuration</span>
                            <span className="section-meta" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-tertiary)' }}>
                                Live · CardPointe /inquireMerchant
                            </span>
                        </div>

                        <div className="card" style={{ padding: '18px 20px' }}>
                            {merchantLoading && <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Loading merchant config…</div>}
                            {!merchantLoading && !merchant && (
                                <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Could not load merchant config — check gateway credentials.</div>
                            )}
                            {merchant && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 16px', fontSize: 13 }}>
                                    <div>
                                        <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>Merchant ID</div>
                                        <div style={{ fontWeight: 500 }}>{merchant.merchid || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>Site</div>
                                        <div style={{ fontWeight: 500 }}>{merchant.site || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>Card Processor</div>
                                        <div style={{ fontWeight: 500 }}>{merchant.cardproc || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>AVS Check</div>
                                        <div style={{ fontWeight: 500, color: merchant.avs === 'Y' ? 'var(--green-text)' : 'var(--text-secondary)' }}>
                                            {merchant.avs === 'Y' ? 'Enabled' : 'Disabled'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>CVV Required</div>
                                        <div style={{ fontWeight: 500, color: merchant.cvv === 'Y' ? 'var(--green-text)' : 'var(--text-secondary)' }}>
                                            {merchant.cvv === 'Y' ? 'Yes' : 'No'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>eCheck / ACH</div>
                                        <div style={{ fontWeight: 500 }}>{merchant.echeck === 'Y' ? 'Enabled' : 'Disabled'}</div>
                                    </div>
                                    <div>
                                        <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>Account Updater</div>
                                        <div style={{ fontWeight: 500 }}>{merchant.acctupdater === 'Y' ? 'Enrolled' : 'Not enrolled'}</div>
                                    </div>
                                    <div>
                                        <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>Fee Type</div>
                                        <div style={{ fontWeight: 500 }}>{merchant.fee_type || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="text-tertiary" style={{ fontSize: 11.5, marginBottom: 2 }}>Fee Rate</div>
                                        <div style={{ fontWeight: 500 }}>
                                            {merchant.fee_value ? `${merchant.fee_value}${merchant.fee_format === 'percent' ? '%' : ''}` : '—'}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            <aside className="ai-panel">
                {activeTab === 'business' ? (
                    <>
                        <div className="ai-panel-header">
                            <div className="ai-panel-title">
                                <SparkleIcon size={16} />
                                <span>Setup Intelligence</span>
                            </div>
                            <span className="ai-live">Live</span>
                        </div>

                        <div className="ai-alert red">
                            <div className="ai-alert-icon">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                            </div>
                            <div className="ai-alert-body">
                                <div className="ai-alert-title">Most Important</div>
                                <div className="ai-alert-text">Tax configuration incomplete — invoices may be incorrect</div>
                            </div>
                        </div>

                        <div className="ai-section-label">Missing Setup</div>
                        <div className="ai-list">
                            <div className="ai-list-item red">
                                <div className="dot"></div>
                                <div>
                                    <div className="ai-list-item-title">Tax rules not defined for CAD</div>
                                </div>
                            </div>
                            <div className="ai-list-item amber">
                                <div className="dot"></div>
                                <div>
                                    <div className="ai-list-item-title">Approval threshold missing above $25k</div>
                                </div>
                            </div>
                            <div className="ai-list-item red">
                                <div className="dot"></div>
                                <div>
                                    <div className="ai-list-item-title">Exchange rates not configured</div>
                                </div>
                            </div>
                        </div>

                        <div className="ai-section-label">Recommendations</div>
                        <div className="ai-list">
                            <div className="ai-list-item violet">
                                <div className="dot"></div>
                                <div>
                                    <div className="ai-list-item-title">Define approval rules for high-value quotes</div>
                                </div>
                            </div>
                            <div className="ai-list-item violet">
                                <div className="dot"></div>
                                <div>
                                    <div className="ai-list-item-title">Complete tax setup before issuing invoices</div>
                                </div>
                            </div>
                        </div>

                        <div className="ai-section-label">Setup Status</div>
                        <div className="ai-snapshot">
                            <div className="ai-snapshot-label">Setup Status</div>
                            <div className="ai-snapshot-row">
                                <span className="label">Complete</span>
                                <span className="val" style={{ color: 'var(--green-text)' }}>3</span>
                            </div>
                            <div className="ai-snapshot-row">
                                <span className="label">Needs attention</span>
                                <span className="val" style={{ color: 'var(--amber-text)' }}>2</span>
                            </div>
                            <div className="ai-snapshot-row">
                                <span className="label">Partial</span>
                                <span className="val" style={{ color: 'var(--text-tertiary)' }}>1</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <AiInsightsPanel ai={TAB_AI[activeTab]} />
                )}
            </aside>
        </>
    )
}
