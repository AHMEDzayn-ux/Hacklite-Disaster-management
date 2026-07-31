import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '@/features/auth/ThemeContext';
import {
    IconMegaphone,
    IconLifeBuoy,
    IconGrid,
    IconUserSearch,
    IconSiren,
    IconPawPrint,
    IconPhone,
    IconTent,
    IconUsers,
    IconHeart,
    IconSun,
    IconMoon,
} from '@/components/icons/Icons';

const reporterLinks = [
    { path: '/report', label: 'Dashboard', icon: IconGrid },
    { path: '/missing-persons', label: 'Missing Persons', icon: IconUserSearch },
    { path: '/disasters', label: 'Disasters', icon: IconSiren },
    { path: '/animal-rescue', label: 'Animal Rescue', icon: IconPawPrint },
    { path: '/emergency', label: 'Emergency Contacts', icon: IconPhone },
];

const responderLinks = [
    { path: '/respond', label: 'Dashboard', icon: IconGrid },
    { path: '/missing-persons-list', label: 'Missing Persons', icon: IconUserSearch },
    { path: '/disasters-list', label: 'Disasters', icon: IconSiren },
    { path: '/animal-rescue-list', label: 'Animal Rescue', icon: IconPawPrint },
    { path: '/camps', label: 'Camps', icon: IconTent },
    { path: '/volunteers', label: 'Volunteers', icon: IconUsers },
    { path: '/donations', label: 'Donations', icon: IconHeart },
];

function Navbar({ userType = 'reporter' }) {
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();

    const navLinks = userType === 'reporter' ? reporterLinks : responderLinks;
    const isReporter = userType === 'reporter';
    const Icon = isReporter ? IconMegaphone : IconLifeBuoy;

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="sticky top-0 z-50 border-b border-white/10 bg-white/95 backdrop-blur-sm dark:bg-slate-950/95">
            <div className="w-full px-4 sm:px-6 lg:px-10">
                <div className="flex h-12 items-center">
                    {/* Logo */}
                    <Link to="/" className="group flex flex-shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 rounded-lg">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white transition-transform duration-200 group-hover:scale-105 dark:bg-white/10 dark:text-slate-300">
                            <Icon className="h-4 w-4" />
                        </div>
                        <div className="hidden flex-col leading-tight sm:flex">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Sri Lanka</span>
                            <span className="text-base font-extrabold text-slate-900 dark:text-white">Disaster Management</span>
                        </div>
                        <span className="text-base font-extrabold text-slate-900 dark:text-white sm:hidden">DM SL</span>
                    </Link>

                    {/* Nav links — always inline in the top bar; icon-only on narrow screens, text-only from md up */}
                    <div className="ml-auto flex items-center gap-0.5 overflow-x-auto">
                        {navLinks.map((link) => {
                            const LinkIcon = link.icon;
                            const active = isActive(link.path);
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    title={link.label}
                                    className={`group relative flex flex-shrink-0 items-center whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 ${active
                                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
                                        }`}
                                >
                                    <LinkIcon className="h-5 w-5 flex-shrink-0 md:hidden" />
                                    <span className="hidden md:inline">{link.label}</span>
                                </Link>
                            );
                        })}

                        {/* Mode Switcher */}
                        <Link
                            to={isReporter ? '/respond' : '/report'}
                            title={isReporter ? 'Respond Mode' : 'Report Mode'}
                            className="group ml-1.5 flex flex-shrink-0 items-center gap-1.5 rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-xs font-bold text-white shadow-sm transition-colors duration-200 hover:bg-primary-600 hover:border-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 dark:border-white dark:bg-white dark:text-slate-900"
                        >
                            {isReporter ? (
                                <>
                                    <IconLifeBuoy className="h-4 w-4 md:hidden" />
                                    <span className="hidden md:inline">Respond Mode</span>
                                </>
                            ) : (
                                <>
                                    <IconMegaphone className="h-4 w-4 md:hidden" />
                                    <span className="hidden md:inline">Report Mode</span>
                                </>
                            )}
                        </Link>

                        {/* Utility icons */}
                        <div className="ml-2 flex flex-shrink-0 items-center gap-0.5 border-l border-slate-200 pl-2 dark:border-white/10">
                            <button
                                type="button"
                                onClick={toggleTheme}
                                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                                aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                                title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                            >
                                {theme === 'dark' ? <IconSun className="h-[18px] w-[18px]" /> : <IconMoon className="h-[18px] w-[18px]" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
