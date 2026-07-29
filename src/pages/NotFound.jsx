import React from 'react';
import { Link } from 'react-router-dom';
import { IconSiren, IconPhone, IconUserSearch, IconTent, IconPawPrint } from '@/components/icons/Icons';

function NotFound() {
    return (
        <div className="page-shell">
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-4">
                <div className="max-w-2xl text-center">
                    <h1 className="mb-1 text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-danger-500 via-fuchsia-500 to-purple-500 sm:text-6xl">
                        404
                    </h1>

                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-500/20 text-primary-300">
                        <IconSiren className="h-5 w-5" />
                    </div>

                    <h2 className="mb-1.5 text-xl font-bold text-slate-900 dark:text-white md:text-2xl">
                        Page Not Found
                    </h2>
                    <p className="mb-3 text-sm text-slate-300">
                        Oops! The page you're looking for doesn't exist or has been moved.
                    </p>

                    <div className="flex flex-col justify-center gap-3 sm:flex-row">
                        <Link
                            to="/"
                            className="rounded-lg bg-gradient-to-r from-danger-600 to-danger-500 px-6 py-2 font-bold text-white shadow-lg shadow-danger-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-danger-500/40"
                        >
                            Go Home
                        </Link>
                        <Link
                            to="/emergency"
                            className="rounded-lg border border-white/20 bg-white/10 px-6 py-2 font-bold text-slate-900 dark:text-white backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/20"
                        >
                            Emergency Contacts
                        </Link>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-left backdrop-blur-md">
                        <h3 className="mb-2 text-base font-bold text-slate-900 dark:text-white">
                            Quick Links
                        </h3>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <Link
                                to="/missing-persons"
                                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"
                            >
                                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-fuchsia-500/20 text-fuchsia-300">
                                    <IconUserSearch className="h-5 w-5" />
                                </span>
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-white">Missing Persons</p>
                                    <p className="text-sm text-slate-400">View reports</p>
                                </div>
                            </Link>
                            <Link
                                to="/disasters"
                                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"
                            >
                                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-danger-500/20 text-danger-300">
                                    <IconSiren className="h-5 w-5" />
                                </span>
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-white">Disaster Reports</p>
                                    <p className="text-sm text-slate-400">Check alerts</p>
                                </div>
                            </Link>
                            <Link
                                to="/camps"
                                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"
                            >
                                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                                    <IconTent className="h-5 w-5" />
                                </span>
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-white">Relief Camps</p>
                                    <p className="text-sm text-slate-400">Find shelter</p>
                                </div>
                            </Link>
                            <Link
                                to="/animal-rescue"
                                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10"
                            >
                                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-500/20 text-primary-300">
                                    <IconPawPrint className="h-5 w-5" />
                                </span>
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-white">Animal Rescue</p>
                                    <p className="text-sm text-slate-400">Report animals</p>
                                </div>
                            </Link>
                        </div>
                    </div>

                    <div className="mt-3 flex items-center justify-center gap-3 rounded-xl border border-danger-400/30 bg-danger-500/10 p-3">
                        <IconPhone className="h-5 w-5 flex-shrink-0 text-danger-300" />
                        <p className="font-semibold text-danger-200">
                            In case of emergency, call 117 (Disaster Management Centre)
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default NotFound;
