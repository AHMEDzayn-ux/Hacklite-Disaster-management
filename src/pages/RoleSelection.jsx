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
} from '@/components/icons/Icons';

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
        <div className="page-shell home-shell bg-slate-200">
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
                    onClick={() => navigate('/admin/login')}
                    className="flex items-center gap-2 rounded-full border border-white bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-sm transition-colors duration-150 hover:bg-primary-600 hover:text-white hover:border-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-5 sm:py-2.5 sm:text-sm"
                >
                    <IconShieldLock className="h-4 w-4" />
                    <span className="hidden sm:inline">Admin Login</span>
                </button>
            </div>

            <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-7xl flex-col justify-center px-6 py-[clamp(0.5rem,2dvh,1.5rem)] sm:px-10 lg:px-14">
                <div className="max-w-6xl">
                    {/* Status chip */}
                    <div
                        className="mb-[clamp(0.375rem,1.2dvh,0.75rem)] inline-flex items-center gap-2 rounded-full border border-success-600/40 bg-success-500/10 py-1 pl-2.5 pr-3.5 text-[11px] font-bold tracking-wide text-success-700 animate-fade-in-up dark:border-success-400/25 dark:bg-success-500/[0.08] dark:text-success-300"
                    >
                        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-success-600 dark:bg-success-400"></span>
                        SYSTEM ONLINE &middot; REAL-TIME RESPONSE
                    </div>

                    {/* Hero heading */}
                    <h1
                        className="mb-[clamp(0.5rem,1.4dvh,0.875rem)] flex flex-col items-start gap-0.5 text-[clamp(1.375rem,1rem+1vw+1.8dvh,2.75rem)] font-black leading-[1.1] tracking-tight text-slate-900 dark:text-white animate-fade-in-up"
                        style={{ animationDelay: '0.05s' }}
                    >
                        <span className="flex items-center gap-2.5 pb-0.5">
                            <IconSiren className="h-[clamp(1.375rem,1rem+0.6vw+1.4dvh,2.25rem)] w-[clamp(1.375rem,1rem+0.6vw+1.4dvh,2.25rem)] flex-shrink-0 text-slate-700 dark:text-slate-300" />
                            Disaster
                        </span>
                        <span className="block pb-1 text-slate-900 dark:text-white">
                            Management System
                        </span>
                    </h1>

                    <p
                        className="mb-[clamp(0.25rem,0.8dvh,0.375rem)] text-[clamp(0.9375rem,0.8rem+0.9dvh,1.25rem)] font-semibold text-slate-900 dark:text-white animate-fade-in-up"
                        style={{ animationDelay: '0.1s' }}
                    >
                        Sri&nbsp;Lanka Emergency Response Platform
                    </p>
                    <p
    className="mb-[clamp(0.5rem,1.4dvh,1rem)] max-w-2xl text-xs text-slate-400 animate-fade-in-up"
    style={{ animationDelay: '0.15s' }}
>
    Your safety is our priority. Report emergencies or get help quickly from our coordinated response teams across Sri&nbsp;Lanka.
</p>
                    {/* Role Selection Cards */}
                    <div className="grid gap-[clamp(0.625rem,1.6dvh,1rem)] sm:grid-cols-2">
                        {/* Reporter/Victim Card */}
                        <div
                            onClick={() => navigate('/report')}
                            className="group relative cursor-pointer rounded-xl border border-danger-300 bg-danger-50/40 p-[clamp(0.75rem,1.8dvh,1.25rem)] transition-transform duration-200 hover:-translate-y-0.5 dark:border-danger-500/30 dark:bg-danger-500/[0.04] animate-fade-in-up"
                            style={{ animationDelay: '0.2s' }}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex h-[clamp(2rem,1.6rem+1.2dvh,2.75rem)] w-[clamp(2rem,1.6rem+1.2dvh,2.75rem)] flex-shrink-0 items-center justify-center rounded-lg bg-danger-500 text-white ring-1 ring-inset ring-danger-400/40">
                                    <IconMegaphone className="h-[clamp(1rem,0.8rem+0.6dvh,1.25rem)] w-[clamp(1rem,0.8rem+0.6dvh,1.25rem)]" />
                                </div>
                                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-danger-500/15 text-danger-500 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-danger-300">
                                    <IconArrowRight className="h-3.5 w-3.5" />
                                </span>
                            </div>

                            <h2 className="mb-1 mt-[clamp(0.5rem,1.2dvh,0.75rem)] text-[clamp(0.9375rem,0.8rem+0.6dvh,1.125rem)] font-bold text-slate-900 dark:text-white">Report Emergency</h2>
                            <p className="mb-2 text-xs leading-snug text-slate-500 dark:text-slate-400">
                                I need to report a missing person, disaster, or request help
                            </p>

                            <div className="mb-[clamp(0.625rem,1.4dvh,1rem)] grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2">
                                {REPORT_ITEMS.map((item) => (
                                    <div key={item} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                        <IconCheck className="h-3 w-3 flex-shrink-0 text-danger-500 dark:text-danger-400" />
                                        <span className="truncate">{item}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => navigate('/report')}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-[clamp(0.375rem,1dvh,0.625rem)] text-sm font-bold text-white transition-colors duration-200 hover:bg-danger-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-400 dark:bg-white dark:text-slate-900 dark:hover:bg-danger-500 dark:hover:text-white"
                            >
                                Report Emergency
                                <IconArrowRight className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        {/* Responder/Helper Card */}
                        <div
                            onClick={() => navigate('/respond')}
                            className="group relative cursor-pointer rounded-xl border border-success-300 bg-success-50/40 p-[clamp(0.75rem,1.8dvh,1.25rem)] transition-transform duration-200 hover:-translate-y-0.5 dark:border-success-500/30 dark:bg-success-500/[0.04] animate-fade-in-up"
                            style={{ animationDelay: '0.25s' }}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex h-[clamp(2rem,1.6rem+1.2dvh,2.75rem)] w-[clamp(2rem,1.6rem+1.2dvh,2.75rem)] flex-shrink-0 items-center justify-center rounded-lg bg-success-500 text-white ring-1 ring-inset ring-success-400/40">
                                    <IconLifeBuoy className="h-[clamp(1rem,0.8rem+0.6dvh,1.25rem)] w-[clamp(1rem,0.8rem+0.6dvh,1.25rem)]" />
                                </div>
                                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-success-500/15 text-success-500 transition-transform duration-200 group-hover:translate-x-0.5 dark:text-success-300">
                                    <IconArrowRight className="h-3.5 w-3.5" />
                                </span>
                            </div>

                            <h2 className="mb-1 mt-[clamp(0.5rem,1.2dvh,0.75rem)] text-[clamp(0.9375rem,0.8rem+0.6dvh,1.125rem)] font-bold text-slate-900 dark:text-white">Respond &amp; Help</h2>
                            <p className="mb-2 text-xs leading-snug text-slate-500 dark:text-slate-400">
                                I want to help, volunteer, or coordinate rescue efforts
                            </p>

                            <div className="mb-[clamp(0.625rem,1.4dvh,1rem)] grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2">
                                {RESPOND_ITEMS.map((item) => (
                                    <div key={item} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                        <IconCheck className="h-3 w-3 flex-shrink-0 text-success-500 dark:text-success-400" />
                                        <span className="truncate">{item}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => navigate('/respond')}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-[clamp(0.375rem,1dvh,0.625rem)] text-sm font-bold text-white transition-colors duration-200 hover:bg-success-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success-400 dark:bg-white dark:text-slate-900 dark:hover:bg-success-500 dark:hover:text-white"
                            >
                                I Want to Help
                                <IconArrowRight className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Hotline bar */}
                    <div
                        className="mt-[clamp(0.625rem,1.4dvh,1rem)] flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-[clamp(0.5rem,1.1dvh,0.75rem)] animate-fade-in-up"
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
                    <div className="mt-[clamp(0.625rem,1.4dvh,1rem)] grid grid-cols-1 gap-1.5 border-t border-white/10 pt-[clamp(0.625rem,1.4dvh,1rem)] sm:grid-cols-2 lg:grid-cols-4">
                        {FEATURES.map(({ icon: Icon, title, desc }, i) => (
                            <div
                                key={title}
                                className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-1.5 animate-fade-in-up"
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
