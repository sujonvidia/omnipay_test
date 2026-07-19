import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { LuSparkles, LuHistory, LuMenu } from 'react-icons/lu'
import { FiBell, FiHelpCircle } from 'react-icons/fi'
import CardProfileModal from './CardProfileModal'
import SettingsMenu from './SettingsMenu'
import FinanceSidebar from './FinanceSidebar'
import './finance.css'


const SIDEBAR_EXPANDED_KEY = 'wf_finance_sidebar_expanded_v1'

export default function FinanceLayout() {
    const user = useSelector(s => s.message.user)
    const [showProfileModal, setShowProfileModal] = useState(false)
    const [showSettingsMenu, setShowSettingsMenu] = useState(false)
    const [mobileNavOpen, setMobileNavOpen] = useState(false)
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
                <div className='topbar-brand flex items-center gap-2 font-semibold'>
                    <LuSparkles size={16} className='text-[var(--primary)]' />
                    <span>Northstar Industrial</span>
                </div>
                <div className='topbar-spacer flex-1' />
                <button
                    type='button'
                    title='Notifications'
                    className='topbar-icon relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-black/5'
                >
                    <FiBell size={18} />
                    <span className='dot absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500' />
                </button>
                <button
                    type='button'
                    title='Recent'
                    className='topbar-icon flex items-center justify-center w-9 h-9 rounded-full hover:bg-black/5'
                >
                    <LuHistory size={18} />
                </button>
                <button
                    type='button'
                    title='Help'
                    className='topbar-icon flex items-center justify-center w-9 h-9 rounded-full hover:bg-black/5'
                >
                    <FiHelpCircle size={18} />
                </button>
                <div className='relative'>
                    <button
                        type='button'
                        title='Settings'
                        onClick={() => setShowSettingsMenu((v) => !v)}
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
