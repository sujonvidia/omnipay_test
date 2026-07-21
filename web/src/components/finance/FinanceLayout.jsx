import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { LuHistory, LuMenu, LuChevronRight, LuSearch } from 'react-icons/lu'
import { FiBell, FiHelpCircle } from 'react-icons/fi'
import CardProfileModal from './CardProfileModal'
import SettingsMenu from './SettingsMenu'
import FinanceSidebar from './FinanceSidebar'
import ActivityFeedPanel from './ActivityFeedPanel'
import HelpMenu from './HelpMenu'
import { useRecentEvents } from '../../hooks/useRecentEvents'
import './finance.css'


const SIDEBAR_EXPANDED_KEY = 'wf_finance_sidebar_expanded_v1'
const NOTIFICATIONS_SEEN_KEY = 'wf_finance_notifications_seen_at'

export default function FinanceLayout() {
    const user = useSelector(s => s.message.user)
    const [showProfileModal, setShowProfileModal] = useState(false)
    const [showSettingsMenu, setShowSettingsMenu] = useState(false)
    const [showNotifications, setShowNotifications] = useState(false)
    const [showRecent, setShowRecent] = useState(false)
    const [showHelp, setShowHelp] = useState(false)
    const [mobileNavOpen, setMobileNavOpen] = useState(false)
    const { events: latestEvents } = useRecentEvents(1)
    const [seenAt, setSeenAt] = useState(() => {
        try { return localStorage.getItem(NOTIFICATIONS_SEEN_KEY) || '' } catch (_) { return '' }
    })
    const hasUnread = latestEvents[0] && new Date(latestEvents[0].at) > new Date(seenAt || 0)

    const openNotifications = () => {
        setShowRecent(false); setShowHelp(false); setShowSettingsMenu(false)
        setShowNotifications((v) => !v)
        const now = latestEvents[0]?.at || new Date().toISOString()
        try { localStorage.setItem(NOTIFICATIONS_SEEN_KEY, now) } catch (_) { /* private mode */ }
        setSeenAt(now)
    }
    const openRecent = () => {
        setShowNotifications(false); setShowHelp(false); setShowSettingsMenu(false)
        setShowRecent((v) => !v)
    }
    const openHelp = () => {
        setShowNotifications(false); setShowRecent(false); setShowSettingsMenu(false)
        setShowHelp((v) => !v)
    }
    const [sidebarExpanded, setSidebarExpanded] = useState(() => {
        try { return localStorage.getItem(SIDEBAR_EXPANDED_KEY) !== '0' } catch (_) { return true }
    })

    const toggleSidebar = () => {
        setSidebarExpanded((prev) => {
            const next = !prev
            try { localStorage.setItem(SIDEBAR_EXPANDED_KEY, next ? '1' : '0') } catch (_) { /* private mode */ }
            return next
        })
    }

    const initials = user
        ? `${(user.firstname || '').charAt(0)}${(user.lastname || '').charAt(0)}`.toUpperCase() || 'U'
        : 'U'

    return (
        <div className={`app w-full${sidebarExpanded ? ' sidebar-expanded' : ''}`}>
        <FinanceSidebar
            expanded={sidebarExpanded}
            onToggle={toggleSidebar}
            mobileOpen={mobileNavOpen}
            onMobileClose={() => setMobileNavOpen(false)}
        />
        <div className='main w-full'>
            <header className='topbar flex items-center gap-3 px-4 h-[56px]'>
                <button
                    type='button'
                    title='Open menu'
                    aria-label='Open menu'
                    onClick={() => setMobileNavOpen(true)}
                    className='sidebar-mobile-toggle topbar-icon -ml-1'
                >
                    <LuMenu size={18} />
                </button>
                <button type='button' className='company-switch' title='Switch company'>
                    <span className='company-dot' style={{ background: 'var(--primary)' }}>N</span>
                    <span style={{ fontWeight: 600 }}>Northstar Industrial</span>
                    <span style={{ color: 'var(--text-tertiary)', display: 'flex' }}>
                        <LuChevronRight size={14} />
                    </span>
                </button>
                <div className='gs-wrap'>
                    <div className='gs-box'>
                        <LuSearch size={14} />
                        <input placeholder='Search customers, invoices, quotes, settings…' />
                    </div>
                </div>
                <div className='topbar-spacer flex-1' />
                <div className='relative'>
                    <button
                        type='button'
                        title='Notifications'
                        onClick={openNotifications}
                        className='topbar-icon relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-black/5'
                    >
                        <FiBell size={18} />
                        {hasUnread && <span className='dot absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500' />}
                    </button>
                    {showNotifications && (
                        <ActivityFeedPanel
                            title='Notifications'
                            limit={8}
                            emptyText='Nothing yet — activity will show up here.'
                            onClose={() => setShowNotifications(false)}
                        />
                    )}
                </div>
                <div className='relative'>
                    <button
                        type='button'
                        title='Recent'
                        onClick={openRecent}
                        className='topbar-icon flex items-center justify-center w-9 h-9 rounded-full hover:bg-black/5'
                    >
                        <LuHistory size={18} />
                    </button>
                    {showRecent && (
                        <ActivityFeedPanel
                            title='Recent activity'
                            limit={15}
                            emptyText='No recent actions yet.'
                            onClose={() => setShowRecent(false)}
                        />
                    )}
                </div>
                <div className='relative'>
                    <button
                        type='button'
                        title='Help'
                        onClick={openHelp}
                        className='topbar-icon flex items-center justify-center w-9 h-9 rounded-full hover:bg-black/5'
                    >
                        <FiHelpCircle size={18} />
                    </button>
                    {showHelp && <HelpMenu onClose={() => setShowHelp(false)} />}
                </div>
                <div className='relative'>
                    <button
                        type='button'
                        title='Settings'
                        onClick={() => {
                            setShowNotifications(false); setShowRecent(false); setShowHelp(false)
                            setShowSettingsMenu((v) => !v)
                        }}
                        className='avatar-chip flex items-center justify-center w-9 h-9 rounded-full bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-85 transition cursor-pointer'
                    >
                        {initials}
                    </button>
                    {showSettingsMenu && (
                        <SettingsMenu
                            user={user}
                            onClose={() => setShowSettingsMenu(false)}
                            onOpenPaymentProfile={() => setShowProfileModal(true)}
                        />
                    )}
                </div>
            </header>
            <div className='page w-full'>
                <Outlet />
            </div>

            {showProfileModal && <CardProfileModal onClose={() => setShowProfileModal(false)} />}
        </div>
        </div>
    )
}
