import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { IconShieldLock, IconSiren, IconTent } from '@/components/icons/Icons';

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
    amber: {
        bar: 'from-amber-500 to-orange-400',
        badge: 'bg-amber-500/15 text-amber-300',
        text: 'group-hover:text-amber-400',
        cta: 'text-amber-400',
    },
    success: {
        bar: 'from-success-500 to-primary-400',
        badge: 'bg-success-500/15 text-success-300',
        text: 'group-hover:text-success-400',
        cta: 'text-success-400',
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
    teal: {
        bar: 'from-teal-500 to-cyan-400',
        badge: 'bg-teal-500/15 text-teal-300',
        text: 'group-hover:text-teal-300',
        cta: 'text-teal-300',
    },
};

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
        to: '/admin/review-requests',
        icon: null,
        emoji: '📋',
        color: 'amber',
        title: 'Review Requests',
        desc: 'Approve or reject public camp requests',
        cta: 'View Pending',
    },
    {
        to: '/admin/register-camp',
        icon: IconTent,
        color: 'success',
        title: 'Register Camp',
        desc: 'Directly register a new relief camp',
        cta: 'Add New',
    },
    {
        to: '/admin/manage-camps',
        icon: null,
        emoji: '🔧',
        color: 'purple',
        title: 'Manage Camps',
        desc: 'View and edit existing relief camps',
        cta: 'Open Manager',
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
    {
        to: '/admin/call-reports',
        icon: null,
        emoji: '📞',
        color: 'teal',
        title: 'Call Reports',
        desc: 'Upload call recordings for AI transcription',
        cta: 'Upload Recording',
    },
];

function AdminDashboard() {
    const navigate = useNavigate();
    const { user, signOut, loading } = useAuth();

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            navigate('/admin/login');
        }
    }, [user, loading, navigate]);

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    if (loading) {
        return (
            <div className="page-shell flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="page-shell font-sans">
            {/* Slow-moving colour blobs for depth */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none mix-blend-screen">
                <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] bg-primary-500/10 rounded-full blur-3xl"></div>
                <div className="absolute top-1/3 -right-24 w-[28rem] h-[28rem] bg-danger-500/10 rounded-full blur-3xl"></div>
            </div>

            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            {/* Top nav */}
            <header className="relative z-10 border-b border-white/10 bg-white/[0.03] backdrop-blur-md">
                <div className="w-full px-4 sm:px-6 lg:px-8 py-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-4">
                            <Link to="/" className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm">
                                ← Home
                            </Link>
                            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
                                <IconShieldLock className="h-5 w-5 text-primary-400" />
                                Admin Portal
                            </h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-400">{user.email}</span>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-slate-200"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 mx-auto max-w-[1800px] px-4 py-4 sm:px-6 lg:px-8">
                {/* Header & Stats Row */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-lg shadow-primary-500/30">
                            <IconShieldLock className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">Admin Dashboard</h2>
                            <p className="text-slate-300 text-xs mt-0.5">Manage camps, records, and system data</p>
                        </div>
                    </div>

                    {/* Quick Stats - Inline */}
                    <div className="flex flex-wrap gap-3">
                        <div className="rounded-xl border border-white/10 bg-white/[0.05] backdrop-blur-md px-4 py-2 flex items-center gap-2">
                            <span className="text-amber-400 font-bold text-lg">-</span>
                            <span className="text-xs text-slate-400">Pending</span>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.05] backdrop-blur-md px-4 py-2 flex items-center gap-2">
                            <span className="text-success-400 font-bold text-lg">-</span>
                            <span className="text-xs text-slate-400">Active Camps</span>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.05] backdrop-blur-md px-4 py-2 flex items-center gap-2">
                            <span className="text-primary-300 font-bold text-lg">-</span>
                            <span className="text-xs text-slate-400">Capacity</span>
                        </div>
                    </div>
                </div>

                {/* Action Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {ACTION_CARDS.map(({ to, icon: Icon, emoji, color, title, desc, cta }, i) => {
                        const styles = COLOR_STYLES[color];
                        return (
                            <Link key={to} to={to} className="block group">
                                <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-md p-5 transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.08]">
                                    <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${styles.bar}`}></div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${styles.badge}`}>
                                            {Icon ? <Icon className="h-6 w-6" /> : <span className="text-2xl leading-none">{emoji}</span>}
                                        </div>
                                        <h3 className={`text-lg font-bold text-slate-900 dark:text-white ${styles.text}`}>{title}</h3>
                                    </div>
                                    <p className="text-slate-300 text-sm mb-3">
                                        {desc}
                                    </p>
                                    <span className="font-medium text-sm text-primary-300 group-hover:underline">
                                        {cta} →
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </main>
        </div>
    );
}

export default AdminDashboard;
