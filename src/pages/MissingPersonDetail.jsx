import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useMissingPersonStore } from '../store';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../utils/leafletIconFix';
import { IconUserSearch, IconCheck } from '../components/icons/Icons';

function MissingPersonDetail({ role: propRole }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { missingPersons, markFoundByResponder, subscribeToMissingPersons, isInitialized } = useMissingPersonStore();

    // Ensure data is loaded
    useEffect(() => {
        if (!isInitialized) {
            subscribeToMissingPersons();
        }
    }, [isInitialized, subscribeToMissingPersons]);

    // Determine role from prop, URL path, or location state
    const role = propRole ||
        location.state?.role ||
        (location.pathname.startsWith('/missing-persons-list') ? 'responder' : 'reporter');

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [foundContact, setFoundContact] = useState('');
    const [foundNotes, setFoundNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [weather, setWeather] = useState(null);
    const [weatherLoading, setWeatherLoading] = useState(false);

    const person = missingPersons.find(p => p.id === id || p.id === parseInt(id));

    // Handle both snake_case (database) and camelCase (legacy) field names
    const lastSeenLocation = person?.last_seen_location || person?.lastSeenLocation;
    const lastSeenDate = person?.last_seen_date || person?.lastSeenDate;
    const reporterName = person?.reporter_name || person?.reporterName;
    const contactNumber = person?.contact_number || person?.contactNumber;
    const reportedAt = person?.reported_at || person?.reportedAt || person?.created_at;
    const foundByContact = person?.found_by_contact || person?.foundByContact;
    const foundAt = person?.found_at || person?.foundAt;
    const status = person?.status || (foundAt ? 'Resolved' : 'Active'); // Default to Active if not set

    // Fetch weather data
    useEffect(() => {
        if (lastSeenLocation?.lat && lastSeenLocation?.lng) {
            setWeatherLoading(true);
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lastSeenLocation.lat}&longitude=${lastSeenLocation.lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`)
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
    }, [lastSeenLocation?.lat, lastSeenLocation?.lng]);

    // Show loading while data is being fetched
    if (!isInitialized) {
        return (
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mb-4"></div>
                    <p className="text-slate-300">Loading...</p>
                </div>
            </div>
        );
    }

    if (!person) {
        return (
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans flex items-center justify-center">
                <div className="text-center px-4">
                    <h1 className="text-2xl font-bold text-white mb-4">Person Not Found</h1>
                    <p className="text-slate-300 mb-6">The missing person record could not be found.</p>
                    <button onClick={() => navigate(-1)} className="btn-primary">
                        ← Go Back
                    </button>
                </div>
            </div>
        );
    }

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

    const getStatusBadge = (status) => {
        return status === 'Active'
            ? <span className="px-3 py-1.5 rounded text-sm font-semibold bg-danger-500/15 text-danger-300">🔴 Active</span>
            : <span className="px-3 py-1.5 rounded text-sm font-semibold bg-success-500/15 text-success-300">✅ Found</span>;
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

    const handleMarkFound = () => setShowConfirmDialog(true);

    const confirmMarkFound = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await markFoundByResponder(person.id, foundContact || null, foundNotes || null);
            setShowConfirmDialog(false);
            setFoundContact('');
            setFoundNotes('');
        } catch (error) {
            console.error('Error marking person as found:', error);
            alert('Failed to mark person as found. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const canMarkFound = role === 'responder' && status === 'Active';

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
            <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
                {/* Header - Single Row */}
                <div className="mb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-fuchsia-500/15 text-fuchsia-300">
                            <IconUserSearch className="h-6 w-6 sm:h-7 sm:w-7" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
                                {person.name} <span className="text-xs sm:text-sm text-slate-500 font-normal ml-2 sm:ml-3">ID: #{person.id} • {reportedAt ? formatDate(reportedAt) : 'N/A'}</span>
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                    {/* Left Column - Person Info & Contact */}
                    <div className="lg:col-span-5 space-y-4">

                        {/* Basic Information */}
                        <div className="card p-5">
                            <p className="text-sm font-semibold text-slate-200 mb-3">👤 Person Details</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center mb-3">
                                <div className="border-r border-white/10">
                                    <p className="text-xs text-slate-500 mb-1">Age</p>
                                    <p className="text-base font-bold text-white">{person.age || 'N/A'}</p>
                                </div>
                                <div className="border-r border-white/10">
                                    <p className="text-xs text-slate-500 mb-1">Gender</p>
                                    <p className="text-base font-bold text-white capitalize">{person.gender || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Status</p>
                                    <p className="text-sm font-bold text-white">{getTimeSince(lastSeenDate)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="card p-5 min-h-36">
                            <p className="text-sm font-semibold text-slate-200 mb-3">📝 Description</p>
                            <p className="text-sm text-slate-300 leading-relaxed">{person.description || 'No description provided'}</p>
                        </div>

                        {/* Additional Information */}
                        {person.additionalInfo && (
                            <div className="card p-5">
                                <p className="text-sm font-semibold text-slate-200 mb-3">ℹ️ Additional Info</p>
                                <p className="text-sm text-slate-300 leading-relaxed">{person.additionalInfo}</p>
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
                            {foundByContact && (
                                <div className="mt-3 pt-3 border-t border-white/10">
                                    <p className="text-xs text-slate-500 mb-0.5">Found Contact</p>
                                    <p className="text-sm font-medium text-success-400">{foundByContact}</p>
                                </div>
                            )}
                        </div>

                        {/* Timeline */}
                        <div className="card p-5">
                            <p className="text-sm font-semibold text-slate-200 mb-2">⏱️ Timeline</p>
                            <div className="space-y-2">
                                <div className="flex gap-2.5 items-start">
                                    <div className="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-white">Reported</p>
                                        <p className="text-xs text-slate-400">{reportedAt ? formatDate(reportedAt) : 'N/A'} • {reporterName || 'Anonymous'}</p>
                                    </div>
                                </div>
                                {foundAt && (
                                    <div className="flex gap-2.5 items-start">
                                        <div className="w-7 h-7 rounded-full bg-success-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                                            <IconCheck className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-white">Found</p>
                                            <p className="text-xs text-slate-400">{formatDate(foundAt)}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status & Action Button */}
                        <div className="card p-5">
                            <div className="flex items-center gap-3">
                                {getStatusBadge(status)}
                                {canMarkFound && (
                                    <button onClick={handleMarkFound} className="btn-primary py-2 px-5">Mark as Found</button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Photo & Map */}
                    <div className="lg:col-span-7 space-y-4">

                        {/* Photo & Location Side by Side */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                            {/* Photo */}
                            {person.photo && (
                                <div className="card p-4">
                                    <p className="text-sm font-semibold text-slate-200 mb-2">📸 Photo</p>
                                    <div className="w-full h-64 rounded border border-white/10 bg-white/5 flex items-center justify-center">
                                        <img
                                            src={person.photo}
                                            alt={person.name}
                                            className="max-w-full max-h-full object-contain"
                                            loading="lazy"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Last Seen & Weather */}
                            <div className="card p-4">
                                <p className="text-sm font-semibold text-slate-200 mb-2">📍 Last Seen & Weather</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Location Column */}
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-xs text-slate-500 mb-0.5">Location</p>
                                            <p className="text-sm text-white">{lastSeenLocation?.address || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-0.5">Date & Time</p>
                                            <p className="text-sm text-white">{lastSeenDate ? formatDate(lastSeenDate) : 'N/A'}</p>
                                        </div>
                                    </div>

                                    {/* Weather Column */}
                                    <div>
                                        <p className="text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-1">
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
                            <p className="text-sm font-semibold text-slate-200 mb-2">🗺️ Last Seen Location</p>
                            {lastSeenLocation?.lat && lastSeenLocation?.lng ? (
                                <div style={{ height: '350px', position: 'relative', zIndex: 1 }} className="rounded border border-white/10 overflow-hidden">
                                    <MapContainer center={[lastSeenLocation.lat, lastSeenLocation.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                                        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <Marker position={[lastSeenLocation.lat, lastSeenLocation.lng]}>
                                            <Popup><div className="p-1"><p className="text-xs font-bold">Last Seen Here</p><p className="text-xs text-gray-600">{lastSeenLocation.address}</p></div></Popup>
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
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
                        <div className="bg-slate-900 border border-white/10 rounded-lg shadow-2xl max-w-md w-full p-4">
                            <h3 className="text-lg font-bold text-white mb-2">Confirm Found</h3>
                            <p className="text-sm text-slate-300 mb-3">Confirm that this person has been found.</p>

                            <div className="space-y-2.5 mb-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Contact Number (Optional)</label>
                                    <input type="tel" value={foundContact} onChange={(e) => setFoundContact(e.target.value)} placeholder="Your contact number" className="input-field text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Notes (Optional)</label>
                                    <textarea value={foundNotes} onChange={(e) => setFoundNotes(e.target.value)} placeholder="Additional details about finding the person..." rows="3" className="input-field text-sm" />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={confirmMarkFound} disabled={isSubmitting} className="btn-primary flex-1 text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isSubmitting ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                            Processing...
                                        </span>
                                    ) : 'Confirm'}
                                </button>
                                <button onClick={() => { setShowConfirmDialog(false); setFoundContact(''); setFoundNotes(''); }} disabled={isSubmitting} className="px-4 py-2 border border-white/20 bg-white/5 text-white hover:bg-white/10 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MissingPersonDetail;
