import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { IconShieldLock, IconSiren, IconTent } from '../components/icons/Icons';

const COLOR_STYLES = {
    danger: {
        bar: 'from-danger-600 to-danger-400',
        badge: 'bg-danger-500/15 text-danger-300',
        text: 'group-hover:text-danger-400',
        cta: 'text-danger-400',
    },
    primary: {
        bar: 'from-primary-600 to-primary-400',
        badge: 'bg-primary-500/15 text-primary-300',
        text: 'group-hover:text-primary-300',
        cta: 'text-primary-300',
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
        color: 'primary',
        title: 'Review Requests',
        desc: 'Approve or reject public camp requests',
        cta: 'View Pending',
    },
    {
        to: '/admin/register-camp',
        icon: IconTent,
        color: 'primary',
        title: 'Register Camp',
        desc: 'Directly register a new relief camp',
        cta: 'Add New',
    },
    {
        to: '/admin/manage-camps',
        icon: null,
        emoji: '🔧',
        color: 'primary',
        title: 'Manage Camps',
        desc: 'View and edit existing relief camps',
        cta: 'Open Manager',
    },
    {
        to: '/admin/records',
        icon: null,
        emoji: '📊',
        color: 'primary',
        title: 'All Records',
        desc: 'View and delete any system records',
        cta: 'Manage Records',
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
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
            {/* Static colour glow - CSS gradient only, no image/filter/animation */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage:
                        'radial-gradient(circle at 10% 5%, rgba(59,130,246,0.10), transparent 40%), radial-gradient(circle at 90% 35%, rgba(239,68,68,0.08), transparent 40%)',
                }}
            ></div>

            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            {/* Top nav */}
            <header className="relative z-10 border-b border-white/10 bg-white/[0.03]">
                <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-4">
                            <Link to="/" className="text-slate-400 hover:text-white transition-colors text-sm">
                                ← Home
                            </Link>
                            <h1 className="flex items-center gap-2 text-xl font-bold text-primary-400">
                                <IconShieldLock className="h-5 w-5 text-primary-400" />
                                Admin Portal
                            </h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-400">{user.email}</span>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-slate-200 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 mx-auto max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8">
                {/* Header & Stats Row */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary-500 text-white">
                            <IconShieldLock className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-3xl md:text-4xl font-black text-white">Admin Dashboard</h2>
                            <p className="text-slate-300 text-sm mt-1">Manage camps, records, and system data</p>
                        </div>
                    </div>

                    {/* Quick Stats - Inline */}
                    <div className="flex flex-wrap gap-3">
                        <div className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 flex items-center gap-2">
                            <span className="text-amber-400 font-bold text-lg">-</span>
                            <span className="text-xs text-slate-400">Pending</span>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 flex items-center gap-2">
                            <span className="text-success-400 font-bold text-lg">-</span>
                            <span className="text-xs text-slate-400">Active Camps</span>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 flex items-center gap-2">
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
                            <Link key={to} to={to} className="block group animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                                <div className="relative h-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.05] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.08]">
                                    <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${styles.bar}`}></div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${styles.badge}`}>
                                            {Icon ? <Icon className="h-6 w-6" /> : <span className="text-2xl leading-none">{emoji}</span>}
                                        </div>
                                        <h3 className={`text-lg font-bold text-white transition-colors ${styles.text}`}>{title}</h3>
                                    </div>
                                    <p className="text-slate-300 text-sm mb-3">
                                        {desc}
                                    </p>
                                    <span className={`font-medium text-sm group-hover:underline ${styles.cta}`}>
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
