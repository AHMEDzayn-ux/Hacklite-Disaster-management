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
import heroImage from '../assets/dark.png';

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
        <nav className="sticky top-0 z-50 border-b border-white/10 shadow-lg shadow-black/30 backdrop-blur-xl">
            <div className={`h-1 bg-gradient-to-r ${isReporter ? 'from-danger-500 via-orange-400 to-danger-600' : 'from-success-500 via-primary-400 to-success-600'}`}></div>

            {/* Faint atmospheric background */}
            <div className="absolute inset-0 overflow-hidden">
                <img src={heroImage} alt="" className="h-full w-full object-cover object-top opacity-[0.12]" />
                <div className="absolute inset-0 bg-slate-950/92"></div>
            </div>

            <div className="relative w-full px-4 sm:px-6 lg:px-10">
                <div className="flex h-24 items-center">
                    {/* Logo */}
                    <Link to="/" className="group flex flex-shrink-0 items-center gap-3 transition-opacity hover:opacity-90">
                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${isReporter ? 'bg-danger-500 shadow-danger-500/30' : 'bg-success-500 shadow-success-500/30'}`}>
                            <Icon className="h-7 w-7" />
                        </div>
                        <div className="hidden flex-col leading-tight sm:flex">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sri Lanka</span>
                            <span className="text-2xl font-extrabold text-white">Disaster Management</span>
                        </div>
                        <span className="text-xl font-extrabold text-white sm:hidden">DM SL</span>
                    </Link>

                    {/* Desktop menu and switcher - Right aligned */}
                    <div className="ml-auto hidden items-center gap-2 lg:flex">
                        {navLinks.map((link) => {
                            const LinkIcon = link.icon;
                            const active = isActive(link.path);
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`group relative flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-3 text-base font-semibold transition-all duration-300 ${active
                                        ? isReporter
                                            ? 'bg-danger-500/15 text-danger-300 shadow-inner'
                                            : 'bg-success-500/15 text-success-300 shadow-inner'
                                        : 'text-slate-300 hover:-translate-y-0.5 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    <LinkIcon className="h-5 w-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                                    {link.label}
                                    <span
                                        className={`absolute -bottom-0.5 left-4 right-4 h-0.5 rounded-full transition-transform duration-300 origin-left ${active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'} ${isReporter ? 'bg-danger-400' : 'bg-success-400'}`}
                                    ></span>
                                </Link>
                            );
                        })}

                        {/* Mode Switcher */}
                        <Link
                            to={isReporter ? '/respond' : '/report'}
                            className={`group ml-3 flex items-center gap-2 rounded-full border border-white bg-white px-6 py-3 text-base font-bold text-slate-900 shadow-md transition-all duration-300 hover:-translate-y-0.5 ${isReporter ? 'hover:bg-success-600' : 'hover:bg-danger-600'} hover:text-white hover:shadow-lg`}
                        >
                            {isReporter ? (
                                <>
                                    <IconLifeBuoy className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                                    <span>Respond Mode</span>
                                </>
                            ) : (
                                <>
                                    <IconMegaphone className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                                    <span>Report Mode</span>
                                </>
                            )}
                        </Link>
                    </div>

                    {/* Mobile menu button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="ml-auto rounded-lg p-2 text-white transition-colors hover:bg-white/10 focus:outline-none lg:hidden"
                        aria-label="Toggle menu"
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
                    <div className="space-y-1.5 border-t border-white/10 py-4 lg:hidden">
                        {navLinks.map((link) => {
                            const LinkIcon = link.icon;
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setIsOpen(false)}
                                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold transition-all ${isActive(link.path)
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
