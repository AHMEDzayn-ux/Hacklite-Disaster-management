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
        badge: 'bg-danger-500',
        text: 'group-hover:text-danger-400',
        cta: 'text-danger-400',
    },
    fuchsia: {
        bar: 'from-fuchsia-500 to-purple-400',
        badge: 'bg-fuchsia-500',
        text: 'group-hover:text-fuchsia-400',
        cta: 'text-fuchsia-400',
    },
    primary: {
        bar: 'from-primary-500 to-blue-400',
        badge: 'bg-primary-500',
        text: 'group-hover:text-primary-300',
        cta: 'text-primary-300',
    },
    success: {
        bar: 'from-success-500 to-primary-400',
        badge: 'bg-success-500',
        text: 'group-hover:text-success-400',
        cta: 'text-success-400',
    },
    amber: {
        bar: 'from-amber-500 to-orange-400',
        badge: 'bg-amber-500',
        text: 'group-hover:text-amber-400',
        cta: 'text-amber-400',
    },
};

function ReportDashboard() {
    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <div className="relative z-10 mx-auto max-w-[1600px] px-6 py-8 sm:px-10 lg:px-12">
                <div className="mb-6 flex items-center gap-4 animate-fade-in-up">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-danger-500 text-white">
                        <IconSiren className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-danger-400 md:text-2xl">
                            Report Emergency
                        </h1>
                        <p className="mt-1 text-slate-300">
                            Submit your report quickly - works offline
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {REPORT_OPTIONS.map(({ to, icon: Icon, color, title, desc, cta }, i) => {
                        const styles = COLOR_STYLES[color];
                        return (
                            <Link key={to} to={to} className="group animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                                <div className="relative h-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.05] p-5 transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.08]">
                                    <div className={`absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b ${styles.bar}`}></div>
                                    <div className="flex items-start gap-4">
                                        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-white transition-transform duration-200 group-hover:scale-105 ${styles.badge}`}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className={`mb-1 text-lg font-bold text-white transition-colors ${styles.text}`}>
                                                {title}
                                            </h3>
                                            <p className="mb-3 text-sm leading-snug text-slate-300">
                                                {desc}
                                            </p>
                                            <span className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-transform duration-200 group-hover:translate-x-1 ${styles.cta}`}>
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
                <div className="mt-6 flex items-start gap-4 rounded-xl border border-primary-400/20 bg-primary-500/10 p-5 animate-fade-in-up [animation-delay:300ms]">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-500/20 text-primary-300">
                        <IconCloud className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="mb-1 font-bold text-white">Works Offline</h4>
                        <p className="text-sm text-slate-300">
                            All forms work without internet. Your report will be saved and submitted automatically when connection is restored.
                        </p>
                    </div>
                </div>

                {/* SMS Alternative */}
                <div className="mt-4 flex items-start gap-4 rounded-xl border border-amber-400/20 bg-amber-500/10 p-5 animate-fade-in-up [animation-delay:360ms]">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
                        <IconMessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="mb-1 font-bold text-white">Can't Use App? Send SMS</h4>
                        <p className="mb-1 text-sm text-slate-300">
                            Text your report to: <span className="font-bold text-white">1234</span>
                        </p>
                        
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ReportDashboard;
