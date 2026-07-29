import React from 'react';
import { IconTent } from '../components/icons/Icons';

function CampManagement() {
    return (
        <div className="page-shell">
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
                <div className="mb-6 flex items-center gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-300">
                        <IconTent className="h-6 w-6" />
                    </div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">Camp Management</h1>
                </div>
                <div className="card">
                    <p className="text-slate-400">Relief camp management system - Coming soon</p>
                </div>
            </div>
        </div>
    );
}

export default CampManagement;
