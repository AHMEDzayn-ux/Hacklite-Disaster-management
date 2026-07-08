import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMissingPersonStore, useDisasterStore, useAnimalRescueStore, useCampStore } from '../store';
import DisasterReportsList from '../components/DisasterReportsList';
import MissingPersonsList from '../components/MissingPersonsList';
import AnimalRescueList from '../components/AnimalRescueList';
import CampsList from '../components/CampsList';

const ALL_DISTRICTS = [
    'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha',
    'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi',
    'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu',
    'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'
];

const districtFromAddress = (address) => {
    if (!address) return null;
    const lower = address.toLowerCase();
    for (const district of ALL_DISTRICTS) {
        if (lower.includes(district.toLowerCase())) return district;
    }
    return null;
};

const hoursSince = (dateString) => {
    if (!dateString) return null;
    return (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60);
};

const TABS = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'disasters', label: 'Disasters', icon: '🚨' },
    { key: 'missing', label: 'Missing Persons', icon: '🔍' },
    { key: 'animals', label: 'Animal Rescues', icon: '🐾' },
    { key: 'camps', label: 'Camps', icon: '⛺' },
];

function StatCard({ value, label, sublabel, color }) {
    return (
        <div className={`card border-l-4 ${color}`}>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
            <p className="text-sm font-medium text-gray-700 mt-1">{label}</p>
            {sublabel && <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>}
        </div>
    );
}

function SeverityBar({ label, count, max, colorClass }) {
    const pct = max > 0 ? Math.round((count / max) * 100) : 0;
    return (
        <div className="flex items-center gap-3">
            <span className="w-20 text-xs font-medium text-gray-600">{label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-6 text-xs font-semibold text-gray-700 text-right">{count}</span>
        </div>
    );
}

function OverviewTab({ disasters, missingPersons, animalRescues, camps, loading, setActiveTab }) {
    const navigate = useNavigate();

    const insights = useMemo(() => {
        const activeDisasters = disasters.filter(d => d.status === 'Active');
        const activeMissing = missingPersons.filter(p => p.status === 'Active');
        const activeAnimals = animalRescues.filter(a => a.status === 'Active');
        const activeCamps = camps.filter(c => c.status === 'Active' || c.status === 'active');

        const severityCounts = { critical: 0, high: 0, moderate: 0, low: 0 };
        activeDisasters.forEach(d => { if (severityCounts[d.severity] !== undefined) severityCounts[d.severity]++; });
        const maxSeverity = Math.max(1, ...Object.values(severityCounts));

        const totalCapacity = activeCamps.reduce((sum, c) => sum + (c.capacity || 0), 0);
        const totalOccupancy = activeCamps.reduce((sum, c) => sum + (c.current_occupancy || 0), 0);
        const occupancyPct = totalCapacity > 0 ? Math.round((totalOccupancy / totalCapacity) * 100) : 0;
        const nearFullCamps = activeCamps
            .filter(c => c.capacity > 0 && (c.current_occupancy / c.capacity) >= 0.85)
            .sort((a, b) => (b.current_occupancy / b.capacity) - (a.current_occupancy / a.capacity));

        // District hotspots: combined active-report count per district.
        const districtCounts = {};
        const bump = (address, camp = false, districtDirect = null) => {
            const d = districtDirect || districtFromAddress(address);
            if (!d) return;
            districtCounts[d] = (districtCounts[d] || 0) + 1;
        };
        activeDisasters.forEach(d => bump(d.location?.address));
        activeMissing.forEach(p => bump(p.last_seen_location?.address));
        activeAnimals.forEach(a => bump(a.location?.address));
        const hotspots = Object.entries(districtCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

        // 24h trend across all report types.
        const allReports = [
            ...disasters.map(d => ({ created_at: d.created_at })),
            ...missingPersons.map(p => ({ created_at: p.created_at })),
            ...animalRescues.map(a => ({ created_at: a.created_at })),
        ];
        const last24h = allReports.filter(r => { const h = hoursSince(r.created_at); return h !== null && h <= 24; }).length;
        const prev24h = allReports.filter(r => { const h = hoursSince(r.created_at); return h !== null && h > 24 && h <= 48; }).length;
        const trendPct = prev24h > 0 ? Math.round(((last24h - prev24h) / prev24h) * 100) : (last24h > 0 ? 100 : 0);
        const trendDirection = trendPct > 10 ? 'rising' : trendPct < -10 ? 'falling' : 'steady';

        // Unified "needs attention" feed: critical/high disasters + longest-outstanding missing persons.
        const urgentDisasters = activeDisasters
            .filter(d => d.severity === 'critical' || d.severity === 'high')
            .sort((a, b) => (a.severity === 'critical' ? -1 : 1) - (b.severity === 'critical' ? -1 : 1) || new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 4)
            .map(d => ({
                id: d.id, kind: 'disaster', icon: d.severity === 'critical' ? '🚨' : '⚠️',
                title: `${(d.disaster_type || 'Disaster').replace('-', ' ')} — ${d.severity}`,
                subtitle: d.location?.address || 'Location unknown',
                meta: hoursSince(d.created_at) != null ? `${Math.round(hoursSince(d.created_at))}h ago` : '',
                link: '/disasters-list/' + d.id,
            }));

        const longestMissing = [...activeMissing]
            .sort((a, b) => new Date(a.last_seen_date || a.created_at) - new Date(b.last_seen_date || b.created_at))
            .slice(0, 3)
            .map(p => {
                const h = hoursSince(p.last_seen_date || p.created_at);
                return {
                    id: p.id, kind: 'missing', icon: '🔍',
                    title: `${p.name || 'Missing person'}, age ${p.age ?? '?'}`,
                    subtitle: p.last_seen_location?.address || 'Location unknown',
                    meta: h != null ? (h >= 24 ? `${Math.floor(h / 24)}d missing` : `${Math.round(h)}h missing`) : '',
                    link: '/missing-persons-list/' + p.id,
                };
            });

        const urgentFeed = [...urgentDisasters, ...longestMissing];

        return {
            activeDisastersCount: activeDisasters.length,
            criticalCount: severityCounts.critical,
            activeMissingCount: activeMissing.length,
            activeAnimalsCount: activeAnimals.length,
            resolvedTodayCount: [...disasters, ...missingPersons, ...animalRescues]
                .filter(r => {
                    if (r.status !== 'Resolved') return false;
                    // Prefer the domain-specific resolution timestamp over the
                    // generic updated_at, which can be stale/misleading (e.g.
                    // bulk-imported historical records all sharing one insert time).
                    const h = hoursSince(r.found_at || r.resolved_at || r.updated_at);
                    return h !== null && h <= 24;
                }).length,
            severityCounts, maxSeverity,
            occupancyPct, totalCapacity, totalOccupancy, nearFullCamps, activeCampsCount: activeCamps.length,
            hotspots, last24h, prev24h, trendPct, trendDirection,
            urgentFeed,
        };
    }, [disasters, missingPersons, animalRescues, camps]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[300px]">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-primary-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard value={insights.activeDisastersCount} label="Active Disasters" sublabel={`${insights.criticalCount} critical`} color="border-orange-500" />
                <StatCard value={insights.activeMissingCount} label="Missing Persons" sublabel="currently active" color="border-danger-500" />
                <StatCard value={insights.activeAnimalsCount} label="Animal Rescues" sublabel="pending" color="border-blue-500" />
                <StatCard value={`${insights.occupancyPct}%`} label="Camp Occupancy" sublabel={`${insights.totalOccupancy}/${insights.totalCapacity} across ${insights.activeCampsCount} camps`} color="border-primary-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Severity breakdown */}
                <div className="card">
                    <h3 className="font-bold text-gray-800 mb-4">Disaster Severity Breakdown (Active)</h3>
                    <div className="space-y-3">
                        <SeverityBar label="Critical" count={insights.severityCounts.critical} max={insights.maxSeverity} colorClass="bg-danger-600" />
                        <SeverityBar label="High" count={insights.severityCounts.high} max={insights.maxSeverity} colorClass="bg-danger-400" />
                        <SeverityBar label="Moderate" count={insights.severityCounts.moderate} max={insights.maxSeverity} colorClass="bg-warning-500" />
                        <SeverityBar label="Low" count={insights.severityCounts.low} max={insights.maxSeverity} colorClass="bg-info-400" />
                    </div>

                    <h3 className="font-bold text-gray-800 mt-6 mb-3">District Hotspots</h3>
                    {insights.hotspots.length === 0 ? (
                        <p className="text-sm text-gray-500">No active reports to map to a district yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {insights.hotspots.map(([district, count], i) => (
                                <div key={district} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-700">{i + 1}. {district}</span>
                                    <span className="font-semibold text-gray-800">{count} active report{count === 1 ? '' : 's'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Trend + camps */}
                <div className="card">
                    <h3 className="font-bold text-gray-800 mb-2">24-Hour Trend</h3>
                    <div className="flex items-center gap-3 mb-4">
                        <span className={`text-2xl font-bold ${insights.trendDirection === 'rising' ? 'text-danger-600' : insights.trendDirection === 'falling' ? 'text-success-600' : 'text-gray-600'}`}>
                            {insights.trendDirection === 'rising' ? '📈' : insights.trendDirection === 'falling' ? '📉' : '➖'} {insights.last24h}
                        </span>
                        <span className="text-sm text-gray-600">
                            new reports in the last 24h ({insights.prev24h} in the 24h before) — trend is <strong>{insights.trendDirection}</strong>
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{insights.resolvedTodayCount} case{insights.resolvedTodayCount === 1 ? '' : 's'} resolved in the last 24 hours.</p>

                    <h3 className="font-bold text-gray-800 mb-3">Camps Near Capacity</h3>
                    {insights.nearFullCamps.length === 0 ? (
                        <p className="text-sm text-gray-500">No camps are currently above 85% occupancy.</p>
                    ) : (
                        <div className="space-y-2">
                            {insights.nearFullCamps.slice(0, 5).map(c => (
                                <div key={c.id} className="flex items-center justify-between text-sm cursor-pointer hover:text-primary-600" onClick={() => navigate(`/camps/${c.id}`)}>
                                    <span className="text-gray-700">{c.name}</span>
                                    <span className="font-semibold text-danger-600">{c.current_occupancy}/{c.capacity} ({Math.round(100 * c.current_occupancy / c.capacity)}%)</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Needs attention feed */}
            <div className="card">
                <h3 className="font-bold text-gray-800 mb-4">⚡ Needs Immediate Attention</h3>
                {insights.urgentFeed.length === 0 ? (
                    <p className="text-sm text-gray-500">Nothing urgent right now — no critical/high-severity disasters or long-outstanding missing person cases.</p>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {insights.urgentFeed.map(item => (
                            <div key={`${item.kind}-${item.id}`} onClick={() => navigate(item.link)} className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-50 px-2 rounded">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 capitalize truncate">{item.title}</p>
                                        <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
                                    </div>
                                </div>
                                <span className="text-xs font-medium text-gray-500 flex-shrink-0">{item.meta}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick actions */}
            <div className="card">
                <h3 className="font-bold text-gray-800 mb-3">Other Ways to Help</h3>
                <div className="flex flex-wrap gap-3">
                    <Link to="/volunteers" className="px-4 py-2 bg-success-50 text-success-700 rounded-lg text-sm font-semibold hover:bg-success-100">🙋 Register as Volunteer</Link>
                    <Link to="/donations" className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-100">💰 Make a Donation</Link>
                    <Link to="/request-camp" className="px-4 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-semibold hover:bg-primary-100">⛺ Request a Relief Camp</Link>
                    <button onClick={() => setActiveTab('camps')} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200">📋 Browse Relief Camps</button>
                </div>
            </div>
        </div>
    );
}

function RespondDashboard() {
    const [activeTab, setActiveTab] = useState('overview');

    const { missingPersons, isInitialized: mpInit, subscribeToMissingPersons } = useMissingPersonStore();
    const { disasters, isInitialized: dInit, subscribeToDisasters } = useDisasterStore();
    const { animalRescues, isInitialized: arInit, subscribeToAnimalRescues } = useAnimalRescueStore();
    const { camps, isInitialized: cInit, subscribeToCamps } = useCampStore();

    useEffect(() => {
        // Eagerly subscribe to everything so Overview has real numbers
        // immediately, without waiting for each tab to be opened once.
        if (!mpInit) subscribeToMissingPersons();
        if (!dInit) subscribeToDisasters();
        if (!arInit) subscribeToAnimalRescues();
        if (!cInit) subscribeToCamps();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loading = !mpInit || !dInit || !arInit || !cInit;

    const tabCounts = {
        disasters: disasters.filter(d => d.status === 'Active').length,
        missing: missingPersons.filter(p => p.status === 'Active').length,
        animals: animalRescues.filter(a => a.status === 'Active').length,
        camps: camps.filter(c => c.status === 'Active' || c.status === 'active').length,
    };

    return (
        <div className="px-4 py-3">
            <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-800 mb-1">Respond & Help</h1>
                <p className="text-gray-600 text-sm">Live summary of all active reports — switch tabs for full details on each category</p>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-5 border-b border-gray-200 pb-3">
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === tab.key
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                        {tab.key !== 'overview' && (
                            <span className={`text-xs font-bold rounded-full px-1.5 ${activeTab === tab.key ? 'bg-white/20' : 'bg-gray-100 text-gray-600'}`}>
                                {tabCounts[tab.key]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <OverviewTab
                    disasters={disasters}
                    missingPersons={missingPersons}
                    animalRescues={animalRescues}
                    camps={camps}
                    loading={loading}
                    setActiveTab={setActiveTab}
                />
            )}
            {activeTab === 'disasters' && <DisasterReportsList role="responder" />}
            {activeTab === 'missing' && <MissingPersonsList role="responder" />}
            {activeTab === 'animals' && <AnimalRescueList role="responder" />}
            {activeTab === 'camps' && <CampsList role="responder" />}
        </div>
    );
}

export default RespondDashboard;
