import React from 'react';
import { Link } from 'react-router-dom';
import {
    IconSiren,
    IconUserSearch,
    IconPawPrint,
    IconPhone,
    IconTent,
    IconCloud,
    IconMessageSquare,
    IconArrowRight,
} from '../components/icons/Icons';
import heroImage from '../assets/red.png';

const REPORT_OPTIONS = [
    {
        to: '/disasters',
        icon: IconSiren,
        color: 'danger',
        title: 'Report Disaster',
        desc: 'Report floods, fires, landslides, etc.',
        cta: 'Report Now',
    },
    {
        to: '/missing-persons',
        icon: IconUserSearch,
        color: 'fuchsia',
        title: 'Report Missing Person',
        desc: 'Report someone missing during disaster',
        cta: 'Report Now',
    },
    {
        to: '/animal-rescue',
        icon: IconPawPrint,
        color: 'primary',
        title: 'Request Animal Rescue',
        desc: 'Report animals needing rescue',
        cta: 'Report Now',
    },
    {
        to: '/emergency',
        icon: IconPhone,
        color: 'success',
        title: 'Emergency Contacts',
        desc: 'Quick access to helplines',
        cta: 'View Contacts',
    },
    {
        to: '/request-camp',
        icon: IconTent,
        color: 'amber',
        title: 'Request Relief Camp',
        desc: 'Request a new relief camp in your area',
        cta: 'Request Now',
    },
];

const COLOR_STYLES = {
    danger: {
        bar: 'from-danger-500 to-orange-400',
        badge: 'bg-danger-500 shadow-danger-500/40',
        text: 'group-hover:text-danger-400',
        cta: 'text-danger-400',
    },
    fuchsia: {
        bar: 'from-fuchsia-500 to-purple-400',
        badge: 'bg-fuchsia-500 shadow-fuchsia-500/40',
        text: 'group-hover:text-fuchsia-400',
        cta: 'text-fuchsia-400',
    },
    primary: {
        bar: 'from-primary-500 to-blue-400',
        badge: 'bg-primary-500 shadow-primary-500/40',
        text: 'group-hover:text-primary-300',
        cta: 'text-primary-300',
    },
    success: {
        bar: 'from-success-500 to-primary-400',
        badge: 'bg-success-500 shadow-success-500/40',
        text: 'group-hover:text-success-400',
        cta: 'text-success-400',
    },
    amber: {
        bar: 'from-amber-500 to-orange-400',
        badge: 'bg-amber-500 shadow-amber-500/40',
        text: 'group-hover:text-amber-400',
        cta: 'text-amber-400',
    },
};

function ReportDashboard() {
    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
            {/* Slow-moving colour blobs for depth */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none mix-blend-screen">
                <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] bg-danger-500/10 rounded-full blur-3xl animate-blob"></div>
                <div className="absolute top-1/3 -right-24 w-[28rem] h-[28rem] bg-fuchsia-500/10 rounded-full blur-3xl animate-blob [animation-delay:2s]"></div>
                <div className="absolute -bottom-24 left-1/4 w-[28rem] h-[28rem] bg-amber-500/10 rounded-full blur-3xl animate-blob [animation-delay:4s]"></div>
            </div>

            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            {/* Cinematic disaster-response banner */}
            <div className="relative z-10 h-36 w-full overflow-hidden sm:h-48 lg:h-56 animate-fade-in-up">
                <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/10"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/80"></div>
            </div>

            <div className="relative z-10 mx-auto -mt-12 max-w-[1600px] px-8 pb-14 sm:px-12 lg:px-16">
                <div className="mb-12 flex items-center gap-5 animate-fade-in-up">
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-danger-500 text-white shadow-lg shadow-danger-500/30">
                        <IconSiren className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">
                            Report Emergency
                        </h1>
                        <p className="mt-2 text-lg text-slate-300 md:text-xl">
                            Submit your report quickly - works offline
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {REPORT_OPTIONS.map(({ to, icon: Icon, color, title, desc, cta }, i) => {
                        const styles = COLOR_STYLES[color];
                        return (
                            <Link key={to} to={to} className="group animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                                <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05] p-8 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.08]">
                                    <div className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${styles.bar}`}></div>
                                    <div className="flex items-start gap-5">
                                        <div className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-lg transition-transform duration-300 group-hover:scale-110 ${styles.badge}`}>
                                            <Icon className="h-8 w-8" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className={`mb-2 text-xl font-bold text-white transition-colors ${styles.text}`}>
                                                {title}
                                            </h3>
                                            <p className="mb-4 text-base leading-snug text-slate-300">
                                                {desc}
                                            </p>
                                            <span className={`inline-flex items-center gap-1.5 text-base font-semibold transition-transform duration-300 group-hover:translate-x-1 ${styles.cta}`}>
                                                {cta}
                                                <IconArrowRight className="h-4 w-4" />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Important Notice */}
                <div className="mt-10 flex items-start gap-5 rounded-2xl border border-primary-400/20 bg-primary-500/10 p-7 backdrop-blur-md animate-fade-in-up [animation-delay:300ms]">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary-500/20 text-primary-300">
                        <IconCloud className="h-6 w-6" />
                    </div>
                    <div>
                        <h4 className="mb-1.5 text-lg font-bold text-white">Works Offline</h4>
                        <p className="text-base text-slate-300">
                            All forms work without internet. Your report will be saved and submitted automatically when connection is restored.
                        </p>
                    </div>
                </div>

                {/* SMS Alternative */}
                <div className="mt-6 flex items-start gap-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-7 backdrop-blur-md animate-fade-in-up [animation-delay:360ms]">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
                        <IconMessageSquare className="h-6 w-6" />
                    </div>
                    <div>
                        <h4 className="mb-1.5 text-lg font-bold text-white">Can't Use App? Send SMS</h4>
                        <p className="mb-1.5 text-base text-slate-300">
                            Text your report to: <span className="font-bold text-white">1234</span>
                        </p>
                        <p className="text-sm text-slate-400">
                            Format: MISSING [Name] [Age] [Location] OR DISASTER [Type] [Location]
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ReportDashboard;
