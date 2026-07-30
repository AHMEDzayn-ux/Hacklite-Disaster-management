import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { useTheme } from '@/features/auth/ThemeContext';
import {
    IconShieldLock,
    IconGrid,
    IconSiren,
    IconPackage,
    IconTent,
    IconFileText,
    IconSun,
    IconMoon,
    IconLogOut,
} from '@/components/icons/Icons';

/**
 * Admin links, in the order an operator works through them.
 * `also` lists extra path prefixes that belong to a tab but don't sit under
 * its own URL, so a drill-down still highlights the tab it came from. Camps is
 * one entry rather than three: reviewing a request, registering the camp it
 * becomes and maintaining it afterwards are one job, and they share a section
 * with its own tabs (see AdminCampsLayout).
 */
const adminLinks = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: IconGrid },
    { path: '/admin/command', label: 'Command', icon: IconSiren },
    { path: '/admin/inventory', label: 'Inventory', icon: IconPackage },
    {
        path: '/admin/manage-camps',
        label: 'Camps',
        icon: IconTent,
        also: ['/admin/review-requests', '/admin/register-camp', '/admin/edit-camp'],
    },
    { path: '/admin/records', label: 'Records', icon: IconFileText },
];

function AdminNavbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const isActive = ({ path, also = [] }) =>
        [path, ...also].some(p => location.pathname === p || location.pathname.startsWith(p + '/'));

    const handleLogout = async () => {
        await signOut();
        navigate('/');
    };

    return (
        <nav className="sticky top-0 z-50 flex-none border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/95">
            <div className="w-full px-4 sm:px-6 lg:px-10">
                <div className="flex h-12 items-center">
                    {/* Brand */}
                    <Link
                        to="/admin/dashboard"
                        className="group flex flex-shrink-0 items-center gap-2.5 rounded-lg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white transition-transform duration-200 group-hover:scale-105 dark:bg-white/10 dark:text-slate-300">
                            <IconShieldLock className="h-4 w-4" />
                        </div>
                        <div className="hidden flex-col leading-tight sm:flex">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Sri Lanka</span>
                            <span className="text-base font-extrabold text-slate-900 dark:text-white">Admin Portal</span>
                        </div>
                        <span className="text-base font-extrabold text-slate-900 dark:text-white sm:hidden">Admin</span>
                    </Link>

                    {/* Nav links — icon-only on narrow screens, text from lg up */}
                    <div className="ml-auto flex items-center gap-0.5 overflow-x-auto">
                        {adminLinks.map((link) => {
                            const LinkIcon = link.icon;
                            const active = isActive(link);
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    title={link.label}
                                    aria-current={active ? 'page' : undefined}
                                    className={`group relative flex flex-shrink-0 items-center whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 ${active
                                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
                                        }`}
                                >
                                    <LinkIcon className="h-5 w-5 flex-shrink-0 lg:hidden" />
                                    <span className="hidden lg:inline">{link.label}</span>
                                </Link>
                            );
                        })}

                        {/* Utility cluster */}
                        <div className="ml-2 flex flex-shrink-0 items-center gap-1 border-l border-slate-200 pl-2 dark:border-white/10">
                            {user?.email && (
                                <span className="hidden max-w-[14rem] truncate text-xs text-slate-500 dark:text-slate-400 xl:inline">
                                    {user.email}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={toggleTheme}
                                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                                aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                                title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                            >
                                {theme === 'dark' ? <IconSun className="h-[18px] w-[18px]" /> : <IconMoon className="h-[18px] w-[18px]" />}
                            </button>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                                title="Log out"
                            >
                                <IconLogOut className="h-[18px] w-[18px]" />
                                <span className="hidden xl:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default AdminNavbar;
