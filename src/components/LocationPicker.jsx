import React, { useState, useEffect } from 'react';
import { IconMap, IconMapPin, IconInfo } from './icons/Icons';

/**
 * LocationPicker Component
 * Compatible with any map API - currently configured for Leaflet/OpenStreetMap (free, no API key)
 * Can be easily swapped to Google Maps, Mapbox, or other providers
 */
function LocationPicker({ value, onChange, label = "Location", required = false, error }) {
    const [showMap, setShowMap] = useState(false);
    const [position, setPosition] = useState(null);
    const [mapInstance, setMapInstance] = useState(null);
    const [address, setAddress] = useState(value?.address || '');

    // Get user's current location
    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const newPosition = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        address: `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`
                    };
                    setPosition(newPosition);
                    setAddress(newPosition.address);
                    onChange(newPosition);
                },
                (err) => {
                    alert('Unable to get your location. Please enter manually or enable location services.');
                }
            );
        } else {
            alert('Geolocation is not supported by your browser.');
        }
    };

    // Initialize map when shown
    useEffect(() => {
        if (showMap && !mapInstance) {
            loadMap();
        }
    }, [showMap]);

    const loadMap = async () => {
        // Dynamic import of Leaflet - only loads when needed
        try {
            const L = await import('leaflet');
            await import('leaflet/dist/leaflet.css');
            const { markerIcon, markerIcon2x, markerShadow } = await import('../utils/leafletIconFix');

            // Fix default icon issue with webpack/vite
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: markerIcon2x,
                iconUrl: markerIcon,
                shadowUrl: markerShadow,
            });

            // Default to Sri Lanka center
            const defaultCenter = position || { lat: 7.8731, lng: 80.7718 };

            const map = L.map('location-map').setView([defaultCenter.lat, defaultCenter.lng], position ? 13 : 7);

            // Using OpenStreetMap (free, no API key required)
            // Can be replaced with Google Maps, Mapbox, etc.
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            let marker = null;
            if (position) {
                marker = L.marker([position.lat, position.lng]).addTo(map);
            }

            // Click to set location
            map.on('click', (e) => {
                const newPosition = {
                    lat: e.latlng.lat,
                    lng: e.latlng.lng,
                    address: `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`
                };

                if (marker) {
                    marker.setLatLng(e.latlng);
                } else {
                    marker = L.marker(e.latlng).addTo(map);
                }

                setPosition(newPosition);
                setAddress(newPosition.address);
                onChange(newPosition);
            });

            setMapInstance(map);
        } catch (error) {
            console.error('Failed to load map:', error);
            alert('Map failed to load. Please enter location manually.');
        }
    };

    // Manual text input handler
    const handleManualInput = (e) => {
        const text = e.target.value;
        setAddress(text);
        onChange({
            address: text,
            lat: null,
            lng: null
        });
    };

    return (
        <div>
            <label className="block text-slate-200 font-medium mb-2">
                {label} {required && <span className="text-danger-500">*</span>}
            </label>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
                <button
                    type="button"
                    onClick={() => setShowMap(!showMap)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white rounded-lg shadow-md shadow-primary-500/20 hover:bg-primary-600 hover:shadow-lg hover:shadow-primary-500/30 transition-all text-sm"
                >
                    <IconMap className="h-4 w-4" />
                    {showMap ? 'Enter Manually' : 'Pick on Map'}
                </button>
                <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="flex items-center gap-1.5 px-4 py-2 bg-success-500 text-white rounded-lg shadow-md shadow-success-500/20 hover:bg-success-600 hover:shadow-lg hover:shadow-success-500/30 transition-all text-sm"
                >
                    <IconMapPin className="h-4 w-4" />
                    Use My Location
                </button>
            </div>

            {/* Map Container */}
            {showMap ? (
                <div className="mb-3">
                    <div
                        id="location-map"
                        className="w-full h-64 rounded-xl border border-white/15 overflow-hidden shadow-xl"
                    ></div>
                    <p className="flex items-center gap-1.5 text-sm text-slate-400 mt-2">
                        <IconInfo className="h-4 w-4 flex-shrink-0 text-slate-500" />
                        Click anywhere on the map to set the location
                    </p>
                </div>
            ) : (
                /* Manual Text Input */
                <input
                    type="text"
                    value={address}
                    onChange={handleManualInput}
                    className="input-field"
                    placeholder="Enter location or use map"
                />
            )}

            {/* Display Coordinates */}
            {position?.lat && position?.lng && (
                <div className="flex items-center gap-1.5 mt-2 p-2 bg-success-500/10 border border-success-400/30 text-success-300 rounded text-sm">
                    <IconMapPin className="h-4 w-4 flex-shrink-0" />
                    Coordinates: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <span className="text-danger-400 text-sm mt-1 block">
                    {error}
                </span>
            )}

            <p className="text-xs text-slate-500 mt-1">
                Map works offline if cached. Coordinates are more accurate.
            </p>
        </div>
    );
}

export default LocationPicker;
