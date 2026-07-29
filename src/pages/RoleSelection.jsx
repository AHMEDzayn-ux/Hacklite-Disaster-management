import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    IconSiren,
    IconShieldLock,
    IconMegaphone,
    IconLifeBuoy,
    IconChevronRight,
    IconArrowRight,
    IconCheck,
    IconPhone,
    IconBolt,
    IconShieldCheck,
    IconUsers,
    IconGlobe,
    IconTent,
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
    { icon: IconBolt, title: 'Quick Response', desc: 'Fast and efficient emergency response system' },
    { icon: IconShieldCheck, title: 'Verified & Secure', desc: 'Secure platform with verified information' },
    { icon: IconUsers, title: 'Community Driven', desc: 'Built by the community, for the community' },
    { icon: IconGlobe, title: 'Sri Lanka Wide', desc: 'Nationwide coverage and support network' },
];

function RoleSelection() {
    const navigate = useNavigate();

    return (
        <div className="relative h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
            {/* Subtle dot-grid overlay */}
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            {/* Portal Links - Top Right */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2 lg:top-6 lg:right-8">
                <button
                    onClick={() => navigate('/camp-admin/login')}
                    className="flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/85 backdrop-blur-md hover:border-white/50 hover:bg-white/20 hover:text-white"
                >
                    <IconTent className="h-3.5 w-3.5" />
                    <span>Camp Admin</span>
                </button>
                <button
                    onClick={() => navigate('/admin/login')}
                    className="group flex items-center gap-1.5 rounded-full border border-white bg-white px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-danger-600 hover:text-white"
                >
                    <IconShieldLock className="h-4 w-4" />
                    <span>Admin Portal</span>
                </button>
            </div>

            <div className="relative z-10 flex h-full w-full flex-col justify-center overflow-y-auto px-6 py-4 sm:px-10 lg:px-16 xl:px-24">
                <div className="max-w-6xl py-2">
                    <div
                        className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-wide text-primary-100 backdrop-blur-md"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-success-500"></span>
                        </span>
                        SYSTEM ONLINE &middot; REAL-TIME RESPONSE
                    </div>

                    <h1
                        className="mb-2 flex flex-col items-start gap-0.5 text-3xl font-black leading-[1.1] tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)] sm:text-4xl lg:text-5xl"
                    >
                        <span className="flex items-center gap-3 pb-0.5">
                            <IconSiren className="h-7 w-7 flex-shrink-0 text-danger-400 lg:h-9 lg:w-9" />
                            Disaster
                        </span>
                        <span className="block bg-gradient-to-r from-danger-500 via-fuchsia-500 to-purple-500 bg-clip-text pb-1 text-transparent">
                            Management System
                        </span>
                    </h1>

                    <p
                        className="mb-1.5 text-lg font-semibold text-white md:text-xl"
                    >
                        Sri Lanka Emergency Response Platform
                    </p>
                    <p
                        className="mb-4 max-w-2xl text-sm text-slate-200 md:text-base"
                    >
                        Your safety is our priority. Report emergencies or get help quickly from our coordinated response teams across Sri Lanka.
                    </p>

                    {/* Role Selection Cards */}
                    <div className="grid gap-3 sm:grid-cols-2">
                        {/* Reporter/Victim Card */}
                        <div
                            onClick={() => navigate('/report')}
                            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/15 bg-slate-950/50 p-4 shadow-xl backdrop-blur-md hover:border-danger-400/60 hover:bg-slate-950/70"
                        >
                            <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-danger-500 to-orange-400"></div>

                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-danger-500/15 text-danger-400">
                                        <IconMegaphone className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Report Emergency</h2>
                                        <p className="mt-0.5 text-sm leading-snug text-slate-300">
                                            I need to report a missing person, disaster, or request help
                                        </p>
                                    </div>
                                </div>
                                <span className="mt-2 flex text-white/30 group-hover:text-danger-400">
                                    <IconChevronRight className="h-5 w-5 -mr-2.5" />
                                    <IconChevronRight className="h-5 w-5" />
                                </span>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                                {REPORT_ITEMS.map((item) => (
                                    <div key={item} className="flex items-center gap-2 text-xs text-slate-200">
                                        <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-danger-500/20 text-danger-400">
                                            <IconCheck className="h-2.5 w-2.5" />
                                        </span>
                                        {item}
                                    </div>
                                ))}
                            </div>

                            <button className="mt-4 w-full rounded-lg bg-danger-600 py-2.5 text-base font-bold text-white group-hover:bg-danger-500">
                                <span className="inline-flex items-center gap-2">
                                    Report Emergency
                                    <IconArrowRight className="h-5 w-5 group-hover/btn:translate-x-1" />
                                </span>
                            </button>
                        </div>

                        {/* Responder/Helper Card */}
                        <div
                            onClick={() => navigate('/respond')}
                            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/15 bg-slate-950/50 p-4 shadow-xl backdrop-blur-md hover:border-success-400/60 hover:bg-slate-950/70"
                        >
                            <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-success-500 to-primary-400"></div>

                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-success-500/15 text-success-400">
                                        <IconLifeBuoy className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Respond &amp; Help</h2>
                                        <p className="mt-0.5 text-sm leading-snug text-slate-300">
                                            I want to help, volunteer, or coordinate rescue efforts
                                        </p>
                                    </div>
                                </div>
                                <span className="mt-2 flex text-white/30 group-hover:text-success-400">
                                    <IconChevronRight className="h-5 w-5 -mr-2.5" />
                                    <IconChevronRight className="h-5 w-5" />
                                </span>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                                {RESPOND_ITEMS.map((item) => (
                                    <div key={item} className="flex items-center gap-2 text-xs text-slate-200">
                                        <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-success-500/20 text-success-400">
                                            <IconCheck className="h-2.5 w-2.5" />
                                        </span>
                                        {item}
                                    </div>
                                ))}
                            </div>

                            <button className="mt-4 w-full rounded-lg bg-success-600 py-2.5 text-base font-bold text-white group-hover:bg-success-500">
                                <span className="inline-flex items-center gap-2">
                                    I Want to Help
                                    <IconArrowRight className="h-5 w-5 group-hover/btn:translate-x-1" />
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Hotline bar */}
                    <div
                        className="mt-3 flex items-center gap-3 rounded-2xl border border-white/15 bg-slate-950/60 px-4 py-2 backdrop-blur-md"
                    >
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-danger-500/15">
                            <IconPhone className="h-4 w-4 text-danger-400" />
                        </span>
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary-100">Emergency Hotline</p>
                            <p className="text-xl font-extrabold text-white md:text-2xl">119 | 117</p>
                        </div>
                    </div>

                    {/* Feature strip */}
                    <div className="mt-3 hidden grid-cols-2 gap-3 border-t border-white/15 pt-2 sm:grid lg:grid-cols-4">
                        {FEATURES.map(({ icon: Icon, title, desc }) => (
                            <div
                                key={title}
                                className="flex items-start gap-2"
                            >
                                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/15 text-primary-200">
                                    <Icon className="h-4 w-4" />
                             </span>
                                <div>
                                    <p className="text-xs font-semibold text-white">{title}</p>
                                    <p className="mt-0.5 text-[11px] leading-snug text-slate-300">{desc}</p>
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
