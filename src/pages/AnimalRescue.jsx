import React from 'react';
import AnimalRescueForm from '../components/AnimalRescueForm';

function AnimalRescue() {
    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <div className="relative z-10 mx-auto max-w-[1600px] px-8 py-14 sm:px-12 lg:px-16">
                <AnimalRescueForm />
            </div>
        </div>
    );
}

export default AnimalRescue;
