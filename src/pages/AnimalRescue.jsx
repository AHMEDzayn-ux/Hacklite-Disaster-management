import React from 'react';
import AnimalRescueForm from '../components/AnimalRescueForm';

function AnimalRescue() {
    return (
        <div className="page-shell">
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <div className="relative z-10 mx-auto max-w-3xl px-6 py-8 sm:px-8 sm:py-10">
                <AnimalRescueForm />
            </div>
        </div>
    );
}

export default AnimalRescue;
