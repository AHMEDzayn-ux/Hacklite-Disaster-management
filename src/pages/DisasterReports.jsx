import React from 'react';
import DisasterReportForm from '../components/DisasterReportForm';

function DisasterReports() {
    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <div className="relative z-10 mx-auto max-w-4xl px-6 py-14 sm:px-10 lg:px-12">
                <DisasterReportForm />
            </div>
        </div>
    );
}

export default DisasterReports;
