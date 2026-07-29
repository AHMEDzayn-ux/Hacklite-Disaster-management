import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
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
    IconMenu,
    IconX,
    IconSun,
    IconMoon,
    IconBell,
    IconLogOut,
    IconShieldLock,
} from './icons/Icons';

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
    const [isOpen, setIsOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const location = useLocation();
    const { user, signOut } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const navLinks = userType === 'reporter' ? reporterLinks : responderLinks;
    const isReporter = userType === 'reporter';
    const Icon = isReporter ? IconMegaphone : IconLifeBuoy;

    const isActive = (path) => location.pathname === path;
    const closeMenus = () => { setNotifOpen(false); setProfileOpen(false); };

    return (
        <nav className="sticky top-0 z-50 border-b border-white/10 bg-white/95 backdrop-blur-sm dark:bg-slate-950/95">
            <div className="w-full px-4 sm:px-6 lg:px-10">
                <div className="flex h-16 items-center">
                    {/* Logo */}
                    <Link to="/" className="group flex flex-shrink-0 items-center gap-3 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 rounded-lg">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white transition-transform duration-200 group-hover:scale-105 dark:bg-white/10 dark:text-slate-300">
                            <Icon className="h-5 w-5" />
                        </div>
                        <div className="hidden flex-col leading-tight sm:flex">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Sri Lanka</span>
                            <span className="text-lg font-extrabold text-slate-900 dark:text-white">Disaster Management</span>
                        </div>
                        <span className="text-lg font-extrabold text-slate-900 dark:text-white sm:hidden">DM SL</span>
                    </Link>

                    {/* Desktop nav links */}
                    <div className="ml-auto hidden items-center gap-0.5 xl:flex">
                        {navLinks.map((link) => {
                            const active = isActive(link.path);
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`group relative flex items-center whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 ${active
                                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}

                        {/* Mode Switcher */}
                        <Link
                            to={isReporter ? '/respond' : '/report'}
                            className="group ml-1.5 flex items-center gap-1.5 rounded-full border border-slate-900 bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors duration-200 hover:bg-primary-600 hover:border-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 dark:border-white dark:bg-white dark:text-slate-900"
                        >
                            {isReporter ? (
                                <>
                                    <span>Respond Mode</span>
                                </>
                            ) : (
                                <>
                                    <span>Report Mode</span>
                                </>
                            )}
                        </Link>

                        {/* Utility icons */}
                        <div className="ml-2 flex items-center gap-0.5 border-l border-slate-200 pl-2 dark:border-white/10">
                            <button
                                type="button"
                                onClick={toggleTheme}
                                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                                aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                                title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                            >
                                {theme === 'dark' ? <IconSun className="h-[18px] w-[18px]" /> : <IconMoon className="h-[18px] w-[18px]" />}
                            </button>

                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
                                    className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                                    aria-label="Notifications"
                                >
                                    <IconBell className="h-[18px] w-[18px]" />
                                </button>
                                {notifOpen && (
                                    <>
                                        <div className="fixed inset-0 z-30" onClick={closeMenus} />
                                        <div className="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-white/10 dark:bg-slate-900">
                                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Notifications</p>
                                            <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">No new notifications</p>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => { setProfileOpen(o => !o); setNotifOpen(false); }}
                                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 transition-colors hover:bg-slate-300 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
                                    aria-label="Account menu"
                                >
                                    <IconShieldLock className="h-4 w-4" />
                                </button>
                                {profileOpen && (
                                    <>
                                        <div className="fixed inset-0 z-30" onClick={closeMenus} />
                                        <div className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-slate-900">
                                            {user ? (
                                                <>
                                                    <p className="truncate px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => { closeMenus(); signOut(); }}
                                                        className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                                                    >
                                                        <IconLogOut className="h-4 w-4" /> Sign out
                                                    </button>
                                                </>
                                            ) : (
                                                <Link
                                                    to="/admin/login"
                                                    onClick={closeMenus}
                                                    className="block rounded-lg px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
                                                >
                                                    Admin sign in
                                                </Link>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="ml-auto rounded-lg p-2 text-slate-900 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 dark:text-white dark:hover:bg-white/10 xl:hidden"
                        aria-label="Toggle menu"
                        aria-expanded={isOpen}
                    >
                        {isOpen ? <IconX className="h-6 w-6" /> : <IconMenu className="h-6 w-6" />}
                    </button>
                </div>

                {/* Mobile menu */}
                {isOpen && (
                    <div className="space-y-1.5 border-t border-slate-200 py-4 dark:border-white/10 xl:hidden">
                        {navLinks.map((link) => {
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setIsOpen(false)}
                                    className={`flex items-center rounded-xl px-4 py-3 text-base font-semibold transition-colors ${isActive(link.path)
                                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300'
                                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10'
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}

                        <Link
                            to={isReporter ? '/respond' : '/report'}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center rounded-xl bg-slate-900 px-4 py-3 text-base font-semibold text-white dark:bg-white dark:text-slate-900"
                        >
                            {isReporter ? 'Respond Mode' : 'Report Mode'}
                        </Link>

                        <div className="flex items-center justify-between border-t border-slate-200 px-4 pt-3 dark:border-white/10">
                            <button
                                type="button"
                                onClick={toggleTheme}
                                className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300"
                            >
                                {theme === 'dark' ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}
                                {theme === 'dark' ? 'Light theme' : 'Dark theme'}
                            </button>
                            {user ? (
                                <button
                                    type="button"
                                    onClick={() => { setIsOpen(false); signOut(); }}
                                    className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300"
                                >
                                    <IconLogOut className="h-4 w-4" /> Sign out
                                </button>
                            ) : (
                                <Link to="/admin/login" onClick={() => setIsOpen(false)} className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                    Admin sign in
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}

export default Navbar;
