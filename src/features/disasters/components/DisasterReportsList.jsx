import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDisasterStore } from '@/store';
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
import { IconSearch, IconGrid, IconMap, IconMapPin, IconUsers, IconX, IconInfo } from '@/components/icons/Icons';

// Custom marker icons for different statuses
const activeIcon = redIcon;
const resolvedIcon = greenIcon;

// District boundaries
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

function MapController({ districtFilter }) {
    const map = useMap();

    useEffect(() => {
        if (districtFilter !== 'all' && districtBounds[districtFilter]) {
            const bounds = districtBounds[districtFilter];
            map.fitBounds(bounds, { padding: [50, 50] });
        } else {
            map.setView([7.8731, 80.7718], 7);
        }
    }, [districtFilter, map]);

    return null;
}

function DisasterReportsList({ role = 'responder' }) {
    const navigate = useNavigate();
    const { disasters, isInitialized, subscribeToDisasters } = useDisasterStore();
    const [statusFilter, setStatusFilter] = useState('all');
    const [districtFilter, setDistrictFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('cards');
    const [isInitializing, setIsInitializing] = useState(!isInitialized);

    // Subscribe to real-time updates on mount
    useEffect(() => {
        if (!isInitialized) {
            const initialize = async () => {
                await subscribeToDisasters();
                setIsInitializing(false);
            };
            initialize();
        }
        // Already initialized: isInitializing was seeded to !isInitialized,
        // so it is already false here - nothing to do.
        // Don't unsubscribe on unmount to maintain cache
    }, []);

    const allDistricts = [
        'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha',
        'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi',
        'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu',
        'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'
    ];

    const getDistrictFromAddress = (address) => {
        const addressLower = address.toLowerCase();
        for (const district of allDistricts) {
            if (addressLower.includes(district.toLowerCase())) {
                return district;
            }
        }
        return null;
    };

    const filteredDisasters = disasters.filter(disaster => {
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && disaster.status === 'Active') ||
            (statusFilter === 'resolved' && disaster.status === 'Resolved');
        const disasterDistrict = getDistrictFromAddress(disaster.location?.address || '');
        const matchesDistrict = districtFilter === 'all' || disasterDistrict === districtFilter;
        const disasterType = disaster.disaster_type || disaster.disasterType;
        const matchesType = typeFilter === 'all' || disasterType === typeFilter;
        const matchesSeverity = severityFilter === 'all' || disaster.severity === severityFilter;
        const matchesSearch = (disaster.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (disaster.location?.address || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesDistrict && matchesType && matchesSeverity && matchesSearch;
    });

    const activeCount = disasters.filter(d => d.status === 'Active').length;
    const resolvedCount = disasters.filter(d => d.status === 'Resolved').length;
    const criticalCount = disasters.filter(d => d.status === 'Active' && d.severity === 'critical').length;

    const getDisasterIcon = (type) => {
        const icons = {
            'flood': '🌊',
            'landslide': '⛰️',
            'fire': '🔥',
            'earthquake': '🌍',
            'cyclone': '🌀',
            'drought': '🌵',
            'tsunami': '🌊',
            'building-collapse': '🏚️',
            'other': '⚠️'
        };
        return icons[type] || '⚠️';
    };

    const getSeverityBadge = (severity) => {
        const badges = {
            'critical': { className: 'bg-danger-500/20 text-danger-300', text: '🚨 Critical' },
            'high': { className: 'bg-danger-500/15 text-danger-300', text: '⚠️ High' },
            'moderate': { className: 'bg-amber-500/20 text-amber-300', text: '⚡ Moderate' },
            'low': { className: 'bg-primary-500/20 text-primary-300', text: 'ℹ️ Low' }
        };
        return badges[severity] || badges.low;
    };

    const getStatusBadge = (status) => {
        return status === 'Active'
            ? { className: 'bg-danger-500/15 text-danger-300', text: 'Active' }
            : { className: 'bg-success-500/15 text-success-300', text: 'Resolved' };
    };

    const getTimeSince = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) return `${diffDays}d ago`;
        if (diffHours > 0) return `${diffHours}h ago`;
        return 'Just now';
    };

    // Records actually plotted on the map (same geo filter as the markers
    // below) - insights are derived from exactly what the user can see.
    const mappedDisasters = filteredDisasters.filter(d => d.location && d.location.lat && d.location.lng);

    const buildMapInsights = (disastersOnMap) => {
        if (disastersOnMap.length === 0) return { stats: [], insights: [] };

        const byDistrict = {};
        const byType = {};
        disastersOnMap.forEach(d => {
            const district = getDistrictFromAddress(d.location?.address || '');
            if (district) byDistrict[district] = (byDistrict[district] || 0) + 1;
            const type = d.disaster_type || d.disasterType || 'other';
            byType[type] = (byType[type] || 0) + 1;
        });
        const topDistrict = Object.entries(byDistrict).sort((a, b) => b[1] - a[1])[0];
        const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];

        const active = disastersOnMap.filter(d => d.status === 'Active');
        const critical = active.filter(d => d.severity === 'critical' || d.severity === 'high');
        const resolved = disastersOnMap.filter(d => d.status === 'Resolved');

        const stats = [
            { icon: '📍', label: 'Most Affected Area', value: topDistrict ? topDistrict[0] : '—', detail: topDistrict ? `${topDistrict[1]} report(s) mapped` : 'no district data' },
            { icon: '🚨', label: 'Critical/High', value: critical.length, detail: `of ${active.length} active` },
            { icon: '✅', label: 'Resolved', value: resolved.length, detail: `of ${disastersOnMap.length} mapped` },
            { icon: topType ? getDisasterIcon(topType[0]) : '⚠️', label: 'Top Disaster Type', value: topType ? topType[0].replace('-', ' ') : '—', detail: topType ? `${topType[1]} report(s)` : 'no data' },
        ];

        const insights = [];
        if (topDistrict && topDistrict[1] >= 2) {
            insights.push({ icon: '📈', tone: INSIGHT_TONE.warn, text: `${topDistrict[1]} reports are clustered in ${topDistrict[0]} — the most affected area in this view.` });
        }
        if (critical.length > 0) {
            insights.push({ icon: '🚨', tone: INSIGHT_TONE.danger, text: `${critical.length} critical/high severity disaster(s) need immediate attention${topDistrict ? `, mostly around ${topDistrict[0]}` : ''}.` });
        }
        if (topType && topType[1] >= 2) {
            insights.push({ icon: getDisasterIcon(topType[0]), tone: INSIGHT_TONE.info, text: `${getDisasterIcon(topType[0])} ${topType[0].replace('-', ' ')} is the most-reported disaster type here (${topType[1]} reports).` });
        }
        if (active.length === 0) {
            insights.push({ icon: '✅', tone: INSIGHT_TONE.ok, text: 'No active disasters in this view.' });
        }

        return { stats, insights };
    };

    const mapInsights = buildMapInsights(mappedDisasters);

    const handleDisasterClick = (disaster) => {
        const route = role === 'responder' ? `/disasters-list/${disaster.id}` : `/disasters/${disaster.id}`;
        navigate(route);
    };

    // Show loading state while initializing
    if (isInitializing) {
        return (
            <div className="page-shell">
                <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mb-4"></div>
                        <p className="text-slate-400">Loading disaster reports...</p>
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
                            {activeCount} Active
                        </span>
                        <span className="text-slate-400 text-sm">
                            {criticalCount} critical &middot; {resolvedCount} resolved
                        </span>

                        <div className="h-5 w-px bg-white/10 mx-1 hidden sm:block" />

                        <div className="relative">
                            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Location, description..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="text-sm bg-white/5 border border-white/15 text-slate-900 dark:text-white placeholder:text-slate-400 rounded-lg pl-8 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500/50 w-40"
                            />
                        </div>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-sm bg-white/5 border border-white/15 text-slate-900 dark:text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500/50">
                            <option value="all" className="text-slate-900">All Status</option>
                            <option value="active" className="text-slate-900">Active</option>
                            <option value="resolved" className="text-slate-900">Resolved</option>
                        </select>
                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="text-sm bg-white/5 border border-white/15 text-slate-900 dark:text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500/50">
                            <option value="all" className="text-slate-900">All Types</option>
                            <option value="flood" className="text-slate-900">Flood</option>
                            <option value="landslide" className="text-slate-900">Landslide</option>
                            <option value="fire" className="text-slate-900">Fire</option>
                            <option value="cyclone" className="text-slate-900">Cyclone</option>
                            <option value="earthquake" className="text-slate-900">Earthquake</option>
                            <option value="drought" className="text-slate-900">Drought</option>
                        </select>
                        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="text-sm bg-white/5 border border-white/15 text-slate-900 dark:text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500/50">
                            <option value="all" className="text-slate-900">All Severities</option>
                            <option value="critical" className="text-slate-900">Critical</option>
                            <option value="high" className="text-slate-900">High</option>
                            <option value="moderate" className="text-slate-900">Moderate</option>
                            <option value="low" className="text-slate-900">Low</option>
                        </select>
                        {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || severityFilter !== 'all' || districtFilter !== 'all') && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setStatusFilter('all');
                                    setTypeFilter('all');
                                    setSeverityFilter('all');
                                    setDistrictFilter('all');
                                }}
                                className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 px-2 py-1.5"
                            >
                                <IconX className="h-3.5 w-3.5" />
                                Clear
                            </button>
                        )}
                        <span className="ml-auto text-xs text-slate-500">
                            {filteredDisasters.length} of {disasters.length}
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

                {/* Content */}
                {viewMode === 'cards' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDisasters.map((disaster) => {
                            const severityBadge = getSeverityBadge(disaster.severity);
                            const statusBadge = getStatusBadge(disaster.status);
                            const disasterType = disaster.disaster_type || disaster.disasterType || 'unknown';
                            const peopleAffected = disaster.people_affected || disaster.peopleAffected;
                            const reportedAt = disaster.reported_at || disaster.reportedAt || disaster.created_at;

                            return (
                                <div
                                    key={disaster.id}
                                    onClick={() => handleDisasterClick(disaster)}
                                    className="card hover:border-white/25 hover:bg-white/[0.08] cursor-pointer"
                                >
                                    <div className="flex gap-4">
                                        {/* Photo */}
                                        {disaster.photo && (
                                            <div className="flex-shrink-0">
                                                <LazyImage
                                                    src={disaster.photo}
                                                    alt={disasterType}
                                                    className="w-24 h-24 rounded-lg border border-white/10 bg-white/5"
                                                    aspectRatio="1/1"
                                                />
                                            </div>
                                        )}

                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white capitalize flex items-center gap-2 truncate">
                                                    <span>{getDisasterIcon(disasterType)}</span>
                                                    {disasterType?.replace('-', ' ') || 'Unknown'}
                                                </h3>
                                                <span className={`px-2 py-1 rounded text-xs font-semibold flex-shrink-0 ${statusBadge.className}`}>
                                                    {statusBadge.text}
                                                </span>
                                            </div>

                                            <div className="flex gap-2 mb-2">
                                                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${severityBadge.className}`}>
                                                    {severityBadge.text}
                                                </span>
                                            </div>

                                            <p className="text-sm text-slate-300 line-clamp-2">{disaster.description}</p>
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                                        <div className="flex items-start gap-2">
                                            <IconMapPin className="h-4 w-4 flex-shrink-0 text-slate-500 mt-0.5" />
                                            <span className="text-sm text-slate-300 line-clamp-2">{disaster.location?.address || 'Unknown'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <IconUsers className="h-4 w-4 flex-shrink-0 text-slate-500" />
                                                <span className="text-sm text-slate-400">{peopleAffected || 'Unknown'} affected</span>
                                            </div>
                                            <span className="text-sm text-slate-500">{getTimeSince(reportedAt)}</span>
                                        </div>
                                    </div>

                                    <button className="btn-primary w-full mt-3">
                                        View Details
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
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

                                    <MarkerClusterGroup chunkedLoading maxClusterRadius={30} disableClusteringAtZoom={9} removeOutsideVisibleBounds={false}>
                                        {filteredDisasters.filter(d => d.location && d.location.lat && d.location.lng).map((disaster) => {
                                            const disasterType = disaster.disaster_type || disaster.disasterType || 'unknown';
                                            const reporterName = disaster.reporter_name || disaster.reporterName;
                                            const contactNumber = disaster.contact_number || disaster.contactNumber;

                                            // Extra safety check
                                            if (!disaster.location || !disaster.location.lat || !disaster.location.lng) {
                                                return null;
                                            }

                                            return (
                                                <Marker
                                                    key={disaster.id}
                                                    position={[disaster.location.lat, disaster.location.lng]}
                                                    icon={disaster.status === 'Active' ? activeIcon : resolvedIcon}
                                                >
                                                    <Popup maxWidth={220} offset={[0, -10]}>
                                                        <div className="p-1">
                                                            {disaster.photo && <LazyImage src={disaster.photo} alt={disasterType} className="w-full h-24 rounded mb-2" aspectRatio="16/9" />}
                                                            <h3 className="font-bold text-sm capitalize mb-1">
                                                                {getDisasterIcon(disasterType)} {disasterType.replace('-', ' ')}
                                                            </h3>
                                                            <div className="mb-2">
                                                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${getSeverityBadge(disaster.severity).className}`}>
                                                                    {getSeverityBadge(disaster.severity).text}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-gray-600 mb-1">📍 {disaster.location?.address || 'Unknown'}</p>
                                                            <p className="text-xs text-gray-600 mb-1">👤 {reporterName || 'Unknown'}</p>
                                                            <p className="text-xs text-gray-600 mb-2">☎️ {contactNumber || 'Unknown'}</p>
                                                            <button onClick={() => handleDisasterClick(disaster)} className="btn-primary w-full text-xs py-1">
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
                                    <span>Only reports with coordinates are shown. <button onClick={() => setViewMode('cards')} className="font-semibold underline">Switch to Cards</button> for all.</span>
                                </div>

                                {/* Marker color key — counts already shown in the filter bar above */}
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 flex flex-row lg:flex-col gap-3 text-xs text-slate-300">
                                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-danger-500 rounded-full inline-block"></span> Active</span>
                                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-success-500 rounded-full inline-block"></span> Resolved</span>
                                </div>

                                <MapInsightsPanel stats={mapInsights.stats} insights={mapInsights.insights} />
                            </div>
                        </div>
                    </div>
                )}

                {filteredDisasters.length === 0 && (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-slate-400">
                        No disaster reports found matching your criteria
                    </div>
                )}

                <ScrollToTop />
            </div>
        </div>
    );
}

export default DisasterReportsList;
