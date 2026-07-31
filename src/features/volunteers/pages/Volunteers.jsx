import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LocationPicker from '@/components/map/LocationPicker';
import { fetchVolunteerSuggestions, VOLUNTEER_SKILLS } from '@/features/volunteers/services/volunteerService';
import { SRI_LANKA_DISTRICTS } from '@/features/camps/services/campManagementService';
import { IconSearch, IconMapPin, IconPhone, IconInfo, IconChevronRight } from '@/components/icons/Icons';

const SKILL_LABELS = {
    rescue: '🚑 Rescue', medical: '⚕️ Medical', logistics: '📦 Logistics',
    driving: '🚗 Driving', first_aid: '🩹 First Aid', construction: '🏗️ Construction',
    counseling: '💬 Counseling', missing_person_search: '🔍 Missing Person Search',
    house_clearing: '🏚️ House Clearing / Debris', boat_service: '🚤 Boat / Water Rescue',
};

// Explicit light/dark pairs rather than the dark-only *-300 shades used
// elsewhere - these badges sit on a near-white card in light mode, where a
// 300-weight foreground is far too pale to read.
const URGENCY_STYLES = {
    critical: 'bg-danger-500/15 text-danger-700 dark:text-danger-300',
    high: 'bg-danger-500/15 text-danger-700 dark:text-danger-300',
    moderate: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    normal: 'bg-primary-500/15 text-primary-700 dark:text-primary-300',
    low: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
    unknown: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
};

const TASK_TYPE_LABEL = { disaster: 'Disaster', missing_person: 'Missing Person', animal_rescue: 'Animal Rescue' };

const DETAIL_ROUTE = {
    disaster: '/disasters-list',
    missing_person: '/missing-persons-list',
    animal_rescue: '/animal-rescue-list',
};

// Sub-kilometre precision reads as false accuracy on a straight-line
// estimate, so collapse it rather than printing "~0.5km".
const formatDistance = (km) => {
    const n = Number(km);
    if (!Number.isFinite(n)) return null;
    if (n < 1) return 'under 1 km away';
    return `~${n < 10 ? n.toFixed(1) : Math.round(n)} km away`;
};

function Volunteers() {
    const navigate = useNavigate();
    const [skills, setSkills] = useState([]);
    const [customSkill, setCustomSkill] = useState('');
    const [groupSize, setGroupSize] = useState(1);
    const [district, setDistrict] = useState('');
    const [location, setLocation] = useState(null);
    const [suggestions, setSuggestions] = useState(null); // null = not searched yet
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const toggleSkill = (skill) => {
        setSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (skills.length === 0) { setError('Pick at least one thing you can help with.'); return; }

        setLoading(true);
        setError('');
        const result = await fetchVolunteerSuggestions({ skills, customSkill, groupSize, district: district || null, location });
        setLoading(false);
        if (result.success) setSuggestions(result.suggestions);
        else setError(result.error || 'Could not load suggestions');
    };

    return (
        <div className="page-shell">
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <div className="relative z-10 mx-auto max-w-6xl px-4 py-4 sm:px-8">
                <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">
                    No sign-up needed. Tell us what you can help with and an AI agent will suggest open cases where
                    you'd genuinely be useful — then reach out directly if you want to. Nothing is saved, and you're
                    never committed to anything.
                </p>

                {error && (
                    <div className="mb-4 rounded-lg border border-danger-400/30 bg-danger-500/10 p-3 text-sm text-danger-700 dark:text-danger-300">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <form onSubmit={handleSubmit} className="card space-y-4">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">What can you help with?</h2>

                        <div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {VOLUNTEER_SKILLS.map(skill => (
                                    <label
                                        key={skill}
                                        className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer text-sm ${skills.includes(skill)
                                            ? 'bg-primary-500/15 border-primary-400/40 font-medium text-primary-800 dark:text-primary-200'
                                            : 'border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10'
                                            }`}
                                    >
                                        <input type="checkbox" checked={skills.includes(skill)} onChange={() => toggleSkill(skill)} className="w-4 h-4" />
                                        {SKILL_LABELS[skill] || skill}
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                                Only pick what you're genuinely equipped for — this filters out cases you shouldn't be
                                sent into. Hazardous work (flood/fire rescue, dangerous animals, hazardous-terrain
                                searches) is only ever suggested to people who selected Rescue, Medical, or Boat/Water Rescue.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">People you can bring</label>
                                <input
                                    type="number" min="1" value={groupSize}
                                    onChange={(e) => setGroupSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                    className="input-field"
                                />
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Include yourself.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">District</label>
                                <select value={district} onChange={(e) => setDistrict(e.target.value)} className="input-field">
                                    <option value="" className="text-slate-900">Select District</option>
                                    {SRI_LANKA_DISTRICTS.map(d => <option key={d} value={d} className="text-slate-900">{d}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">Anything else you can offer? (optional)</label>
                            <input
                                type="text" value={customSkill} onChange={(e) => setCustomSkill(e.target.value)}
                                className="input-field" placeholder="e.g. cooking for a relief camp, translation, a van"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">Where are you? (optional)</label>
                            <LocationPicker value={location} onChange={setLocation} label="" />
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Helps us suggest the closest cases first.</p>
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
                            {loading ? 'Finding cases...' : suggestions === null ? 'Show me where I can help' : 'Update suggestions'}
                        </button>
                    </form>

                    <div className="card">
                        <h2 className="flex items-center gap-1.5 text-lg font-bold text-slate-900 dark:text-white mb-3">
                            <IconSearch className="h-4 w-4 text-primary-600 dark:text-primary-300" />
                            Where you could help
                        </h2>

                        {suggestions === null && !loading && (
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                Fill in what you can do and we'll suggest open cases that fit — ranked by how much
                                difference you'd make, and filtered so nothing unsafe for you ever appears.
                            </p>
                        )}
                        {suggestions !== null && suggestions.length === 0 && !loading && (
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                No open cases currently match what you can safely help with. Please check back later.
                            </p>
                        )}

                        <div className="space-y-3">
                            {(suggestions || []).map(s => {
                                const place = s.address || s.district;
                                const distance = s.distance_km != null ? formatDistance(s.distance_km) : null;
                                const detailPath = `${DETAIL_ROUTE[s.task_type]}/${s.task_ref_id}`;
                                return (
                                    <div
                                        key={`${s.task_type}:${s.task_ref_id}`}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => navigate(detailPath)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(detailPath); }
                                        }}
                                        className="w-full text-left rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 cursor-pointer transition-colors hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
                                    >
                                        <div className="flex justify-between items-start gap-2 mb-1">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-900 dark:text-white truncate">{s.title}</p>
                                                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{TASK_TYPE_LABEL[s.task_type] || s.task_type}</p>
                                            </div>
                                            <span className={`flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full capitalize ${URGENCY_STYLES[s.urgency] || URGENCY_STYLES.normal}`}>
                                                {s.urgency}
                                            </span>
                                        </div>

                                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-2 line-clamp-2">{s.subtitle}</p>

                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400 mb-2">
                                            <span className="flex items-center gap-1 min-w-0">
                                                <IconMapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                                <span className="truncate">{place || 'Location not pinned'}</span>
                                            </span>
                                            {distance
                                                ? <span>{distance}</span>
                                                : <span className="italic">distance unknown</span>}
                                        </div>

                                        {s.matched_skill && (
                                            <p className="text-xs font-medium text-primary-700 dark:text-primary-300 mb-2">
                                                Matches your {SKILL_LABELS[s.matched_skill] || s.matched_skill}
                                            </p>
                                        )}

                                        {s.reason && (
                                            <div className="flex gap-1.5 text-xs text-primary-900 dark:text-primary-200 bg-primary-100 dark:bg-primary-500/10 rounded-md p-2 mb-2">
                                                <IconInfo className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                                                <span>{s.reason}</span>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            {s.contact_phone ? (
                                                <a
                                                    href={`tel:${s.contact_phone}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-primary-700 dark:hover:text-primary-300 underline"
                                                >
                                                    <IconPhone className="h-3.5 w-3.5 flex-shrink-0" />
                                                    {s.contact_name || 'Reporter'} · {s.contact_phone}
                                                </a>
                                            ) : <span />}
                                            <span className="flex items-center gap-0.5 text-xs font-semibold text-primary-700 dark:text-primary-300">
                                                View full report
                                                <IconChevronRight className="h-3.5 w-3.5" />
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Volunteers;
