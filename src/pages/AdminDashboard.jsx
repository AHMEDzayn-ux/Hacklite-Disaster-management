import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { IconShieldLock, IconSiren, IconTent } from '../components/icons/Icons';

const ACTION_CARDS = [
    {
        to: '/admin/command',
        icon: IconSiren,
        title: 'Command Dashboard',
        desc: 'AI situation map, priority queue, resource allocation',
        cta: 'Open Dashboard',
    },
    {
        to: '/admin/inventory',
        icon: null,
        emoji: '📦',
        title: 'Inventory',
        desc: 'Cross-camp stock levels and low-stock alerts',
        cta: 'View Inventory',
    },
    {
        to: '/admin/review-requests',
        icon: null,
        emoji: '📋',
        title: 'Review Requests',
        desc: 'Approve or reject public camp requests',
        cta: 'View Pending',
    },
    {
        to: '/admin/register-camp',
        icon: IconTent,
        title: 'Register Camp',
        desc: 'Directly register a new relief camp',
        cta: 'Add New',
    },
    {
        to: '/admin/manage-camps',
        icon: null,
        emoji: '🔧',
        title: 'Manage Camps',
        desc: 'View and edit existing relief camps',
        cta: 'Open Manager',
    },
    {
        to: '/admin/records',
        icon: null,
        emoji: '📊',
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
            <div className="page-shell flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="page-shell">
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
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-300">
                            <IconShieldLock className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">Admin Dashboard</h2>
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
                    {ACTION_CARDS.map(({ to, icon: Icon, emoji, title, desc, cta }, i) => (
                        <Link key={to} to={to} className="block group animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                            <div className="relative h-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.05] p-5 transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.08]">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-300">
                                        {Icon ? <Icon className="h-6 w-6" /> : <span className="text-2xl leading-none">{emoji}</span>}
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white transition-colors group-hover:text-primary-300">{title}</h3>
                                </div>
                                <p className="text-slate-300 text-sm mb-3">
                                    {desc}
                                </p>
                                <span className="font-medium text-sm text-primary-300 group-hover:underline">
                                    {cta} →
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    );
}

export default AdminDashboard;
