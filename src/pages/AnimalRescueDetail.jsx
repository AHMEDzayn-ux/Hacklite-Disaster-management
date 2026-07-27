import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAnimalRescueStore } from '../store';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../utils/leafletIconFix';
import { IconCamera, IconMapPin, IconMap, IconPhone, IconFirstAid } from '../components/icons/Icons';

function AnimalRescueDetail({ role: propRole }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { animalRescues, markFoundByResponder, subscribeToAnimalRescues, isInitialized } = useAnimalRescueStore();

    // Ensure data is loaded
    useEffect(() => {
        if (!isInitialized) {
            subscribeToAnimalRescues();
        }
    }, [isInitialized, subscribeToAnimalRescues]);

    // Determine role from prop, URL path, or location state
    const role = propRole ||
        location.state?.role ||
        (location.pathname.startsWith('/animal-rescue-list') ? 'responder' : 'reporter');

    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [foundContact, setFoundContact] = useState('');
    const [foundNotes, setFoundNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [weather, setWeather] = useState(null);
    const [weatherLoading, setWeatherLoading] = useState(false);

    const rescue = animalRescues.find(r => r.id === id || r.id === parseInt(id));

    // Handle both snake_case (database) and camelCase (legacy) field names
    const animalType = rescue?.animal_type || rescue?.animalType;
    const reporterName = rescue?.reporter_name || rescue?.reporterName;
    const contactNumber = rescue?.contact_number || rescue?.contactNumber;
    const reportedAt = rescue?.reported_at || rescue?.reportedAt || rescue?.created_at;
    const spottedDate = rescue?.spotted_date || rescue?.spottedDate;
    const foundAt = rescue?.found_at || rescue?.foundAt;
    const foundByContact = rescue?.found_by_contact || rescue?.foundByContact;
    const isDangerous = rescue?.is_dangerous || rescue?.isDangerous;
    const dangerDetails = rescue?.danger_details || rescue?.dangerDetails;
    const healthDetails = rescue?.health_details || rescue?.healthDetails;
    const status = rescue?.status || (foundAt ? 'Resolved' : 'Active'); // Default to Active if not set

    // Fetch weather data
    useEffect(() => {
        if (rescue?.location?.lat && rescue?.location?.lng) {
            setWeatherLoading(true);
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${rescue.location.lat}&longitude=${rescue.location.lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`)
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
    }, [rescue?.location?.lat, rescue?.location?.lng]);

    // Show loading while data is being fetched
    if (!isInitialized) {
        return (
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans flex items-center justify-center">
                <div className="relative z-10 text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mb-4"></div>
                    <p className="text-slate-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (!rescue) {
        return (
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans flex items-center justify-center">
                <div className="relative z-10 text-center px-4">
                    <h1 className="text-2xl font-bold text-white mb-4">Rescue Report Not Found</h1>
                    <p className="text-slate-400 mb-6">The animal rescue record could not be found.</p>
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

    const getStatusBadge = (statusValue) => {
        const actualStatus = statusValue || 'Active'; // Default to Active if undefined
        return actualStatus === 'Active'
            ? <span className="px-3 py-1.5 rounded text-sm font-semibold bg-danger-500/15 text-danger-300">🔴 Active</span>
            : <span className="px-3 py-1.5 rounded text-sm font-semibold bg-success-500/15 text-success-300">✅ Rescued</span>
    };

    const getConditionBadge = (condition) => {
        const badges = {
            'critical': { className: 'bg-danger-600 text-white', text: '🚨 Critical' },
            'injured': { className: 'bg-amber-600 text-white', text: '🩹 Injured' },
            'trapped': { className: 'bg-amber-500 text-white', text: '🔒 Trapped' },
            'sick': { className: 'bg-amber-400 text-slate-900', text: '🤒 Sick' },
            'healthy': { className: 'bg-blue-500 text-white', text: '✓ Healthy' },
        };
        const badge = badges[condition] || { className: 'bg-slate-500 text-white', text: condition };
        return <span className={`px-3 py-1.5 rounded text-sm font-semibold ${badge.className}`}>{badge.text}</span>;
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

    const getWeatherDescription = (code) => {
        const weatherCodes = {
            0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
            45: 'Foggy', 48: 'Foggy', 51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
            61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain', 71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow',
            80: 'Rain Showers', 81: 'Rain Showers', 82: 'Heavy Rain Showers', 95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm'
        };
        return weatherCodes[code] || 'Unknown';
    };

    const handleMarkRescued = () => setShowConfirmDialog(true);

    const confirmMarkRescued = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await markFoundByResponder(rescue.id, foundContact || null, foundNotes || null);
            setShowConfirmDialog(false);
            setFoundContact('');
            setFoundNotes('');
        } catch (error) {
            console.error('Error marking animal as rescued:', error);
            alert('Failed to mark animal as rescued. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const canMarkRescued = role === 'responder' && status === 'Active';

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
            <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
                {/* Header - Single Row */}
                <div className="mb-3">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl sm:text-4xl">{getAnimalTypeIcon(animalType)}</span>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-white capitalize leading-tight">
                                {animalType?.replace('-', ' ') || 'Unknown'} {rescue.breed && <span className="text-base sm:text-lg text-slate-400">({rescue.breed})</span>} <span className="text-xs sm:text-sm text-slate-500 font-normal ml-2 sm:ml-3">ID: #{rescue.id} • {reportedAt ? formatDate(reportedAt) : 'N/A'}</span>
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

                    {/* Left Column - Animal Info & Contact */}
                    <div className="lg:col-span-5 space-y-3">

                        {/* Condition & Key Info */}
                        <div className="card p-5">
                            <div className="mb-3">{getConditionBadge(rescue.condition)}</div>
                            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 text-center">
                                <div className="border-r border-white/10">
                                    <p className="text-xs text-slate-500 mb-1">Type</p>
                                    <p className="text-base font-bold text-white capitalize">{animalType || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Spotted</p>
                                    <p className="text-sm font-bold text-white">{spottedDate ? getTimeSince(spottedDate) : 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Safety Alert */}
                        {isDangerous && (
                            <div className="card p-5 bg-danger-500/10 border border-danger-400/30 border-l-4 border-l-danger-500">
                                <p className="text-sm font-semibold text-danger-300 mb-2">⚠️ Dangerous Animal</p>
                                <p className="text-sm text-danger-200 leading-relaxed">{dangerDetails || 'Exercise extreme caution when approaching'}</p>
                            </div>
                        )}

                        {/* Description */}
                        <div className="card p-5 min-h-36">
                            <p className="text-sm font-semibold text-slate-200 mb-3">📝 Description</p>
                            <p className="text-sm text-slate-300 leading-relaxed">{rescue.description || 'No description provided'}</p>
                        </div>

                        {/* Health Details */}
                        {healthDetails && (
                            <div className="card p-5">
                                <p className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-1.5"><IconFirstAid className="h-4 w-4" /> Health Details</p>
                                <p className="text-sm text-slate-300 leading-relaxed">{healthDetails}</p>
                            </div>
                        )}

                        {/* Accessibility */}
                        {rescue.accessibility && (
                            <div className="card p-5">
                                <p className="text-sm font-semibold text-slate-200 mb-2">🚶 Accessibility</p>
                                <p className="text-sm text-slate-300 capitalize">{rescue.accessibility} access</p>
                            </div>
                        )}

                        {/* Reporter Contact */}
                        <div className="card p-5">
                            <p className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-1.5"><IconPhone className="h-4 w-4" /> Reporter Contact</p>
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
                                    <p className="text-xs text-slate-500 mb-0.5">Rescue Contact</p>
                                    <p className="text-sm font-medium text-success-300">{foundByContact}</p>
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
                                        <div className="w-7 h-7 rounded-full bg-success-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">✓</div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-white">Rescued</p>
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
                                {canMarkRescued && (
                                    <button onClick={handleMarkRescued} className="btn-primary py-2 px-5">Mark as Rescued</button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Photo & Map */}
                    <div className="lg:col-span-7 space-y-4">

                        {/* Photo & Location Side by Side */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                            {/* Photo */}
                            {rescue.photo && (
                                <div className="card p-4">
                                    <p className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-1.5"><IconCamera className="h-4 w-4" /> Photo</p>
                                    <div className="w-full h-64 rounded border border-white/10 bg-white/5 flex items-center justify-center">
                                        <img
                                            src={rescue.photo}
                                            alt={animalType}
                                            className="max-w-full max-h-full object-contain"
                                            loading="lazy"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Location & Weather */}
                            <div className="card p-4">
                                <p className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-1.5"><IconMapPin className="h-4 w-4" /> Location & Weather</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Location Column */}
                                    <div className="space-y-2">
                                        <div>
                                            <p className="text-xs text-slate-500 mb-0.5">Address</p>
                                            <p className="text-sm text-white">{rescue.location?.address || 'N/A'}</p>
                                        </div>
                                        {spottedDate && (
                                            <div>
                                                <p className="text-xs text-slate-500 mb-0.5">Spotted</p>
                                                <p className="text-sm text-white">{formatDate(spottedDate)}</p>
                                            </div>
                                        )}
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
                                            <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-lg p-2 border border-blue-400/20">
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
                            <p className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-1.5"><IconMap className="h-4 w-4" /> Animal Location</p>
                            {rescue.location?.lat && rescue.location?.lng ? (
                                <div style={{ height: '350px', position: 'relative', zIndex: 1 }} className="rounded border border-white/10 overflow-hidden">
                                    <MapContainer center={[rescue.location.lat, rescue.location.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                                        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        <Marker position={[rescue.location.lat, rescue.location.lng]}>
                                            <Popup><div className="p-1"><p className="text-xs font-bold capitalize">{animalType} spotted</p><p className="text-xs text-gray-600">{rescue.location.address}</p></div></Popup>
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
                            <h3 className="text-lg font-bold text-white mb-2">Confirm Rescue</h3>
                            <p className="text-sm text-slate-300 mb-3">Confirm that this animal has been successfully rescued.</p>

                            <div className="space-y-2.5 mb-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Contact Number (Optional)</label>
                                    <input type="tel" value={foundContact} onChange={(e) => setFoundContact(e.target.value)} placeholder="Your contact number" className="input-field text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">Notes (Optional)</label>
                                    <textarea value={foundNotes} onChange={(e) => setFoundNotes(e.target.value)} placeholder="Additional details about the rescue..." rows="3" className="input-field text-sm" />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={confirmMarkRescued} disabled={isSubmitting} className="btn-primary flex-1 text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed">
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

export default AnimalRescueDetail;
