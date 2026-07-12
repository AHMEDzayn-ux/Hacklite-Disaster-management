import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDisasterStore } from '../store';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../utils/leafletIconFix';

function DisasterReportDetail({ role: propRole }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { disasters, markResolvedByResponder, subscribeToDisasters, isInitialized } = useDisasterStore();

    // Ensure data is loaded
    useEffect(() => {
        if (!isInitialized) {
            subscribeToDisasters();
        }
    }, [isInitialized, subscribeToDisasters]);

    const role = propRole ||
        location.state?.role ||
        (location.pathname.startsWith('/disasters-list') ? 'responder' : 'reporter');

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [resolvedBy, setResolvedBy] = useState('');
    const [responderNotes, setResponderNotes] = useState('');
    const [weather, setWeather] = useState(null);
    const [weatherLoading, setWeatherLoading] = useState(false);

    const disaster = disasters.find(d => d.id === id || d.id === parseInt(id));

    // Handle both snake_case (from Supabase) and camelCase (legacy)
    const disasterType = disaster?.disaster_type || disaster?.disasterType;
    const peopleAffected = disaster?.people_affected || disaster?.peopleAffected;
    const casualties = disaster?.casualties;
    const areaSize = disaster?.area_size || disaster?.areaSize;
    const reporterName = disaster?.reporter_name || disaster?.reporterName;
    const contactNumber = disaster?.contact_number || disaster?.contactNumber;
    const reportedAt = disaster?.created_at || disaster?.reportedAt;
    const occurredDate = disaster?.occurred_date || disaster?.occurredDate;
    const resolvedAtDate = disaster?.resolved_at || disaster?.resolvedAt;
    const resolvedByPerson = disaster?.resolved_by || disaster?.resolvedBy;
    const responderNotesData = disaster?.responder_notes || disaster?.responderNotes;

    // Fetch weather data
    useEffect(() => {
        if (disaster?.location?.lat && disaster?.location?.lng) {
            setWeatherLoading(true);
            // Using Open-Meteo API (free, no API key required)
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${disaster.location.lat}&longitude=${disaster.location.lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`)
                .then(res => res.json())
                .then(data => {
                    setWeather(data.current);
                    setWeatherLoading(false);
                })
                .catch(err => {
                    console.error('Weather fetch error:', err);
                    setWeatherLoading(false);
                });
        }
    }, [disaster?.location?.lat, disaster?.location?.lng]);

    // Show loading while data is being fetched
    if (!isInitialized) {
        return (
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
                <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-12 text-center sm:px-6">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mb-4"></div>
                    <p className="text-slate-300">Loading...</p>
                </div>
            </div>
        );
    }

    if (!disaster) {
        return (
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
                <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-12 text-center sm:px-6">
                    <h1 className="text-2xl font-bold text-white mb-4">Report Not Found</h1>
                    <p className="text-slate-300 mb-6">The disaster report could not be found.</p>
                    <button onClick={() => navigate(-1)} className="btn-primary">← Go Back</button>
                </div>
            </div>
        );
    }

    const getDisasterIcon = (type) => {
        const icons = {
            'flood': '🌊', 'landslide': '⛰️', 'fire': '🔥', 'earthquake': '🌍',
            'cyclone': '🌀', 'drought': '🌵', 'tsunami': '🌊', 'building-collapse': '🏚️', 'other': '⚠️'
        };
        return icons[type] || '⚠️';
    };

    const getSeverityBadge = (severity) => {
        const badges = {
            'critical': { className: 'bg-danger-600 text-white', text: '🚨 Critical' },
            'high': { className: 'bg-danger-500 text-white', text: '⚠️ High' },
            'moderate': { className: 'bg-warning-500 text-white', text: '⚡ Moderate' },
            'low': { className: 'bg-info-500 text-white', text: 'ℹ️ Low' }
        };
        return <span className={`px-3 py-1.5 rounded text-sm font-semibold ${badges[severity].className}`}>{badges[severity].text}</span>;
    };

    const getStatusBadge = (status) => {
        return status === 'Active'
            ? <span className="px-3 py-1.5 rounded text-sm font-semibold bg-danger-500/15 text-danger-300">🔴 Active</span>
            : <span className="px-3 py-1.5 rounded text-sm font-semibold bg-success-500/15 text-success-300">✅ Resolved</span>;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
            date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const getWeatherDescription = (code) => {
        const weatherCodes = {
            0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
            45: 'Foggy', 48: 'Foggy', 51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
            61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain', 71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow',
            80: 'Rain Showers', 81: 'Rain Showers', 82: 'Heavy Rain Showers', 95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm'
        };
        return weatherCodes[code] || 'Unknown';
    };

    const getCasualtiesDisplay = (value) => {
        const casualtyMap = {
            'none': 'None known',
            'minor': 'Minor injuries',
            'serious': 'Serious injuries',
            'fatalities': 'Fatalities reported'
        };
        return casualtyMap[value] || value || 'N/A';
    };

    const handleMarkResolved = () => setShowConfirmDialog(true);

    const confirmMarkResolved = async () => {
        try {
            await markResolvedByResponder(disaster.id, resolvedBy || 'Disaster Response Team', responderNotes || null);
            setShowConfirmDialog(false);
        } catch (error) {
            console.error('Error marking disaster as resolved:', error);
            alert('Failed to mark disaster as resolved. Please try again.');
        }
    };

    const canMarkResolved = role === 'responder' && disaster.status === 'Active';

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
            <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
            {/* Header - Single Row */}
            <div className="mb-3">
                <div className="flex items-center gap-3">
                    <span className="text-3xl sm:text-4xl">{getDisasterIcon(disasterType)}</span>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white capitalize leading-tight">
                            {disasterType?.replace('-', ' ') || 'Unknown'} <span className="text-xs sm:text-sm text-slate-500 font-normal ml-2 sm:ml-3">ID: #{disaster.id} • {reportedAt ? formatDate(reportedAt) : 'N/A'}</span>
                        </h1>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

                {/* Left Column - Impact & Contact */}
                <div className="lg:col-span-5 space-y-3">

                    {/* Severity & Key Metrics */}
                    <div className="card p-5">
                        <div className="mb-3">{getSeverityBadge(disaster.severity)}</div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
                            <div className="border-r border-white/10">
                                <p className="text-xs text-slate-500 mb-1">People</p>
                                <p className="text-base font-bold text-white">{peopleAffected || 'N/A'}</p>
                            </div>
                            <div className="border-r border-white/10">
                                <p className="text-xs text-slate-500 mb-1">Casualties</p>
                                <p className="text-sm font-bold text-white">{getCasualtiesDisplay(casualties)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-1">Area</p>
                                <p className="text-base font-bold text-white">{areaSize || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Immediate Needs */}
                    {disaster.needs && (
                        <div className="card p-5">
                            <p className="text-sm font-semibold text-slate-200 mb-2">⚡ Immediate Needs</p>
                            <div className="flex flex-wrap gap-2">
                                {disaster.needs.rescue && <span className="px-2.5 py-1 bg-danger-500/15 text-danger-300 rounded text-sm font-medium">🆘 Rescue</span>}
                                {disaster.needs.medical && <span className="px-2.5 py-1 bg-danger-500/15 text-danger-300 rounded text-sm font-medium">🏥 Medical</span>}
                                {disaster.needs.shelter && <span className="px-2.5 py-1 bg-amber-500/15 text-amber-300 rounded text-sm font-medium">🏠 Shelter</span>}
                                {disaster.needs.food && <span className="px-2.5 py-1 bg-amber-500/15 text-amber-300 rounded text-sm font-medium">🍚 Food</span>}
                                {disaster.needs.water && <span className="px-2.5 py-1 bg-primary-500/15 text-primary-300 rounded text-sm font-medium">💧 Water</span>}
                                {disaster.needs.evacuation && <span className="px-2.5 py-1 bg-danger-500/15 text-danger-300 rounded text-sm font-medium">🚶 Evacuation</span>}
                            </div>
                        </div>
                    )}

                    {/* Reporter Contact */}
                    <div className="card p-5">
                        <p className="text-sm font-semibold text-slate-200 mb-2">📞 Reporter Contact</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-xs text-slate-500 mb-0.5">Name</p>
                                <p className="text-sm font-medium text-white">{reporterName || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 mb-0.5">Phone</p>
                                <p className="text-sm font-medium text-white">{contactNumber || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="card p-5 min-h-36">
                        <p className="text-sm font-semibold text-slate-200 mb-3">📝 Description</p>
                        <p className="text-sm text-slate-300 leading-relaxed">{disaster.description}</p>
                    </div>

                    {/* Timeline */}
                    <div className="card p-5">
                        <p className="text-sm font-semibold text-slate-200 mb-2">⏱️ Timeline</p>
                        <div className="space-y-2">
                            <div className="flex gap-2.5 items-start">
                                <div className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-white">Submitted</p>
                                    <p className="text-xs text-slate-400">{reportedAt ? formatDate(reportedAt) : 'N/A'} • {reporterName || 'Anonymous'}</p>
                                </div>
                            </div>
                            {resolvedAtDate && (
                                <div className="flex gap-2.5 items-start">
                                    <div className="w-7 h-7 rounded-full bg-success-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">✓</div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-white">Resolved</p>
                                        <p className="text-xs text-slate-400">{formatDate(resolvedAtDate)} • {resolvedByPerson || 'N/A'}</p>
                                        {responderNotesData && <p className="text-xs text-slate-400 italic mt-1">{responderNotesData}</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status & Action Button */}
                    <div className="card p-5">
                        <div className="flex items-center gap-3">
                            {getStatusBadge(disaster.status)}
                            {canMarkResolved && (
                                <button onClick={handleMarkResolved} className="btn-primary py-2 px-5">Mark as Resolved</button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column - Photo & Map */}
                <div className="lg:col-span-7 space-y-4">

                    {/* Photo & Map Side by Side on larger screens */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                        {/* Photo */}
                        {disaster.photo && (
                            <div className="card p-4">
                                <p className="text-sm font-semibold text-slate-200 mb-2">📸 Photo Evidence</p>
                                <div className="w-full h-64 rounded border border-white/10 bg-white/5 flex items-center justify-center">
                                    <img
                                        src={disaster.photo}
                                        alt={disasterType}
                                        className="max-w-full max-h-full object-contain"
                                        loading="lazy"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Location & Weather */}
                        <div className="card p-4">
                            <p className="text-sm font-semibold text-slate-200 mb-2">📍 Location & Weather</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Location Column */}
                                <div className="space-y-2.5">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Address</p>
                                        <p className="text-sm text-white">{disaster.location?.address || 'N/A'}</p>
                                    </div>
                                    {occurredDate && (
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Occurred</p>
                                            <p className="text-sm text-white">{formatDate(occurredDate)}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Weather Column */}
                                <div className="space-y-2.5">
                                    <p className="text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1">
                                        <span>🌤️</span> Current Weather
                                    </p>
                                    {weatherLoading ? (
                                        <div className="flex items-center justify-center py-3">
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-500 border-t-transparent"></div>
                                            <p className="text-xs text-slate-500 ml-2">Loading...</p>
                                        </div>
                                    ) : weather ? (
                                        <div className="bg-primary-500/10 rounded-lg p-2 border border-primary-400/20">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-white/5 rounded p-1.5 border border-white/10">
                                                    <p className="text-xs text-slate-400">🌡️ Temp</p>
                                                    <p className="text-base font-bold text-white">{weather.temperature_2m}°C</p>
                                                </div>
                                                <div className="bg-white/5 rounded p-1.5 border border-white/10">
                                                    <p className="text-xs text-slate-400">💧 Humidity</p>
                                                    <p className="text-base font-bold text-white">{weather.relative_humidity_2m}%</p>
                                                </div>
                                                <div className="bg-white/5 rounded p-1.5 border border-white/10">
                                                    <p className="text-xs text-slate-400">💨 Wind</p>
                                                    <p className="text-sm font-bold text-white">{weather.wind_speed_10m} km/h</p>
                                                </div>
                                                <div className="bg-white/5 rounded p-1.5 border border-white/10">
                                                    <p className="text-xs text-slate-400">☁️ Sky</p>
                                                    <p className="text-xs font-bold text-white">{getWeatherDescription(weather.weather_code)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-white/5 rounded p-2 text-center">
                                            <p className="text-xs text-slate-500">Unavailable</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Map */}
                    <div className="card p-4">
                        <p className="text-sm font-semibold text-slate-200 mb-2">🗺️ Map View</p>
                        {disaster.location?.lat && disaster.location?.lng ? (
                            <div style={{ height: '350px', position: 'relative', zIndex: 1 }} className="rounded border border-white/10 overflow-hidden">
                                <MapContainer center={[disaster.location.lat, disaster.location.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <Marker position={[disaster.location.lat, disaster.location.lng]}>
                                        <Popup><div className="p-1"><p className="text-xs font-bold">{disasterType}</p><p className="text-xs text-gray-600">{disaster.location.address}</p></div></Popup>
                                    </Marker>
                                </MapContainer>
                            </div>
                        ) : (
                            <div style={{ height: '350px', position: 'relative', zIndex: 1 }} className="rounded border border-white/10 overflow-hidden">
                                <MapContainer center={[7.8731, 80.7718]} zoom={7} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                </MapContainer>
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10 pointer-events-none">
                                    <p className="text-xs text-slate-200 bg-slate-900/90 px-2 py-1 rounded shadow">No specific location</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showConfirmDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
                    <div className="bg-slate-900 border border-white/10 rounded-lg shadow-2xl max-w-md w-full p-4">
                        <h3 className="text-lg font-bold text-white mb-2">Confirm Resolution</h3>
                        <p className="text-sm text-slate-300 mb-3">Confirm that this disaster has been resolved.</p>

                        <div className="space-y-2.5 mb-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Resolved By</label>
                                <input type="text" value={resolvedBy} onChange={(e) => setResolvedBy(e.target.value)} placeholder="Team/Organization name" className="input-field text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">Notes (Optional)</label>
                                <textarea value={responderNotes} onChange={(e) => setResponderNotes(e.target.value)} placeholder="Resolution details..." rows="2" className="input-field text-sm" />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={confirmMarkResolved} className="btn-primary flex-1 text-sm py-2">Confirm</button>
                            <button onClick={() => setShowConfirmDialog(false)} className="px-4 py-2 border border-white/20 bg-white/5 text-white hover:bg-white/10 rounded-lg text-sm">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}

export default DisasterReportDetail;
