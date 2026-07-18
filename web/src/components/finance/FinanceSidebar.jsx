import React from 'react'
import { NavLink } from 'react-router-dom'
import { TbLayoutSidebarLeftCollapse, TbLayoutSidebarLeftExpand } from 'react-icons/tb'
import {
    LuLayoutDashboard,
    LuBriefcase,
    LuFileText,
    LuHandCoins,
    LuBadgeCheck,
    LuWallet,
    LuActivity,
    LuTrendingUp,
    LuSettings,
    LuZap,
} from 'react-icons/lu'

const FINANCE_MENU_ITEMS = [
    { path: 'home', title: 'Home', icon: LuLayoutDashboard },
    { path: 'accounts', title: 'Accounts', icon: LuBriefcase },
    { path: 'quotes', title: 'Quotes', icon: LuFileText },
    { path: 'receivables', title: 'Receivables', icon: LuHandCoins },
    { path: 'approvals', title: 'Approvals', icon: LuBadgeCheck },
    { path: 'collections', title: 'Collections', icon: LuWallet },
    { path: 'activity', title: 'Activity', icon: LuActivity },
    { path: 'financials', title: 'Financials', icon: LuTrendingUp },
    { path: 'settings', title: 'Settings', icon: LuSettings },
]

export default function FinanceSidebar({ expanded, onToggle }) {
    return (
        <nav className={`sidebar${expanded ? ' expanded' : ''}`}>
            <div className='sidebar-logo-row'>
                <div className='sidebar-logo'>
                    <LuZap size={18} />
                </div>
            </div>

            <div className='sidebar-nav'>
                {FINANCE_MENU_ITEMS.map(({ path, title, icon: Icon }) => (
                    <NavLink
                        key={path}
                        to={path}
                        title={expanded ? undefined : title}
                        className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
                    >
                        <span className='sidebar-item-icon'><Icon size={18} /></span>
                        <span className='sidebar-item-label'>{title}</span>
                    </NavLink>
                ))}
            </div>

            <div className='sidebar-spacer' />

            <button
                type='button'
                className={`sidebar-collapse${expanded ? '' : ' collapsed'}`}
                onClick={onToggle}
                title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            >
                <span className='sidebar-item-icon'>
                    {expanded ? <TbLayoutSidebarLeftCollapse size={18} /> : <TbLayoutSidebarLeftExpand size={18} />}
                </span>
                <span className='sidebar-item-label'>Collapse</span>
            </button>
        </nav>
    )
}
