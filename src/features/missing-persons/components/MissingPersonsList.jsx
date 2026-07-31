import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMissingPersonStore } from '@/store';
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
import { IconSearch, IconGrid, IconMap, IconMapPin, IconClock, IconShieldLock, IconInfo, IconCheck } from '@/components/icons/Icons';

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

function MissingPersonsList({ role = 'responder' }) {
    const navigate = useNavigate();
    const { missingPersons, isInitialized, subscribeToMissingPersons } = useMissingPersonStore();
    const [statusFilter, setStatusFilter] = useState('all');
    const [districtFilter, setDistrictFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'map'

    // Subscribe to real-time updates on mount. The store's isInitialized is the
    // only trustworthy "data has arrived" signal: subscribeToMissingPersons()
    // resolves immediately when another page already opened the shared channel,
    // so a local "done awaiting" flag would drop us onto the empty state mid-fetch.
    useEffect(() => {
        if (!isInitialized) subscribeToMissingPersons();
        // Don't unsubscribe on unmount to maintain cache
    }, [isInitialized, subscribeToMissingPersons]);

    // All 25 districts in Sri Lanka (matching EmergencyContacts)
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

    const filteredPersons = missingPersons.filter(person => {
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && person.status === 'Active') ||
            (statusFilter === 'found' && person.status === 'Resolved');

        // Handle both snake_case (database) and camelCase (legacy)
        const location = person.last_seen_location || person.lastSeenLocation;
        const personDistrict = location ? getDistrictFromAddress(location.address || '') : null;
        const matchesDistrict = districtFilter === 'all' || personDistrict === districtFilter;

        const matchesSearch = (person.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (location && (location.address || '').toLowerCase().includes(searchTerm.toLowerCase()));

        return matchesStatus && matchesDistrict && matchesSearch;
    });

    const activeCount = missingPersons.filter(p => p.status === 'Active').length;
    const foundCount = missingPersons.filter(p => p.status === 'Resolved').length;

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Active':
                return { className: 'bg-danger-500/15 text-danger-300', text: 'Active' };
            case 'Resolved':
                return { className: 'bg-success-500/15 text-success-300', text: 'Found' };
            default:
                return { className: 'bg-white/10 text-slate-300', text: status };
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
            date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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

    // Records actually plotted on the map (same geo filter as the markers
    // below) - insights are derived from exactly what the user can see.
    const mappedPersons = filteredPersons.filter(p => {
        const location = p.last_seen_location || p.lastSeenLocation;
        return location && location.lat && location.lng;
    });

    const buildMapInsights = (persons) => {
        if (persons.length === 0) return { stats: [], insights: [] };

        const byDistrict = {};
        persons.forEach(p => {
            const location = p.last_seen_location || p.lastSeenLocation;
            const district = getDistrictFromAddress(location?.address || '');
            if (district) byDistrict[district] = (byDistrict[district] || 0) + 1;
        });
        const topDistrict = Object.entries(byDistrict).sort((a, b) => b[1] - a[1])[0];

        const active = persons.filter(p => p.status === 'Active');
        const found = persons.filter(p => p.status === 'Resolved');
        const oldestActive = [...active].sort((a, b) =>
            new Date(a.last_seen_date || a.lastSeenDate) - new Date(b.last_seen_date || b.lastSeenDate)
        )[0];

        const stats = [
            { icon: '📍', label: 'Most Affected Area', value: topDistrict ? topDistrict[0] : '—', detail: topDistrict ? `${topDistrict[1]} case(s) mapped` : 'no district data' },
            { icon: '🔍', label: 'Active Cases', value: active.length, detail: `of ${persons.length} mapped` },
            { icon: '✅', label: 'Found', value: found.length, detail: 'resolved' },
            { icon: '⏱️', label: 'Longest Active', value: oldestActive ? getTimeSince(oldestActive.last_seen_date || oldestActive.lastSeenDate) : '—', detail: oldestActive ? oldestActive.name : 'no active cases' },
        ];

        const insights = [];
        if (topDistrict && topDistrict[1] >= 2) {
            insights.push({ icon: '📈', tone: INSIGHT_TONE.warn, text: `${topDistrict[1]} active/mapped cases are clustered in ${topDistrict[0]} — consider concentrating search efforts there.` });
        }
        if (oldestActive) {
            insights.push({ icon: '🕒', tone: INSIGHT_TONE.danger, text: `${oldestActive.name || 'A missing person'} has been missing longest in this view — last seen ${getTimeSince(oldestActive.last_seen_date || oldestActive.lastSeenDate)}.` });
        }
        if (active.length === 0) {
            insights.push({ icon: '✅', tone: INSIGHT_TONE.ok, text: 'No active missing person cases in this view.' });
        }

        return { stats, insights };
    };

    const mapInsights = buildMapInsights(mappedPersons);

    // Show loading state while initializing
    if (!isInitialized) {
        return (
            <div className="page-shell">
                <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mb-4"></div>
                        <p className="text-slate-400">Loading missing persons data...</p>
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
                        <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5">
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium ${statusFilter === 'all'
                                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                                    : 'text-slate-300 hover:bg-white/10'
                                    }`}
                            >
                                All ({missingPersons.length})
                            </button>
                            <button
                                onClick={() => setStatusFilter('active')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium ${statusFilter === 'active'
                                    ? 'bg-danger-500 text-white shadow-md shadow-danger-500/30'
                                    : 'text-slate-300 hover:bg-white/10'
                                    }`}
                            >
                                Active ({activeCount})
                            </button>
                            <button
                                onClick={() => setStatusFilter('found')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium ${statusFilter === 'found'
                                    ? 'bg-success-500 text-white shadow-md shadow-success-500/30'
                                    : 'text-slate-300 hover:bg-white/10'
                                    }`}
                            >
                                Found ({foundCount})
                            </button>
                        </div>

                        <div className="h-5 w-px bg-white/10 mx-1 hidden sm:block" />

                        <div className="relative">
                            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search by name or location..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="text-sm bg-white/5 border border-white/15 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-lg pl-8 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500/50 w-48"
                            />
                        </div>
                        <select
                            value={districtFilter}
                            onChange={(e) => setDistrictFilter(e.target.value)}
                            className="text-sm bg-white/5 border border-white/15 text-slate-900 dark:text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                        >
                            <option value="all" className="text-slate-900">All Districts</option>
                            {allDistricts.map(district => (
                                <option key={district} value={district} className="text-slate-900">
                                    {district}
                                </option>
                            ))}
                        </select>

                        <span className="ml-auto text-xs text-slate-500">
                            {filteredPersons.length} of {missingPersons.length}
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

                {/* Card View */}
                {viewMode === 'cards' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredPersons.map((person) => (
                            <div key={person.id} className="card hover:border-white/25 hover:bg-white/[0.08]">
                                <div className="flex gap-4">
                                    {/* Photo */}
                                    {person.photo && (
                                        <div className="flex-shrink-0">
                                            <LazyImage
                                                src={person.photo}
                                                alt={person.name || 'Missing Person'}
                                                className="w-24 h-24 rounded-lg border border-white/10 bg-white/5"
                                                aspectRatio="1/1"
                                            />
                                        </div>
                                    )}

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">{person.name || 'Unknown'}</h3>
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusBadge(person.status).className}`}>
                                                {getStatusBadge(person.status).text}
                                            </span>
                                        </div>

                                        <div className="space-y-1 text-sm text-slate-400">
                                            <p><span className="font-medium text-slate-300">Age:</span> {person.age || 'N/A'} | <span className="font-medium text-slate-300">Gender:</span> {person.gender || 'N/A'}</p>
                                            <p className="flex items-start gap-1 text-xs text-slate-500 truncate" title={(person.last_seen_location || person.lastSeenLocation)?.address}>
                                                <IconMapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                                                {(person.last_seen_location || person.lastSeenLocation)?.address}
                                            </p>
                                            <p className="flex items-center gap-1 text-xs text-slate-500">
                                                <IconClock className="h-3.5 w-3.5 flex-shrink-0" />
                                                Last seen {getTimeSince(person.last_seen_date || person.lastSeenDate)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="mt-3 pt-3 border-t border-white/10">
                                    <p className="text-sm text-slate-300 line-clamp-2">{person.description}</p>
                                    {person.additionalInfo && (
                                        <p className="flex items-start gap-1 text-xs text-slate-400 mt-1 italic">
                                            <IconInfo className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                                            {person.additionalInfo}
                                        </p>
                                    )}
                                    {/* Closure summary — where the person is, never who to call. */}
                                    {(person.found_person_location || person.found_at || person.foundAt) && (
                                        <div className="mt-2 p-2 bg-success-500/10 rounded-lg">
                                            <p className="flex items-start gap-1 text-xs text-success-300 font-medium">
                                                <IconCheck className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                                                {person.found_person_location
                                                    ? `Found · now at ${person.found_person_location}`
                                                    : 'Found · case closed'}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="mt-3 flex gap-2">
                                    <button
                                        onClick={() => {
                                            const detailPath = role === 'responder'
                                                ? `/missing-persons-list/${person.id}`
                                                : `/missing-persons/${person.id}`;
                                            navigate(detailPath);
                                        }}
                                        className="flex-1 rounded-lg border-2 border-slate-900 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-900 hover:text-white dark:border-white dark:bg-transparent dark:text-white dark:hover:bg-white dark:hover:text-slate-900"
                                    >
                                        View Details
                                    </button>
                                </div>

                                {/*
                                  Reporter name and phone are withheld from this card. The reporter is
                                  reached only by the platform's automated closure SMS, so a stranger
                                  can never open with "I found her, call me and we'll discuss".
                                */}
                                <div className="mt-2 pt-2 border-t border-white/10">
                                    <p className="flex items-center gap-1 text-xs text-slate-500">
                                        <IconShieldLock className="h-3.5 w-3.5 flex-shrink-0" />
                                        Reporter contact withheld &middot; reported {formatDate(person.reported_at || person.reportedAt || person.created_at)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Map View */}
                {viewMode === 'map' && (
                    <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 items-start">
                        <div className="w-full h-[50vh] lg:h-full flex-1 min-w-0">
                            <MapFrame
                                height="100%"
                                className="rounded-xl border border-white/10"
                                resizable
                                fillWidth
                                minHeight={320}
                            >
                            <MapContainer
                                center={[7.8731, 80.7718]} // Center of Sri Lanka
                                zoom={7}
                                minZoom={7}
                                maxZoom={18}
                                maxBounds={[
                                    [5.5, 79.3],  // Southwest corner (expanded)
                                    [10.2, 82.2]   // Northeast corner (expanded)
                                ]}
                                maxBoundsViscosity={1.0}
                                style={{ height: '100%', width: '100%' }}
                                scrollWheelZoom={true}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                />

                                <MapController districtFilter={districtFilter} />
                                <MapResizeFix />

                                {/* Show district boundary when filtered */}
                                {districtFilter !== 'all' && districtBounds[districtFilter] && (
                                    <Rectangle
                                        bounds={districtBounds[districtFilter]}
                                        pathOptions={{
                                            color: '#3B82F6',
                                            weight: 3,
                                            opacity: 0.8,
                                            dashArray: '10, 10',
                                            fillColor: '#3B82F6',
                                            fillOpacity: 0.1
                                        }}
                                    />
                                )}

                                <MarkerClusterGroup
                                    chunkedLoading
                                    maxClusterRadius={30}
                                    disableClusteringAtZoom={9}
                                    spiderfyOnMaxZoom={true}
                                    showCoverageOnHover={false}
                                    zoomToBoundsOnClick={true}
                                    removeOutsideVisibleBounds={false}
                                >
                                    {filteredPersons.filter(p => {
                                        const location = p.last_seen_location || p.lastSeenLocation;
                                        return location && location.lat && location.lng;
                                    }).map((person) => {
                                        const location = person.last_seen_location || person.lastSeenLocation;
                                        const lastSeenDate = person.last_seen_date || person.lastSeenDate;

                                        // Extra safety check
                                        if (!location || !location.lat || !location.lng) {
                                            return null;
                                        }

                                        return (
                                            <Marker
                                                key={person.id}
                                                position={[location.lat, location.lng]}
                                                icon={person.status === 'Active' ? activeIcon : resolvedIcon}
                                            >
                                                <Popup maxWidth={300}>
                                                    <div className="p-2">
                                                        <div className="flex gap-3 mb-3">
                                                            <LazyImage
                                                                src={person.photo}
                                                                alt={person.name}
                                                                className="w-16 h-16 rounded"
                                                                aspectRatio="1/1"
                                                            />
                                                            <div className="flex-1">
                                                                <h3 className="font-bold text-gray-800">{person.name}</h3>
                                                                <p className="text-sm text-gray-600">Age: {person.age} | {person.gender}</p>
                                                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mt-1 ${getStatusBadge(person.status).className}`}>
                                                                    {getStatusBadge(person.status).text}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-gray-700 mb-2">{person.description}</p>
                                                        <p className="text-xs text-gray-500 mb-3">
                                                            📍 {location.address}<br />
                                                            🕒 Last seen {getTimeSince(lastSeenDate)}
                                                        </p>
                                                        {person.found_by_contact && (
                                                            <p className="text-xs text-success-600 font-medium mb-2">
                                                                ✓ Contact: {person.found_by_contact}
                                                            </p>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                const detailPath = role === 'responder'
                                                                    ? `/missing-persons-list/${person.id}`
                                                                    : `/missing-persons/${person.id}`;
                                                                navigate(detailPath);
                                                            }}
                                                            className="w-full rounded border-2 border-slate-900 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-900 hover:text-white"
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
                            {/* Warning Note */}
                            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-snug text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                                <IconInfo className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                                <span>Only missing persons with coordinates are shown. <button onClick={() => setViewMode('cards')} className="font-semibold underline">Switch to Cards</button> for all.</span>
                            </div>

                            {/* Marker color key — counts already shown in the filter tabs above */}
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 flex flex-row lg:flex-col gap-3 text-xs text-slate-300">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-danger-500 rounded-full inline-block"></span> Active</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-success-500 rounded-full inline-block"></span> Resolved</span>
                            </div>

                            <MapInsightsPanel stats={mapInsights.stats} insights={mapInsights.insights} />
                        </div>
                    </div>
                )}

                {filteredPersons.length === 0 && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-slate-400">
                        No missing persons found matching your criteria
                    </div>
                )}

                <ScrollToTop />
            </div>
        </div>
    );
}

export default MissingPersonsList;
