import React from 'react';
import { IconGrid, IconMap } from '../icons/Icons';

function ViewModeToggle({ viewMode, setViewMode }) {
    return (
        <div className="flex gap-2">
            <button
                onClick={() => setViewMode('cards')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${viewMode === 'cards'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                    }`}
            >
                <IconGrid className="w-4 h-4" />
                Card View
            </button>
            <button
                onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${viewMode === 'map'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                    }`}
            >
                <IconMap className="w-4 h-4" />
                Map View
            </button>
        </div>
    );
}

export default ViewModeToggle;
