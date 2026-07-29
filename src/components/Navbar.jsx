import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
} from './icons/Icons';

function Navbar({ userType = 'reporter' }) {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    // Different navigation links for different user types
    const reporterLinks = [
        { path: '/report', label: 'Dashboard', icon: IconGrid },
        { path: '/missing-persons', label: 'Missing Person', icon: IconUserSearch },
        { path: '/disasters', label: 'Disaster', icon: IconSiren },
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

    const navLinks = userType === 'reporter' ? reporterLinks : responderLinks;
    const isReporter = userType === 'reporter';
    const Icon = isReporter ? IconMegaphone : IconLifeBuoy;

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 shadow-md shadow-black/20">
            <div className={`h-1 bg-gradient-to-r ${isReporter ? 'from-danger-600 to-danger-400' : 'from-success-600 to-success-400'}`}></div>

            <div className="w-full px-4 sm:px-6 lg:px-10">
                <div className="flex h-16 items-center">
                    {/* Logo */}
                    <Link to="/" className="group flex flex-shrink-0 items-center gap-3 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-lg">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white transition-transform duration-200 group-hover:scale-105 ${isReporter ? 'bg-danger-500' : 'bg-success-500'}`}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div className="hidden flex-col leading-tight sm:flex">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Sri Lanka</span>
                            <span className="text-lg font-extrabold text-white">Disaster Management</span>
                        </div>
                        <span className="text-lg font-extrabold text-white sm:hidden">DM SL</span>
                    </Link>

                    {/* Desktop menu and switcher - Right aligned */}
                    <div className="ml-auto hidden items-center gap-0.5 xl:flex">
                        {navLinks.map((link) => {
                            const LinkIcon = link.icon;
                            const active = isActive(link.path);
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`group relative flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${active
                                        ? isReporter
                                            ? 'bg-danger-500/15 text-danger-300'
                                            : 'bg-success-500/15 text-success-300'
                                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    <LinkIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                    {link.label}
                                </Link>
                            );
                        })}

                        {/* Mode Switcher */}
                        <Link
                            to={isReporter ? '/respond' : '/report'}
                            className={`group ml-1.5 flex items-center gap-1.5 rounded-full border border-white bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-sm transition-colors duration-200 ${isReporter ? 'hover:bg-success-600' : 'hover:bg-danger-600'} hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}
                        >
                            {isReporter ? (
                                <>
                                    <IconLifeBuoy className="h-3.5 w-3.5" />
                                    <span>Respond Mode</span>
                                </>
                            ) : (
                                <>
                                    <IconMegaphone className="h-3.5 w-3.5" />
                                    <span>Report Mode</span>
                                </>
                            )}
                        </Link>
                    </div>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="ml-auto rounded-lg p-2 text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white xl:hidden"
                        aria-label="Toggle menu"
                        aria-expanded={isOpen}
                    >
                        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile menu */}
                {isOpen && (
                    <div className="space-y-1.5 border-t border-white/10 py-4 xl:hidden">
                        {navLinks.map((link) => {
                            const LinkIcon = link.icon;
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setIsOpen(false)}
                                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${isActive(link.path)
                                        ? isReporter
                                            ? 'bg-danger-500/15 text-danger-300'
                                            : 'bg-success-500/15 text-success-300'
                                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    <LinkIcon className="h-5 w-5 flex-shrink-0" />
                                    {link.label}
                                </Link>
                            );
                        })}

                        {/* Mobile Mode Switcher */}
                        <div className="mt-3 border-t border-white/10 pt-3">
                            <Link
                                to={isReporter ? '/respond' : '/report'}
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-base font-bold text-slate-900 transition-all hover:bg-white/90"
                            >
                                {isReporter ? (
                                    <>
                                        <IconLifeBuoy className="h-4 w-4" />
                                        <span>Respond Mode</span>
                                    </>
                                ) : (
                                    <>
                                        <IconMegaphone className="h-4 w-4" />
                                        <span>Report Mode</span>
                                    </>
                                )}
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}

export default Navbar;
