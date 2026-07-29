import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    IconSiren,
    IconShieldLock,
    IconMegaphone,
    IconLifeBuoy,
    IconArrowRight,
    IconCheck,
    IconPhone,
    IconBolt,
    IconShieldCheck,
    IconUsers,
    IconGlobe,
    IconTent,
} from '../components/icons/Icons';

const REPORT_ITEMS = [
    'Report missing persons',
    'Report disasters',
    'Request animal rescue',
    'Access emergency contacts',
];

const RESPOND_ITEMS = [
    'View missing persons list',
    'See active disasters',
    'Register as volunteer',
    'Manage camps & donate',
];

const FEATURES = [
    { icon: IconBolt, title: 'Quick Response', desc: 'Fast and efficient emergency response' },
    { icon: IconShieldCheck, title: 'Verified & Secure', desc: 'Platform with verified information' },
    { icon: IconUsers, title: 'Community Driven', desc: 'Built by the community, for everyone' },
    { icon: IconGlobe, title: 'Sri Lanka Wide', desc: 'Nationwide coverage and support' },
];

function RoleSelection() {
    const navigate = useNavigate();

    return (
        <div className="page-shell">
            {/* Static colour glow - CSS gradient only, no image/filter/animation */}
            {/* Subtle dot-grid texture */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.08]"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            {/* Portal Links - Top Right */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2 sm:top-6 sm:right-6 sm:gap-3 lg:top-8 lg:right-10 animate-fade-in-up">
                <button
                    onClick={() => navigate('/camp-admin/login')}
                    className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 transition-colors duration-150 hover:border-white/30 hover:text-slate-900 dark:hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-4 sm:py-2.5 sm:text-sm"
                >
                    <IconTent className="h-4 w-4" />
                    <span className="hidden sm:inline">Camp Admin</span>
                </button>
                <button
                    onClick={() => navigate('/admin/login')}
                    className="flex items-center gap-2 rounded-full border border-white bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-sm transition-colors duration-150 hover:bg-primary-600 hover:text-white hover:border-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-5 sm:py-2.5 sm:text-sm"
                >
                    <IconShieldLock className="h-4 w-4" />
                    <span className="hidden sm:inline">Admin Portal</span>
                </button>
            </div>

            <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-6 py-8 sm:px-10 sm:py-10 lg:px-14">
                <div className="max-w-6xl">
                    {/* Status chip */}
                    <div
                        className="mb-3 inline-flex items-center gap-2 rounded-full border border-success-400/25 bg-success-500/[0.08] py-1 pl-2.5 pr-3.5 text-[11px] font-bold tracking-wide text-success-300 animate-fade-in-up"
                    >
                        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-success-400"></span>
                        SYSTEM ONLINE &middot; REAL-TIME RESPONSE
                    </div>

                    {/* Hero heading */}
                    <h1
                        className="mb-2.5 flex flex-col items-start gap-0.5 text-[clamp(1.75rem,1.2rem+2vw,3rem)] font-black leading-[1.1] tracking-tight text-slate-900 dark:text-white animate-fade-in-up"
                        style={{ animationDelay: '0.05s' }}
                    >
                        <span className="flex items-center gap-2.5 pb-0.5">
                            <IconSiren className="h-[clamp(1.75rem,1.3rem+1.1vw,2.5rem)] w-[clamp(1.75rem,1.3rem+1.1vw,2.5rem)] flex-shrink-0 text-slate-700 dark:text-slate-300" />
                            Disaster
                        </span>
                        <span className="block bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text pb-1.5 text-transparent">
                            Management System
                        </span>
                    </h1>

                    <p
                        className="mb-1.5 text-lg font-semibold text-slate-900 dark:text-white md:text-xl animate-fade-in-up"
                        style={{ animationDelay: '0.1s' }}
                    >
                        Sri Lanka Emergency Response Platform
                    </p>
                    <p
    className="mb-4 max-w-2xl text-xs text-slate-400 animate-fade-in-up"
    style={{ animationDelay: '0.15s' }}
>
    Your safety is our priority. Report emergencies or get help quickly from our coordinated response teams across Sri Lanka.
</p>
                    {/* Role Selection Cards */}
                    <div className="grid gap-3.5 sm:grid-cols-2">
                        {/* Reporter/Victim Card */}
                        <div
                            onClick={() => navigate('/report')}
                            className="group relative cursor-pointer rounded-xl border border-danger-300 bg-danger-50/40 p-4 transition-transform duration-200 hover:-translate-y-0.5 dark:border-danger-500/30 dark:bg-danger-500/[0.04] animate-fade-in-up"
                            style={{ animationDelay: '0.2s' }}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-danger-500 text-white ring-1 ring-inset ring-danger-400/40">
                                    <IconMegaphone className="h-5 w-5" />
                                </div>
                                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-danger-500/15 text-danger-500 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-danger-300">
                                    <IconArrowRight className="h-3.5 w-3.5" />
                                </span>
                            </div>

                            <h2 className="mb-1 mt-2.5 text-base font-bold text-slate-900 dark:text-white">Report Emergency</h2>
                            <p className="mb-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                I need to report a missing person, disaster, or request help
                            </p>

                            <div className="mb-3.5 grid grid-cols-1 gap-x-3 gap-y-1.5 sm:grid-cols-2">
                                {REPORT_ITEMS.map((item) => (
                                    <div key={item} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                        <IconCheck className="h-3 w-3 flex-shrink-0 text-danger-500 dark:text-danger-400" />
                                        <span className="truncate">{item}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => navigate('/report')}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2 text-sm font-bold text-white transition-colors duration-200 hover:bg-danger-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-400 dark:bg-white dark:text-slate-900 dark:hover:bg-danger-500 dark:hover:text-white"
                            >
                                Report Emergency
                                <IconArrowRight className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        {/* Responder/Helper Card */}
                        <div
                            onClick={() => navigate('/respond')}
                            className="group relative cursor-pointer rounded-xl border border-success-300 bg-success-50/40 p-4 transition-transform duration-200 hover:-translate-y-0.5 dark:border-success-500/30 dark:bg-success-500/[0.04] animate-fade-in-up"
                            style={{ animationDelay: '0.25s' }}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-success-500 text-white ring-1 ring-inset ring-success-400/40">
                                    <IconLifeBuoy className="h-5 w-5" />
                                </div>
                                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-success-500/15 text-success-500 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-success-300">
                                    <IconArrowRight className="h-3.5 w-3.5" />
                                </span>
                            </div>

                            <h2 className="mb-1 mt-2.5 text-base font-bold text-slate-900 dark:text-white">Respond &amp; Help</h2>
                            <p className="mb-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                I want to help, volunteer, or coordinate rescue efforts
                            </p>

                            <div className="mb-3.5 grid grid-cols-1 gap-x-3 gap-y-1.5 sm:grid-cols-2">
                                {RESPOND_ITEMS.map((item) => (
                                    <div key={item} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                        <IconCheck className="h-3 w-3 flex-shrink-0 text-success-500 dark:text-success-400" />
                                        <span className="truncate">{item}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => navigate('/respond')}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-2 text-sm font-bold text-white transition-colors duration-200 hover:bg-success-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success-400 dark:bg-white dark:text-slate-900 dark:hover:bg-success-500 dark:hover:text-white"
                            >
                                I Want to Help
                                <IconArrowRight className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Hotline bar */}
                    <div
                        className="mt-3.5 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 animate-fade-in-up"
                        style={{ animationDelay: '0.3s' }}
                    >
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-inset ring-slate-200 dark:bg-white/10 dark:ring-white/10">
                            <IconPhone className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                        </span>
                        <div className="flex flex-1 items-center justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Emergency Hotline</p>
                                <p className="text-lg font-extrabold text-slate-900 dark:text-white md:text-xl">119 | 117</p>
                            </div>
                        </div>
                    </div>

                    {/* Feature strip */}
                    <div className="mt-4 grid grid-cols-1 gap-2 border-t border-white/10 pt-3.5 sm:grid-cols-2 lg:grid-cols-4">
                        {FEATURES.map(({ icon: Icon, title, desc }, i) => (
                            <div
                                key={title}
                                className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2 animate-fade-in-up"
                                style={{ animationDelay: `${0.35 + i * 0.05}s` }}
                            >
                                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-slate-300">
                                    <Icon className="h-3.5 w-3.5" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{title}</p>
                                    <p className="truncate text-[11px] leading-snug text-slate-500">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RoleSelection;
