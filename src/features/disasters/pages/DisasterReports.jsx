import React from 'react';
import DisasterReportForm from '@/features/disasters/components/DisasterReportForm';

function DisasterReports() {
    return (
        <div className="page-shell">
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <div className="relative z-10 mx-auto max-w-4xl px-4 py-4 sm:px-8 lg:px-10">
                <DisasterReportForm />
            </div>
        </div>
    );
}

export default DisasterReports;
