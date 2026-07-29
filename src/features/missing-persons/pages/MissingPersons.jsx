import React from 'react';
import MissingPersonForm from '@/features/missing-persons/components/MissingPersonForm';

function MissingPersons() {
    return (
        <div className="page-shell">
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-4 sm:px-8 lg:px-12">
                <div className="max-w-3xl mx-auto">
                    <MissingPersonForm />
                </div>
            </div>
        </div>
    );
}

export default MissingPersons;
