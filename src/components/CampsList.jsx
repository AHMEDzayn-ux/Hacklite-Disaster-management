import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCampStore } from '../store';
import { MapContainer, TileLayer, Marker, Popup, Rectangle, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import '../utils/leafletIconFix';
import { greenIcon, greyIcon } from '../utils/leafletIconFix';
import ScrollToTop from './shared/ScrollToTop';
import { invalidateCache } from '../utils/cacheManager';
import { IconTent, IconSearch, IconGrid, IconMap, IconUsers, IconX, IconPhone } from './icons/Icons';

// Custom marker icons for different statuses
const activeIcon = greenIcon;
const closedIcon = greyIcon;

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

function CampsList({ role = 'responder' }) {
    const navigate = useNavigate();
    const { camps, loading, isInitialized, subscribeToCamps, unsubscribeFromCamps } = useCampStore();
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [districtFilter, setDistrictFilter] = useState('all');
    const [needsFilter, setNeedsFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('map'); // Default to map view as it's most important
    const [isInitializing, setIsInitializing] = useState(true); // Always start with loading state

    // Subscribe to real-time updates on mount
    useEffect(() => {
        const initialize = async () => {
            if (!isInitialized) {
                // Only invalidate cache if not initialized yet
                invalidateCache('camps');
                await subscribeToCamps();
            }
            // Add small delay to ensure data is loaded
            setTimeout(() => {
                setIsInitializing(false);
            }, 100);
        };
        initialize();
        // Don't unsubscribe on unmount to maintain cache
    }, [isInitialized, subscribeToCamps]);

    const allDistricts = [
        'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha',
        'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi',
        'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu',
        'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'
    ];

    // Extract unique needs from all active camps (handle null/undefined needs arrays)
    const allNeeds = [...new Set(camps.filter(c => c.status === 'Active').flatMap(c => Array.isArray(c.needs) ? c.needs : []))].sort();

    const filteredCamps = camps.filter(camp => {
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && camp.status === 'Active') ||
            (statusFilter === 'closed' && camp.status === 'Closed');
        const matchesType = typeFilter === 'all' || camp.type === typeFilter;
        const matchesDistrict = districtFilter === 'all' || camp.district === districtFilter;
        const matchesNeeds = needsFilter === 'all' || (camp.needs && camp.needs.includes(needsFilter));
        const matchesSearch = (camp.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (camp.address || camp.location?.address || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesType && matchesDistrict && matchesNeeds && matchesSearch;
    });

    const activeCount = camps.filter(c => c.status === 'Active').length;
    const closedCount = camps.filter(c => c.status === 'Closed').length;
    const totalCapacity = camps.filter(c => c.status === 'Active').reduce((sum, c) => sum + (c.capacity || 0), 0);
    const totalOccupancy = camps.filter(c => c.status === 'Active').reduce((sum, c) => sum + (c.current_occupancy || 0), 0);

    const handleCampClick = (camp) => {
        navigate(`/camps/${camp.id}`);
    };

    const getOccupancyColor = (camp) => {
        const percent = ((camp.current_occupancy || 0) / (camp.capacity || 1)) * 100;
        if (percent >= 90) return 'text-danger-400';
        if (percent >= 70) return 'text-amber-400';
        return 'text-success-400';
    };

    const getStockBadge = (stock) => {
        const badges = {
            'adequate': { className: 'bg-success-500/15 text-success-300', text: 'Adequate' },
            'low': { className: 'bg-amber-500/15 text-amber-300', text: 'Low' },
            'critical': { className: 'bg-danger-500/15 text-danger-300', text: 'Critical' },
            'none': { className: 'bg-white/10 text-slate-300', text: 'None' }
        };
        return badges[stock] || badges.none;
    };

    const getCampTypeIcon = (type) => {
        const icons = {
            'temporary-shelter': '🏕️',
            'emergency-evacuation': '🚨',
            'long-term-relief': '🏠',
            'medical-facility': '🏥'
        };
        return icons[type] || '⛺';
    };

    // Show loading state while initializing
    if (isInitializing) {
        return (
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
                <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mb-4"></div>
                        <p className="text-slate-400">Loading relief camps...</p>
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
                {/* Header with Stats and Controls */}
                <div className="card mb-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Title & Stats */}
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
                                <IconTent className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Relief Camps</h1>
                                <div className="hidden sm:flex items-center gap-3 text-sm mt-1">
                                    <span className="px-2 py-1 bg-success-500/15 text-success-300 rounded-full font-medium">
                                        {activeCount} Active
                                    </span>
                                    <span className="flex items-center gap-1 text-slate-400">
                                        <IconUsers className="h-3.5 w-3.5" />
                                        {totalOccupancy.toLocaleString()}/{totalCapacity.toLocaleString()} sheltered
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* View Toggle */}
                        {camps.length > 0 && (
                            <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5">
                                <button
                                    onClick={() => setViewMode('map')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'map'
                                        ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                                        : 'text-slate-300 hover:bg-white/10'
                                        }`}
                                >
                                    <IconMap className="h-3.5 w-3.5" />
                                    Map
                                </button>
                                <button
                                    onClick={() => setViewMode('cards')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'cards'
                                        ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                                        : 'text-slate-300 hover:bg-white/10'
                                        }`}
                                >
                                    <IconGrid className="h-3.5 w-3.5" />
                                    Cards
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Inline Filters */}
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/10">
                        <select
                            value={districtFilter}
                            onChange={(e) => setDistrictFilter(e.target.value)}
                            className="text-sm bg-white/5 border border-white/15 text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                        >
                            <option value="all">All Districts</option>
                            {allDistricts.map(district => (
                                <option key={district} value={district}>{district}</option>
                            ))}
                        </select>

                        <select
                            value={needsFilter}
                            onChange={(e) => setNeedsFilter(e.target.value)}
                            className="text-sm bg-white/5 border border-white/15 text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                        >
                            <option value="all">All Needs</option>
                            {allNeeds.map((need, idx) => (
                                <option key={need + '-' + idx} value={need}>{need}</option>
                            ))}
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="text-sm bg-white/5 border border-white/15 text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active Only</option>
                            <option value="closed">Closed</option>
                        </select>

                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="text-sm bg-white/5 border border-white/15 text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500/50"
                        >
                            <option value="all">All Types</option>
                            <option value="temporary-shelter">Temporary Shelter</option>
                            <option value="emergency-evacuation">Emergency Evacuation</option>
                            <option value="long-term-relief">Long-term Relief</option>
                            <option value="medical-facility">Medical Facility</option>
                        </select>

                        <div className="relative">
                            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search camps..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="text-sm bg-white/5 border border-white/15 text-white placeholder:text-slate-500 rounded-lg pl-8 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500/50 w-40"
                            />
                        </div>

                        {(districtFilter !== 'all' || needsFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all' || searchTerm) && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setStatusFilter('all');
                                    setTypeFilter('all');
                                    setDistrictFilter('all');
                                    setNeedsFilter('all');
                                }}
                                className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 px-2 py-1.5"
                            >
                                <IconX className="h-3.5 w-3.5" />
                                Clear
                            </button>
                        )}

                        <span className="ml-auto text-xs text-slate-500">
                            {filteredCamps.length} of {camps.length} camps
                        </span>
                    </div>
                </div>

                {camps.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
                        <div className="mb-3 flex justify-center text-amber-300">
                            <IconTent className="h-12 w-12" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-1">No Relief Camps Available</h2>
                        <p className="text-slate-400 text-sm">There are currently no registered relief camps.</p>
                    </div>
                ) : (
                    <>
                        {viewMode === 'cards' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {filteredCamps.length === 0 ? (
                                    <div className="col-span-full rounded-2xl border border-white/10 bg-white/[0.03] text-center py-8">
                                        <div className="mb-2 flex justify-center text-slate-500">
                                            <IconSearch className="h-8 w-8" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-1">No Camps Match Filters</h3>
                                        <p className="text-slate-400 text-sm">Try adjusting your filter criteria</p>
                                    </div>
                                ) : (
                                    filteredCamps.map((camp) => {
                                        const occupancyPercent = Math.round(((camp.current_occupancy || 0) / (camp.capacity || 1)) * 100);
                                        return (
                                            <div
                                                key={camp.id}
                                                onClick={() => handleCampClick(camp)}
                                                className="card p-3 hover:border-white/25 hover:bg-white/[0.08] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
                                            >
                                                {/* Header */}
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="text-sm font-bold text-white truncate flex items-center gap-1">
                                                            <span className="text-base">{getCampTypeIcon(camp.type || 'unknown')}</span>
                                                            {camp.name || 'Unnamed Camp'}
                                                        </h3>
                                                        <p className="text-xs text-slate-500 capitalize truncate">{camp.type?.replace('-', ' ') || 'Unknown'} &middot; {camp.district || 'N/A'}</p>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${camp.status === 'Active' ? 'bg-success-500/15 text-success-300' : 'bg-white/10 text-slate-400'
                                                        }`}>
                                                        {camp.status || 'N/A'}
                                                    </span>
                                                </div>

                                                {/* Occupancy Bar */}
                                                <div className="mb-2">
                                                    <div className="flex justify-between items-center mb-0.5">
                                                        <span className="text-xs text-slate-500">Occupancy</span>
                                                        <span className={`text-xs font-semibold ${getOccupancyColor(camp)}`}>
                                                            {camp.current_occupancy || 0}/{camp.capacity || 0}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-white/10 rounded-full h-1.5">
                                                        <div
                                                            className={`h-1.5 rounded-full ${occupancyPercent >= 90 ? 'bg-danger-500' :
                                                                occupancyPercent >= 70 ? 'bg-amber-500' : 'bg-success-500'
                                                                }`}
                                                            style={{ width: `${Math.min(occupancyPercent, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Contact Info */}
                                                <div className="text-xs text-slate-400 space-y-0.5 mb-2">
                                                    <p className="truncate">📍 {camp.address || camp.location?.address || 'N/A'}</p>
                                                    <p className="truncate">📞 {camp.contact_person || 'N/A'} &middot; {camp.contact_number || 'N/A'}</p>
                                                </div>

                                                {/* Supply Status - Compact */}
                                                {camp.status === 'Active' && camp.supplies && (
                                                    <div className="flex flex-wrap gap-1 mb-2">
                                                        <span className={`px-1.5 py-0.5 rounded text-xs ${getStockBadge(camp.supplies?.food?.stock || 'none').className}`}>
                                                            🍚{getStockBadge(camp.supplies?.food?.stock || 'none').text.charAt(0)}
                                                        </span>
                                                        <span className={`px-1.5 py-0.5 rounded text-xs ${getStockBadge(camp.supplies?.water?.stock || 'none').className}`}>
                                                            💧{getStockBadge(camp.supplies?.water?.stock || 'none').text.charAt(0)}
                                                        </span>
                                                        <span className={`px-1.5 py-0.5 rounded text-xs ${getStockBadge(camp.supplies?.medicine?.stock || 'none').className}`}>
                                                            💊{getStockBadge(camp.supplies?.medicine?.stock || 'none').text.charAt(0)}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Urgent Needs - Compact */}
                                                {Array.isArray(camp.needs) && camp.needs.length > 0 && (
                                                    <div className="bg-amber-500/10 border border-amber-400/20 rounded px-2 py-1 mb-2">
                                                        <p className="text-xs text-amber-300 truncate">
                                                            ⚠️ {camp.needs.slice(0, 2).join(', ')}{camp.needs.length > 2 ? ` +${camp.needs.length - 2}` : ''}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* View Button */}
                                                <button className="w-full bg-primary-500 hover:bg-primary-600 text-white text-xs font-medium py-1.5 rounded-lg transition-colors">
                                                    View Details →
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        ) : (
                            // Map View
                            <div className="card p-0 overflow-hidden">
                                {/* Compact Warning */}
                                <div className="bg-amber-500/10 border-b border-amber-400/20 px-3 py-2 flex items-center gap-2 text-xs text-amber-200">
                                    <span>⚠️</span>
                                    <span>Only camps with coordinates shown. <button onClick={() => setViewMode('cards')} className="font-semibold underline">Switch to Cards</button> for all.</span>
                                </div>

                                {filteredCamps.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="mb-2 flex justify-center text-slate-500">
                                            <IconSearch className="h-8 w-8" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-1">No Camps Match Filters</h3>
                                        <p className="text-slate-400 text-sm">Try adjusting your filter criteria</p>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ height: 'calc(100vh - 320px)', minHeight: '400px' }}>
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
                                                    {filteredCamps.filter(c => {
                                                        const lat = c.latitude || c.location?.lat;
                                                        const lng = c.longitude || c.location?.lng;
                                                        return lat && lng;
                                                    }).map((camp) => {
                                                        const occupancyPercent = Math.round((camp.current_occupancy / camp.capacity) * 100);
                                                        const lat = camp.latitude || camp.location?.lat;
                                                        const lng = camp.longitude || camp.location?.lng;

                                                        return (
                                                            <Marker
                                                                key={camp.id}
                                                                position={[lat, lng]}
                                                                icon={camp.status === 'Active' ? activeIcon : closedIcon}
                                                            >
                                                                <Popup maxWidth={200} offset={[0, -10]}>
                                                                    <div className="p-1">
                                                                        <h3 className="font-bold text-xs mb-1 truncate">
                                                                            {getCampTypeIcon(camp.type)} {camp.name}
                                                                        </h3>
                                                                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium mb-1 ${camp.status === 'Active' ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-600'}`}>
                                                                            {camp.status}
                                                                        </span>
                                                                        <div className="mb-1">
                                                                            <div className="flex justify-between items-center">
                                                                                <span className="text-xs text-gray-500">Occupancy</span>
                                                                                <span className={`text-xs font-semibold ${getOccupancyColor(camp)}`}>
                                                                                    {camp.current_occupancy}/{camp.capacity}
                                                                                </span>
                                                                            </div>
                                                                            <div className="w-full bg-gray-200 rounded-full h-1">
                                                                                <div className={`h-1 rounded-full ${occupancyPercent >= 90 ? 'bg-danger-500' : occupancyPercent >= 70 ? 'bg-warning-500' : 'bg-success-500'}`} style={{ width: `${occupancyPercent}%` }}></div>
                                                                            </div>
                                                                        </div>
                                                                        <p className="text-xs text-gray-500 truncate">📞 {camp.contact_number || 'N/A'}</p>
                                                                        <button onClick={() => handleCampClick(camp)} className="mt-1 w-full bg-primary-600 text-white text-xs py-1 rounded">
                                                                            View →
                                                                        </button>
                                                                    </div>
                                                                </Popup>
                                                            </Marker>
                                                        );
                                                    })}
                                                </MarkerClusterGroup>
                                            </MapContainer>
                                        </div>

                                        {/* Compact Legend */}
                                        <div className="px-3 py-2 bg-white/[0.03] border-t border-white/10 flex items-center justify-center gap-4 text-xs text-slate-300">
                                            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-success-500 rounded-full inline-block"></span> Active ({activeCount})</span>
                                            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-500 rounded-full inline-block"></span> Closed ({closedCount})</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </>
                )}
                <ScrollToTop />
            </div>
        </div>
    );
}

export default CampsList;
