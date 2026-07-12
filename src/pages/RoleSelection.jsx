import React from 'react';
import { useNavigate } from 'react-router-dom';
import heroImage from '../assets/home.png';
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
    { icon: IconBolt, title: 'Quick Response', desc: 'Fast and efficient emergency response system' },
    { icon: IconShieldCheck, title: 'Verified & Secure', desc: 'Secure platform with verified information' },
    { icon: IconUsers, title: 'Community Driven', desc: 'Built by the community, for the community' },
    { icon: IconGlobe, title: 'Sri Lanka Wide', desc: 'Nationwide coverage and support network' },
];

function RoleSelection() {
    const navigate = useNavigate();

    return (
        <div className="relative min-h-screen overflow-hidden bg-slate-950 font-sans">
            {/* Background photo */}
            <div className="absolute inset-0">
                <img
                    src={heroImage}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover object-[70%_center]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(2,6,23)_0%,rgba(2,6,23,0.8)_28%,rgba(2,6,23,0.35)_46%,transparent_60%)]"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/10"></div>
            </div>

            {/* Subtle dot-grid overlay */}
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            {/* Admin Portal Link - Top Right */}
            <div className="absolute top-12 right-36 z-20 animate-fade-in-up">
                <button
                    onClick={() => navigate('/admin/login')}
                    className="group flex items-center gap-2 rounded-full border border-white bg-white px-5 py-2.5 text-sm font-bold text-slate-900 shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-danger-600 hover:text-white hover:shadow-[0_6px_24px_rgba(220,38,38,0.5)]"
                >
                    <IconShieldLock className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                    <span>Admin Portal</span>
                </button>
            </div>

            <div className="relative z-10 flex min-h-screen w-full flex-col justify-center px-6 py-24 sm:px-10 lg:pl-44 lg:pr-0 xl:pl-60">
                <div className="max-w-6xl">
                    <div
                        className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold tracking-wide text-primary-100 backdrop-blur-md animate-fade-in-up"
                    >
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-75"></span>
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success-500"></span>
                        </span>
                        SYSTEM ONLINE &middot; REAL-TIME RESPONSE
                    </div>

                    <h1
                        className="mb-5 flex flex-col items-start gap-1 text-5xl font-black leading-[1.15] tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)] sm:text-6xl lg:text-7xl animate-fade-in-up"
                        style={{ animationDelay: '0.1s' }}
                    >
                        <span className="flex items-center gap-4 pb-1">
                            <IconSiren className="h-10 w-10 flex-shrink-0 text-danger-400 lg:h-14 lg:w-14" />
                            Disaster
                        </span>
                        <span className="block bg-gradient-to-r from-danger-500 via-fuchsia-500 to-purple-500 bg-clip-text pb-3 text-transparent">
                            Management System
                        </span>
                    </h1>

                    <p
                        className="mb-4 text-2xl font-semibold text-white md:text-3xl animate-fade-in-up"
                        style={{ animationDelay: '0.2s' }}
                    >
                        Sri Lanka Emergency Response Platform
                    </p>
                    <p
                        className="mb-12 max-w-2xl text-lg text-slate-200 md:text-xl animate-fade-in-up"
                        style={{ animationDelay: '0.25s' }}
                    >
                        Your safety is our priority. Report emergencies or get help quickly from our coordinated response teams across Sri Lanka.
                    </p>

                    {/* Role Selection Cards */}
                    <div className="grid gap-7 sm:grid-cols-2">
                        {/* Reporter/Victim Card */}
                        <div
                            onClick={() => navigate('/report')}
                            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/15 bg-slate-950/50 p-8 shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-danger-400/60 hover:bg-slate-950/70 animate-fade-in-up"
                            style={{ animationDelay: '0.3s' }}
                        >
                            <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-danger-500 to-orange-400"></div>

                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-danger-500 text-white shadow-lg shadow-danger-500/40 transition-transform duration-300 group-hover:scale-110">
                                        <IconMegaphone className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-bold text-white">Report Emergency</h2>
                                        <p className="mt-1 text-lg leading-snug text-slate-300">
                                            I need to report a missing person, disaster, or request help
                                        </p>
                                    </div>
                                </div>
                                <span className="mt-2 flex text-white/30 transition-all duration-300 group-hover:translate-x-1 group-hover:text-danger-400">
                                    <IconChevronRight className="h-5 w-5 -mr-2.5" />
                                    <IconChevronRight className="h-5 w-5" />
                                </span>
                            </div>

                            <div className="mt-5 space-y-2.5">
                                {REPORT_ITEMS.map((item) => (
                                    <div key={item} className="flex items-center gap-3 text-lg text-slate-200">
                                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-danger-500/20 text-danger-400">
                                            <IconCheck className="h-3.5 w-3.5" />
                                        </span>
                                        {item}
                                    </div>
                                ))}
                            </div>

                            <button className="group/btn relative mt-7 w-full overflow-hidden rounded-lg bg-gradient-to-r from-danger-600 to-danger-500 py-4 text-xl font-bold text-white shadow-lg shadow-danger-500/30 transition-shadow duration-300 group-hover:shadow-danger-500/50">
                                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent group-hover:animate-shimmer"></span>
                                <span className="relative inline-flex items-center gap-2">
                                    Report Emergency
                                    <IconArrowRight className="h-5 w-5 transition-transform duration-300 group-hover/btn:translate-x-1" />
                                </span>
                            </button>
                        </div>

                        {/* Responder/Helper Card */}
                        <div
                            onClick={() => navigate('/respond')}
                            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/15 bg-slate-950/50 p-8 shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-success-400/60 hover:bg-slate-950/70 animate-fade-in-up"
                            style={{ animationDelay: '0.4s' }}
                        >
                            <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-success-500 to-primary-400"></div>

                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-success-500 text-white shadow-lg shadow-success-500/40 transition-transform duration-300 group-hover:scale-110">
                                        <IconLifeBuoy className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-bold text-white">Respond &amp; Help</h2>
                                        <p className="mt-1 text-lg leading-snug text-slate-300">
                                            I want to help, volunteer, or coordinate rescue efforts
                                        </p>
                                    </div>
                                </div>
                                <span className="mt-2 flex text-white/30 transition-all duration-300 group-hover:translate-x-1 group-hover:text-success-400">
                                    <IconChevronRight className="h-5 w-5 -mr-2.5" />
                                    <IconChevronRight className="h-5 w-5" />
                                </span>
                            </div>

                            <div className="mt-5 space-y-2.5">
                                {RESPOND_ITEMS.map((item) => (
                                    <div key={item} className="flex items-center gap-3 text-lg text-slate-200">
                                        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-success-500/20 text-success-400">
                                            <IconCheck className="h-3.5 w-3.5" />
                                        </span>
                                        {item}
                                    </div>
                                ))}
                            </div>

                            <button className="group/btn relative mt-7 w-full overflow-hidden rounded-lg bg-gradient-to-r from-success-600 to-success-500 py-4 text-xl font-bold text-white shadow-lg shadow-success-500/30 transition-shadow duration-300 group-hover:shadow-success-500/50">
                                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent group-hover:animate-shimmer"></span>
                                <span className="relative inline-flex items-center gap-2">
                                    I Want to Help
                                    <IconArrowRight className="h-5 w-5 transition-transform duration-300 group-hover/btn:translate-x-1" />
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Hotline bar */}
                    <div
                        className="mt-8 flex animate-float items-center gap-4 rounded-2xl border border-white/20 bg-slate-950/60 px-6 py-5 shadow-xl backdrop-blur-md animate-fade-in-up"
                        style={{ animationDelay: '0.45s' }}
                    >
                        <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-danger-500/25">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger-400/40"></span>
                            <IconPhone className="relative h-5 w-5 text-danger-300" />
                        </span>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-primary-100">Emergency Hotline</p>
                            <p className="text-3xl font-extrabold text-white md:text-4xl">119 | 117</p>
                        </div>
                    </div>

                    {/* Feature strip */}
                    <div className="mt-12 grid grid-cols-2 gap-6 border-t border-white/15 pt-8">
                        {FEATURES.map(({ icon: Icon, title, desc }, i) => (
                            <div
                                key={title}
                                className="flex items-start gap-3 animate-fade-in-up"
                                style={{ animationDelay: `${0.5 + i * 0.08}s` }}
                            >
                                <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/15 text-primary-200">
                                    <Icon className="h-5 w-5" />
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-white">{title}</p>
                                    <p className="mt-0.5 text-xs leading-snug text-slate-300">{desc}</p>
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
