import React from 'react';
import { Link } from 'react-router-dom';
import { IconSiren } from '@/components/icons/Icons';
import FlaggedClosuresPanel from '@/features/admin/components/FlaggedClosuresPanel';

const COLOR_STYLES = {
    danger: {
        bar: 'from-danger-500 to-orange-400',
        badge: 'bg-danger-500/15 text-danger-300',
        text: 'group-hover:text-danger-400',
        cta: 'text-danger-400',
    },
    primary: {
        bar: 'from-primary-500 to-blue-400',
        badge: 'bg-primary-500/15 text-primary-300',
        text: 'group-hover:text-primary-300',
        cta: 'text-primary-300',
    },
    purple: {
        bar: 'from-purple-500 to-fuchsia-400',
        badge: 'bg-purple-500/15 text-purple-300',
        text: 'group-hover:text-purple-300',
        cta: 'text-purple-300',
    },
    rose: {
        bar: 'from-rose-500 to-danger-400',
        badge: 'bg-rose-500/15 text-rose-300',
        text: 'group-hover:text-rose-300',
        cta: 'text-rose-300',
    },
};

/**
 * One card per section of the portal. Reviewing requests and registering a camp
 * are not here: they are tabs inside Camps now (see AdminCampsLayout), so a card
 * for each would point at a tab rather than a section.
 */
const ACTION_CARDS = [
    {
        to: '/admin/command',
        icon: IconSiren,
        color: 'danger',
        title: 'Command Dashboard',
        desc: 'AI situation map, priority queue, resource allocation',
        cta: 'Open Dashboard',
    },
    {
        to: '/admin/inventory',
        icon: null,
        emoji: '📦',
        color: 'primary',
        title: 'Inventory',
        desc: 'Cross-camp stock levels and low-stock alerts',
        cta: 'View Inventory',
    },
    {
        to: '/admin/manage-camps',
        icon: null,
        emoji: '🔧',
        color: 'purple',
        title: 'Camps',
        desc: 'Review requests, register camps, and maintain existing ones',
        cta: 'Open Camps',
    },
    {
        to: '/admin/records',
        icon: null,
        emoji: '📊',
        color: 'rose',
        title: 'All Records',
        desc: 'View and delete any system records',
        cta: 'Manage Records',
    },
];

// Auth and the portal chrome (nav links, account, logout) live in AdminLayout.
function AdminDashboard() {
    return (
        // Pinned to the viewport minus the 3rem admin nav bar, scrolling inside
        // itself - the cards stay put and only the flagged-closure list moves.
        <div className="page-shell flex h-[calc(100dvh-3rem)] flex-col overflow-hidden font-sans">
            {/* Slow-moving colour blobs for depth */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none mix-blend-screen">
                <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] bg-slate-500/10 rounded-full blur-3xl"></div>
                <div className="absolute top-1/3 -right-24 w-[28rem] h-[28rem] bg-danger-500/10 rounded-full blur-3xl"></div>
            </div>

            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            {/* Main Content */}
            <main className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 flex-col gap-3 overflow-y-auto px-4 py-3 sm:px-6 lg:px-8">
                {/* Action Cards */}
                <div className="grid flex-none grid-cols-2 gap-3 lg:grid-cols-4">
                    {ACTION_CARDS.map(({ to, icon: Icon, emoji, color, title, desc, cta }) => {
                        const styles = COLOR_STYLES[color];
                        return (
                            <Link key={to} to={to} className="block group">
                                <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-md transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.08]">
                                    <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${styles.bar}`}></div>
                                    <div className="mb-2 flex items-center gap-2.5">
                                        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${styles.badge}`}>
                                            {Icon ? <Icon className="h-5 w-5" /> : <span className="text-xl leading-none">{emoji}</span>}
                                        </div>
                                        <h3 className={`text-sm font-bold leading-tight text-slate-900 dark:text-white ${styles.text}`}>{title}</h3>
                                    </div>
                                    <p className="mb-2 flex-1 text-xs text-slate-300">
                                        {desc}
                                    </p>
                                    <span className="text-xs font-medium text-primary-300 group-hover:underline">
                                        {cta} →
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                <FlaggedClosuresPanel />
            </main>
        </div>
    );
}

export default AdminDashboard;
