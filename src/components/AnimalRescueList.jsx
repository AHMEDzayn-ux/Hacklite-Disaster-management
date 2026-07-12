import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnimalRescueStore } from '../store';
import { MapContainer, TileLayer, Marker, Popup, Rectangle, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import '../utils/leafletIconFix';
import { redIcon, greenIcon } from '../utils/leafletIconFix';
import ScrollToTop from './shared/ScrollToTop';
import LazyImage from './shared/LazyImage';
import { IconPawPrint, IconSearch, IconGrid, IconMap, IconMapPin, IconClock, IconX, IconInfo } from './icons/Icons';
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
function MapController({ districtFilter, allDistricts }) {
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
    const { animalRescues, loading, isInitialized, subscribeToAnimalRescues, unsubscribeFromAnimalRescues } = useAnimalRescueStore();
    const [statusFilter, setStatusFilter] = useState('all');
    const [districtFilter, setDistrictFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'map'
    const [isInitializing, setIsInitializing] = useState(!isInitialized);

    // Subscribe to real-time updates on mount
    useEffect(() => {
        if (!isInitialized) {
            const initialize = async () => {
                await subscribeToAnimalRescues();
                setIsInitializing(false);
            };
            initialize();
        } else {
            setIsInitializing(false);
        }
        // Don't unsubscribe on unmount to maintain cache
    }, []);

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

    const handleRescueClick = (rescue) => {
        const route = role === 'responder' ? `/animal-rescue-list/${rescue.id}` : `/animal-rescue/${rescue.id}`;
        navigate(route);
    };

    // Show loading state while initializing
    if (isInitializing) {
        return (
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
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
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <div className="relative z-10 mx-auto max-w-[1600px] px-6 py-10 sm:px-10">
                {/* Header with view toggle */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-5">
                            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-lg shadow-primary-500/30">
                                <IconPawPrint className="h-7 w-7" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-white md:text-4xl">
                                    {role === 'responder' ? 'Animal Rescue Operations' : 'Animal Rescue Reports'}
                                </h1>
                                <p className="mt-1 text-slate-300">
                                    {activeCount} need{activeCount !== 1 ? '' : 's'} rescue &middot; {rescuedCount} rescue{rescuedCount !== 1 ? 's' : ''} completed
                                </p>
                            </div>
                        </div>

                        {/* View Toggle */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setViewMode('cards')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'cards'
                                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                                    : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                <IconGrid className="h-4 w-4" />
                                Card View
                            </button>
                            <button
                                onClick={() => setViewMode('map')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${viewMode === 'map'
                                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                                    : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                <IconMap className="h-4 w-4" />
                                Map View
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="card mb-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Search</label>
                            <div className="relative">
                                <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Animal type, location..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="input-field pl-10"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="input-field"
                            >
                                <option value="all">All Status</option>
                                <option value="active">Needs Rescue</option>
                                <option value="rescued">Rescued</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">District</label>
                            <select
                                value={districtFilter}
                                onChange={(e) => setDistrictFilter(e.target.value)}
                                className="input-field"
                            >
                                <option value="all">All Districts</option>
                                {allDistricts.map(district => (
                                    <option key={district} value={district}>{district}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setStatusFilter('all');
                                    setDistrictFilter('all');
                                }}
                                className="w-full px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <IconX className="h-3.5 w-3.5" />
                                Clear Filters
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
                                <h3 className="text-xl font-semibold text-white mb-2">No Rescue Reports</h3>
                                <p className="text-slate-400">No animal rescue reports match your filters.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredRescues.map((rescue) => {
                                    const statusBadge = getStatusBadge(rescue.status);
                                    const conditionBadge = getConditionBadge(rescue.condition);
                                    const animalIcon = getAnimalTypeIcon(rescue.animalType);

                                    return (
                                        <div
                                            key={rescue.id}
                                            onClick={() => handleRescueClick(rescue)}
                                            className="card hover:border-white/25 hover:bg-white/[0.08] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                                        >
                                            {/* Animal Photo */}
                                            <div className="relative mb-4">
                                                <LazyImage
                                                    src={rescue.photo}
                                                    alt={rescue.animalType}
                                                    className="w-full h-48 rounded-lg bg-white/5"
                                                    aspectRatio="16/9"
                                                />
                                                <div className="absolute top-2 right-2">
                                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusBadge.className}`}>
                                                        {statusBadge.text}
                                                    </span>
                                                </div>
                                                {rescue.isDangerous && (
                                                    <div className="absolute top-2 left-2">
                                                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-danger-500/20 text-danger-300">
                                                            ⚠️ Dangerous
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Animal Info */}
                                            <div className="space-y-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="text-lg font-bold text-white capitalize flex items-center gap-2">
                                                        <span>{animalIcon}</span>
                                                        {rescue.animalType}
                                                        {rescue.breed && <span className="text-sm font-normal text-slate-400">({rescue.breed})</span>}
                                                    </h3>
                                                </div>

                                                <p className="text-sm text-slate-300 line-clamp-2">{rescue.description}</p>

                                                {/* Condition Badge */}
                                                <div>
                                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${conditionBadge.className}`}>
                                                        {conditionBadge.text}
                                                    </span>
                                                </div>

                                                {rescue.healthDetails && (
                                                    <p className="text-sm text-slate-400 italic line-clamp-2">
                                                        {rescue.healthDetails}
                                                    </p>
                                                )}

                                                <div className="pt-2 border-t border-white/10 space-y-2">
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

                                                <button className="btn-primary w-full mt-4">
                                                    View Details
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                ) : (
                    // Map View
                    <div>
                        {/* Warning Note */}
                        <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 backdrop-blur-md">
                            <div className="flex items-start gap-3">
                                <IconInfo className="h-5 w-5 flex-shrink-0 text-amber-300 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-semibold text-amber-200 mb-1">Map View Limitation</h4>
                                    <p className="text-sm text-amber-100/80">
                                        Only animal rescue requests with valid location coordinates are displayed on the map.
                                        <span className="font-medium text-amber-100"> Switch to Card View</span> to see all requests including those without map coordinates.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="card p-0 overflow-hidden">
                            <div style={{ height: '600px' }}>
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

                                    <MapController districtFilter={districtFilter} allDistricts={allDistricts} />

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
                            </div>

                            {/* Map Legend */}
                            <div className="p-4 bg-white/[0.03] border-t border-white/10">
                                <p className="flex items-center justify-center gap-1.5 text-sm text-slate-400 mb-3">
                                    <IconInfo className="h-4 w-4" />
                                    Records without valid coordinates are not displayed on the map. Switch to Card View to see all reports.
                                </p>
                                <div className="flex flex-wrap gap-4 items-center justify-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-danger-500 rounded-full"></div>
                                        <span className="text-sm font-medium text-slate-200">Needs Rescue ({activeCount})</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-success-500 rounded-full"></div>
                                        <span className="text-sm font-medium text-slate-200">Rescued ({rescuedCount})</span>
                                    </div>
                                    {districtFilter !== 'all' && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-1 bg-primary-500"></div>
                                            <span className="text-sm font-medium text-slate-200">{districtFilter} District</span>
                                        </div>
                                    )}
                                </div>
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
