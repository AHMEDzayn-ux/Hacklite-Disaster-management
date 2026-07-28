import React from 'react';
import { IconTent } from '../components/icons/Icons';

function CampManagement() {
    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
                <div className="mb-6 flex items-center gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
                        <IconTent className="h-6 w-6" />
                    </div>
                    <h1 className="text-3xl font-bold text-white">Camp Management</h1>
                </div>
                <div className="card">
                    <p className="text-slate-400">Relief camp management system - Coming soon</p>
                </div>
            </div>
        </div>
    );
}

export default CampManagement;
