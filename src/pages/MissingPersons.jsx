import React from 'react';
import MissingPersonForm from '../components/MissingPersonForm';
import { IconUserSearch } from '../components/icons/Icons';

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

            <div className="relative z-10 mx-auto max-w-3xl px-6 py-8 sm:px-8 sm:py-10">
                <div className="mb-6 flex flex-col items-center gap-3 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary-500 text-white">
                        <IconUserSearch className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-primary-400">Missing Persons</h1>
                        <p className="mt-2 text-lg text-slate-300">
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
