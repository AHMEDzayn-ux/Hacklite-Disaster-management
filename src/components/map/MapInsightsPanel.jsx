import React from 'react';
import { IconInfo } from '@/components/icons/Icons';

// Fills the empty sidebar space next to a Leaflet map view with lightweight,
// client-side-derived "AI insights" - top stat tiles plus short narrative
// lines - computed from whatever records are already loaded (no external
// AI call). Shared by the Missing Persons, Disaster Reports and Animal
// Rescue map views so the three stay visually and behaviorally consistent.
//
// Nothing here truncates, clamps or caps. Labels and narrative lines wrap in
// full: this panel is the only place an operator sees the derived numbers, so
// a clipped "Most Affected Ar..." or a sentence cut at "mostly..." is worse
// than the extra height it costs to show them. The host sidebar carries
// `.scroll-panel`, so anything past the fold is scrollable, not lost.
function MapInsightsPanel({ stats = [], insights = [] }) {
    const isEmpty = stats.length === 0 && insights.length === 0;

    return (
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                <IconInfo className="h-4 w-4 flex-shrink-0 text-slate-400" />
                AI Insights
            </h4>

            {stats.length > 0 && (
                <dl className="m-0 grid grid-cols-2 gap-2 p-0">
                    {stats.map((s, i) => (
                        <div key={i} className="min-w-0 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-white/10 dark:bg-white/[0.03]">
                            <dt className="flex items-start gap-1 text-[11px] font-medium leading-tight text-slate-500 dark:text-slate-400">
                                {s.icon && <span className="flex-shrink-0" aria-hidden="true">{s.icon}</span>}
                                <span className="min-w-0 break-words">{s.label}</span>
                            </dt>
                            <dd className="mt-1 break-words text-[15px] font-semibold capitalize leading-tight text-slate-900 dark:text-white">
                                {s.value}
                            </dd>
                            {s.detail && (
                                <dd className="mt-0.5 break-words text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                                    {s.detail}
                                </dd>
                            )}
                        </div>
                    ))}
                </dl>
            )}

            {insights.length > 0 && (
                <div className="flex flex-col gap-1.5">
                    {/* The sidebar that hosts this panel scrolls (`.scroll-panel`), so
                        overflow is reachable rather than clipped - no need to drop
                        insights to make them fit. */}
                    {insights.map((ins, i) => (
                        <div key={i} className={`flex gap-1.5 rounded p-2 text-[12px] leading-snug ${ins.tone}`}>
                            <span className="flex-shrink-0" aria-hidden="true">{ins.icon}</span>
                            <span className="min-w-0">{ins.text}</span>
                        </div>
                    ))}
                </div>
            )}

            {isEmpty && (
                <p className="py-2 text-center text-xs text-slate-500 dark:text-slate-400">Not enough mapped data for insights yet.</p>
            )}
        </div>
    );
}

export default MapInsightsPanel;
