import React from 'react';
import MissingPersonForm from '@/features/missing-persons/components/MissingPersonForm';
import { IconUserSearch } from '@/components/icons/Icons';

function MissingPersons() {
    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-4 sm:px-8 lg:px-12">
                <div className="mb-3 flex flex-col items-center gap-2 text-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/30">
                        <IconUserSearch className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-white">Missing Persons</h1>
                        <p className="mt-0.5 text-sm text-slate-300">
                            Report missing persons to help locate them during disasters
                        </p>
                    </div>
                </div>

                <div className="max-w-3xl mx-auto">
                    <MissingPersonForm />
                </div>
            </div>
        </div>
    );
}

export default MissingPersons;
