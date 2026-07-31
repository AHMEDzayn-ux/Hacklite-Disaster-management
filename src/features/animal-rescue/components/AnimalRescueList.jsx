import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnimalRescueStore } from '@/store';
import { MapContainer, TileLayer, Marker, Popup, Rectangle, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import '@/lib/leafletIconFix';
import { redIcon, greenIcon } from '@/lib/leafletIconFix';
import MapResizeFix from '@/components/map/MapResizeFix';
import MapFrame from '@/components/map/MapFrame';
import MapInsightsPanel from '@/components/map/MapInsightsPanel';
import { INSIGHT_TONE } from '@/lib/mapInsightTones';
import ScrollToTop from '@/components/ui/ScrollToTop';
import LazyImage from '@/components/ui/LazyImage';
import { IconPawPrint, IconSearch, IconGrid, IconMap, IconMapPin, IconClock, IconX, IconInfo } from '@/components/icons/Icons';
// Custom marker icons for different statuses
const activeIcon = redIcon;
const resolvedIcon = greenIcon;

// Approximate district boundaries for Sri Lanka (expanded to cover full districts)
const districtBounds = {
    'Colombo': [[6.80, 79.80], [7.15, 80.00]],
    'Gampaha': [[6.95, 79.85], [7.35, 80.10]],
    'Kalutara': [[6.45, 79.90], [6.80, 80.30]],
    'Kandy': [[7.05, 80.45], [7.55, 80.85]],
    'Matale': [[7.35, 80.45], [7.85, 80.85]],
    'Nuwara Eliya': [[6.80, 80.60], [7.15, 81.00]],
    'Galle': [[5.90, 80.05], [6.25, 80.35]],
    'Matara': [[5.80, 80.40], [6.15, 80.70]],
    'Hambantota': [[5.95, 80.85], [6.40, 81.40]],
    'Jaffna': [[9.45, 79.90], [10.00, 80.20]],
    'Kilinochchi': [[9.20, 80.20], [9.65, 80.55]],
    'Mannar': [[8.70, 79.75], [9.20, 80.15]],
    'Vavuniya': [[8.55, 80.25], [9.05, 80.70]],
    'Mullaitivu': [[9.05, 80.65], [9.55, 81.05]],
    'Batticaloa': [[7.40, 81.40], [8.00, 81.90]],
    'Ampara': [[6.95, 81.40], [7.60, 81.90]],
    'Trincomalee': [[8.30, 80.90], [8.90, 81.45]],
    'Kurunegala': [[7.25, 80.15], [7.85, 80.65]],
    'Puttalam': [[7.85, 79.70], [8.50, 80.20]],
    'Anuradhapura': [[7.95, 80.15], [8.65, 80.65]],
    'Polonnaruwa': [[7.70, 80.85], [8.30, 81.35]],
    'Badulla': [[6.70, 80.90], [7.30, 81.40]],
    'Monaragala': [[6.50, 81.10], [7.10, 81.60]],
    'Ratnapura': [[6.45, 80.15], [7.00, 80.65]],
    'Kegalle': [[6.95, 80.10], [7.50, 80.55]]
};

// Component to handle map centering when district is selected
function MapController({ districtFilter }) {
    const map = useMap();

    useEffect(() => {
        if (districtFilter !== 'all' && districtBounds[districtFilter]) {
            const bounds = districtBounds[districtFilter];
            map.fitBounds(bounds, { padding: [50, 50] });
        } else {
            // Reset to Sri Lanka view
            map.setView([7.8731, 80.7718], 7);
        }
    }, [districtFilter, map]);

    return null;
}

function AnimalRescueList({ role = 'responder' }) {
    const navigate = useNavigate();
    const { animalRescues, isInitialized, subscribeToAnimalRescues } = useAnimalRescueStore();
    const [statusFilter, setStatusFilter] = useState('all');
    const [districtFilter, setDistrictFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'map'

    // Subscribe to real-time updates on mount. The store's isInitialized is the
    // only trustworthy "data has arrived" signal: subscribeToAnimalRescues()
    // resolves immediately when another page already opened the shared channel,
    // so a local "done awaiting" flag would drop us onto the empty state mid-fetch.
    useEffect(() => {
        if (!isInitialized) subscribeToAnimalRescues();
        // Don't unsubscribe on unmount to maintain cache
    }, [isInitialized, subscribeToAnimalRescues]);

    // All 25 districts in Sri Lanka
    const allDistricts = [
        'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha',
        'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi',
        'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu',
        'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'
    ];

    // Helper function to extract district from address
    const getDistrictFromAddress = (address) => {
        const addressLower = address.toLowerCase();
        for (const district of allDistricts) {
            if (addressLower.includes(district.toLowerCase())) {
                return district;
            }
        }
        return null;
    };

    const filteredRescues = animalRescues.filter(rescue => {
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && rescue.status === 'Active') ||
            (statusFilter === 'rescued' && rescue.status === 'Resolved');
        const rescueDistrict = getDistrictFromAddress(rescue.location?.address || '');
        const matchesDistrict = districtFilter === 'all' || rescueDistrict === districtFilter;
        const matchesSearch = (rescue.animalType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (rescue.location?.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (rescue.description || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesDistrict && matchesSearch;
    });

    // Log for debugging
    console.log('Animal Rescues Data:', animalRescues);
    console.log('Total animal rescues:', animalRescues.length);
    if (animalRescues.length > 0) {
        console.log('Sample status values:', animalRescues.slice(0, 3).map(r => ({ id: r.id, status: r.status, type: typeof r.status })));
        console.log('All unique statuses:', [...new Set(animalRescues.map(r => r.status))]);
    }

    // Try multiple status value formats to handle database variations
    const activeCount = animalRescues.filter(r => {
        const status = String(r.status || '').toLowerCase();
        return status === 'active' || status === 'pending' || status === 'open';
    }).length;

    const rescuedCount = animalRescues.filter(r => {
        const status = String(r.status || '').toLowerCase();
        return status === 'resolved' || status === 'rescued' || status === 'completed' || status === 'closed';
    }).length;

    console.log('Active count:', activeCount, 'Rescued count:', rescuedCount);
    console.log('Filtered by Active status:', animalRescues.filter(r => String(r.status || '').toLowerCase() === 'active'));

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Active':
                return { className: 'bg-danger-500/15 text-danger-300', text: 'Needs Rescue' };
            case 'Resolved':
                return { className: 'bg-success-500/15 text-success-300', text: 'Rescued' };
            default:
                return { className: 'bg-white/10 text-slate-300', text: status };
        }
    };

    const getConditionBadge = (condition) => {
        switch (condition) {
            case 'critical':
                return { className: 'bg-danger-500/20 text-danger-300', text: '🚨 Critical' };
            case 'injured':
                return { className: 'bg-amber-500/20 text-amber-300', text: '🩹 Injured' };
            case 'trapped':
                return { className: 'bg-amber-500/20 text-amber-300', text: '🔒 Trapped' };
            case 'sick':
                return { className: 'bg-amber-500/15 text-amber-200', text: '🤒 Sick' };
            case 'healthy':
                return { className: 'bg-primary-500/20 text-primary-300', text: '✓ Healthy' };
            default:
                return { className: 'bg-white/10 text-slate-300', text: condition };
        }
    };

    const getAnimalTypeIcon = (animalType) => {
        const icons = {
            'dog': '🐕',
            'cat': '🐈',
            'cattle': '🐄',
            'goat': '🐐',
            'bird': '🐦',
            'wildlife': '🦎',
            'other': '🐾'
        };
        return icons[animalType] || '🐾';
    };

    const getTimeSince = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return 'Just now';
    };

    const handleRescueClick = (rescue) => {
        const route = role === 'responder' ? `/animal-rescue-list/${rescue.id}` : `/animal-rescue/${rescue.id}`;
        navigate(route);
    };

    // Records actually plotted on the map (same geo filter as the markers
    // below) - insights are derived from exactly what the user can see.
    const mappedRescues = filteredRescues.filter(r => r.location && r.location.lat && r.location.lng);

    const buildMapInsights = (rescuesOnMap) => {
        if (rescuesOnMap.length === 0) return { stats: [], insights: [] };

        const byDistrict = {};
        const byType = {};
        rescuesOnMap.forEach(r => {
            const district = getDistrictFromAddress(r.location?.address || '');
            if (district) byDistrict[district] = (byDistrict[district] || 0) + 1;
            const type = r.animalType || 'other';
            byType[type] = (byType[type] || 0) + 1;
        });
        const topDistrict = Object.entries(byDistrict).sort((a, b) => b[1] - a[1])[0];
        const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];

        const active = rescuesOnMap.filter(r => r.status === 'Active');
        const rescued = rescuesOnMap.filter(r => r.status === 'Resolved');
        const critical = active.filter(r => r.condition === 'critical' || r.condition === 'injured' || r.condition === 'trapped');

        const stats = [
            { icon: '📍', label: 'Most Affected Area', value: topDistrict ? topDistrict[0] : '—', detail: topDistrict ? `${topDistrict[1]} case(s) mapped` : 'no district data' },
            { icon: '🚨', label: 'Critical Cases', value: critical.length, detail: `of ${active.length} pending` },
            { icon: '✅', label: 'Rescued', value: rescued.length, detail: `of ${rescuesOnMap.length} mapped` },
            { icon: topType ? getAnimalTypeIcon(topType[0]) : '🐾', label: 'Top Animal Type', value: topType ? topType[0] : '—', detail: topType ? `${topType[1]} case(s)` : 'no data' },
        ];

        const insights = [];
        if (topDistrict && topDistrict[1] >= 2) {
            insights.push({ icon: '📈', tone: INSIGHT_TONE.warn, text: `${topDistrict[1]} rescue cases are clustered in ${topDistrict[0]} — the most affected area in this view.` });
        }
        if (critical.length > 0) {
            insights.push({ icon: '🚨', tone: INSIGHT_TONE.danger, text: `${critical.length} animal(s) in critical, injured or trapped condition need urgent rescue${topDistrict ? `, mostly around ${topDistrict[0]}` : ''}.` });
        }
        if (topType && topType[1] >= 2) {
            insights.push({ icon: getAnimalTypeIcon(topType[0]), tone: INSIGHT_TONE.info, text: `${getAnimalTypeIcon(topType[0])} ${topType[0]} rescues are the most common here (${topType[1]} cases).` });
        }
        if (active.length === 0) {
            insights.push({ icon: '✅', tone: INSIGHT_TONE.ok, text: 'No pending animal rescues in this view.' });
        }

        return { stats, insights };
    };

    const mapInsights = buildMapInsights(mappedRescues);

    // Show loading state while initializing
    if (!isInitialized) {
        return (
            <div className="page-shell">
                <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mb-4"></div>
                        <p className="text-slate-400">Loading animal rescue requests...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={viewMode === 'map'
            ? 'relative h-[calc(100vh-4rem)] overflow-y-auto lg:overflow-hidden bg-slate-50 font-sans dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col'
            : 'page-shell'}>
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <div className={`relative z-10 mx-auto max-w-[1600px] px-4 py-4 sm:px-8 w-full ${viewMode === 'map' ? 'flex-1 min-h-0 flex flex-col' : ''}`}>
                {/* Header + Filters — one compact row so map view keeps most of the viewport */}
                <div className="card mb-3 p-3 flex-shrink-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-1 bg-danger-500/15 text-danger-300 rounded-full font-medium text-sm">
                            {activeCount} Need{activeCount !== 1 ? '' : 's'} Rescue
                        </span>
                        <span className="text-slate-400 text-sm">{rescuedCount} rescued</span>

                        <div className="h-5 w-px bg-white/10 mx-1 hidden sm:block" />

                        <div className="relative">
                            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Animal type, location..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="text-sm bg-white/5 border border-white/15 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-lg pl-8 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500/50 w-40"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="text-sm bg-white/5 border border-white/15 text-slate-900 dark:text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                        >
                            <option value="all" className="text-slate-900">All Status</option>
                            <option value="active" className="text-slate-900">Needs Rescue</option>
                            <option value="rescued" className="text-slate-900">Rescued</option>
                        </select>
                        <select
                            value={districtFilter}
                            onChange={(e) => setDistrictFilter(e.target.value)}
                            className="text-sm bg-white/5 border border-white/15 text-slate-900 dark:text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                        >
                            <option value="all" className="text-slate-900">All Districts</option>
                            {allDistricts.map(district => (
                                <option key={district} value={district} className="text-slate-900">{district}</option>
                            ))}
                        </select>
                        {(searchTerm || statusFilter !== 'all' || districtFilter !== 'all') && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setStatusFilter('all');
                                    setDistrictFilter('all');
                                }}
                                className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 px-2 py-1.5"
                            >
                                <IconX className="h-3.5 w-3.5" />
                                Clear
                            </button>
                        )}
                        <span className="ml-auto text-xs text-slate-500">
                            {filteredRescues.length} of {animalRescues.length}
                        </span>

                        <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5">
                            <button
                                onClick={() => setViewMode('cards')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${viewMode === 'cards'
                                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                                    : 'text-slate-300 hover:bg-white/10'
                                    }`}
                            >
                                <IconGrid className="h-3.5 w-3.5" />
                                Cards
                            </button>
                            <button
                                onClick={() => setViewMode('map')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium ${viewMode === 'map'
                                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                                    : 'text-slate-300 hover:bg-white/10'
                                    }`}
                            >
                                <IconMap className="h-3.5 w-3.5" />
                                Map
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content - Cards or Map */}
                {viewMode === 'cards' ? (
                    // Card View
                    <>
                        {filteredRescues.length === 0 ? (
                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-slate-400">
                                <div className="mb-4 flex justify-center text-primary-300">
                                    <IconPawPrint className="h-12 w-12" />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Rescue Reports</h3>
                                <p className="text-slate-400">No animal rescue reports match your filters.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredRescues.map((rescue) => {
                                    const statusBadge = getStatusBadge(rescue.status);
                                    const conditionBadge = getConditionBadge(rescue.condition);
                                    const animalIcon = getAnimalTypeIcon(rescue.animalType);

                                    return (
                                        <div
                                            key={rescue.id}
                                            onClick={() => handleRescueClick(rescue)}
                                            className="card hover:border-white/25 hover:bg-white/[0.08] cursor-pointer"
                                        >
                                            <div className="flex gap-4">
                                                {/* Animal Photo */}
                                                <div className="flex-shrink-0">
                                                    <LazyImage
                                                        src={rescue.photo}
                                                        alt={rescue.animalType}
                                                        className="w-24 h-24 rounded-lg border border-white/10 bg-white/5"
                                                        aspectRatio="1/1"
                                                    />
                                                </div>

                                                {/* Animal Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white capitalize flex items-center gap-2 truncate">
                                                            <span>{animalIcon}</span>
                                                            {rescue.animalType}
                                                            {rescue.breed && <span className="text-sm font-normal text-slate-400">({rescue.breed})</span>}
                                                        </h3>
                                                        <span className={`px-2 py-1 rounded text-xs font-semibold flex-shrink-0 ${statusBadge.className}`}>
                                                            {statusBadge.text}
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${conditionBadge.className}`}>
                                                            {conditionBadge.text}
                                                        </span>
                                                        {rescue.isDangerous && (
                                                            <span className="px-2 py-1 rounded text-xs font-semibold bg-danger-500/20 text-danger-300">
                                                                ⚠️ Dangerous
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="text-sm text-slate-300 line-clamp-2">{rescue.description}</p>
                                                </div>
                                            </div>

                                            {rescue.healthDetails && (
                                                <p className="text-sm text-slate-400 italic line-clamp-2 mt-3">
                                                    {rescue.healthDetails}
                                                </p>
                                            )}

                                            <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                                                <div className="flex items-start gap-2">
                                                    <IconMapPin className="h-4 w-4 flex-shrink-0 text-slate-500 mt-0.5" />
                                                    <span className="text-sm text-slate-300 line-clamp-2">{rescue.location?.address || 'Unknown'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <IconClock className="h-4 w-4 flex-shrink-0 text-slate-500" />
                                                    <span className="text-sm text-slate-400">Reported {getTimeSince(rescue.reported_at || rescue.reportedAt || rescue.created_at)}</span>
                                                </div>
                                                {rescue.accessibility && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-slate-500 text-sm">🔧</span>
                                                        <span className="text-sm text-slate-400 capitalize">{rescue.accessibility} access</span>
                                                    </div>
                                                )}
                                            </div>

                                            <button className="btn-primary w-full mt-3">
                                                View Details
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                ) : (
                    // Map View
                    <div className="flex-1 min-h-0 flex flex-col">
                        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 items-start">
                            <div className="w-full h-[50vh] lg:h-full flex-1 min-w-0">
                                <MapFrame
                                    height="100%"
                                    className="rounded-xl border border-white/10"
                                    resizable
                                    fillWidth
                                    minHeight={260}
                                >
                                <MapContainer
                                    center={[7.8731, 80.7718]}
                                    zoom={7}
                                    style={{ height: '100%', width: '100%' }}
                                    minZoom={7}
                                    maxZoom={18}
                                    maxBounds={[[5.5, 79.3], [10.2, 82.2]]}
                                    maxBoundsViscosity={1.0}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />

                                    <MapController districtFilter={districtFilter} />
                                    <MapResizeFix />

                                    {/* District boundary overlay */}
                                    {districtFilter !== 'all' && districtBounds[districtFilter] && (
                                        <Rectangle
                                            bounds={districtBounds[districtFilter]}
                                            pathOptions={{
                                                color: '#3B82F6',
                                                weight: 3,
                                                fillOpacity: 0.1,
                                                dashArray: '10, 10'
                                            }}
                                        />
                                    )}

                                    <MarkerClusterGroup
                                        chunkedLoading
                                        maxClusterRadius={30}
                                        disableClusteringAtZoom={9}
                                        removeOutsideVisibleBounds={false}
                                    >
                                        {filteredRescues.filter(r => r.location && r.location.lat && r.location.lng).map((rescue) => {
                                            // Extra safety check
                                            if (!rescue.location || !rescue.location.lat || !rescue.location.lng) {
                                                return null;
                                            }

                                            return (
                                                <Marker
                                                    key={rescue.id}
                                                    position={[rescue.location.lat, rescue.location.lng]}
                                                    icon={rescue.status === 'Active' ? activeIcon : resolvedIcon}
                                                >
                                                    <Popup maxWidth={220} offset={[0, -10]}>
                                                        <div className="p-1">
                                                            <LazyImage
                                                                src={rescue.photo}
                                                                alt={rescue.animalType}
                                                                className="w-full h-24 rounded mb-2"
                                                                aspectRatio="16/9"
                                                            />
                                                            <h3 className="font-bold text-sm capitalize mb-1">
                                                                {getAnimalTypeIcon(rescue.animalType)} {rescue.animalType}
                                                                {rescue.breed && <span className="text-xs font-normal"> ({rescue.breed})</span>}
                                                            </h3>
                                                            <div className="mb-2">
                                                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${getStatusBadge(rescue.status).className}`}>
                                                                    {getStatusBadge(rescue.status).text}
                                                                </span>
                                                                {rescue.isDangerous && (
                                                                    <span className="inline-block px-1 py-0.5 rounded text-xs font-semibold bg-danger-600 text-white ml-1">
                                                                        ⚠️
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-600 mb-1">📍 {rescue.location.address}</p>
                                                            <p className="text-xs text-gray-600 mb-1">👤 {rescue.reporterName}</p>
                                                            <p className="text-xs text-gray-600 mb-2">☎️ {rescue.contactNumber}</p>
                                                            <button
                                                                onClick={() => handleRescueClick(rescue)}
                                                                className="btn-primary w-full text-xs py-1"
                                                            >
                                                                View Details
                                                            </button>
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            );
                                        }).filter(Boolean)}
                                    </MarkerClusterGroup>
                                </MapContainer>
                                </MapFrame>
                            </div>

                            {/* Sidebar: warning note + legend */}
                            <div className="w-full lg:w-72 lg:flex-shrink-0 flex flex-col gap-3 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:pr-1 scroll-panel">
                                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                                    <IconInfo className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                                    <span>Only requests with coordinates are shown. <button onClick={() => setViewMode('cards')} className="font-semibold underline">Switch to Cards</button> for all.</span>
                                </div>

                                {/* Marker color key — counts already shown in the filter bar above */}
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 flex flex-row lg:flex-col gap-3 text-xs text-slate-300">
                                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-danger-500 rounded-full inline-block"></span> Needs Rescue</span>
                                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-success-500 rounded-full inline-block"></span> Rescued</span>
                                    {districtFilter !== 'all' && (
                                        <span className="flex items-center gap-1.5"><span className="w-3 h-1 bg-primary-500 inline-block"></span> {districtFilter}</span>
                                    )}
                                </div>

                                <MapInsightsPanel stats={mapInsights.stats} insights={mapInsights.insights} />
                            </div>
                        </div>
                    </div>
                )}

                <ScrollToTop />
            </div>
        </div>
    );
}

export default AnimalRescueList;
