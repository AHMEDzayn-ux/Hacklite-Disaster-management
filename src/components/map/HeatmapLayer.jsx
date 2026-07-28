import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

/**
 * Thin react-leaflet wrapper around leaflet.heat (not a native react-leaflet
 * component) - renders the disaster density/damage heatmap on the Emergency
 * Command Dashboard, weighted by each point's damage_index.
 *
 * points: [{ lat, lng, weight }]
 */
function HeatmapLayer({ points, options = {} }) {
    const map = useMap();

    useEffect(() => {
        if (!points || points.length === 0) return undefined;

        const heatPoints = points.map(p => [p.lat, p.lng, p.weight ?? 0.5]);
        const layer = L.heatLayer(heatPoints, {
            radius: 30,
            blur: 25,
            maxZoom: 12,
            max: 1.0,
            gradient: { 0.2: '#2563eb', 0.4: '#eab308', 0.6: '#f97316', 0.8: '#dc2626', 1.0: '#7f1d1d' },
            ...options,
        }).addTo(map);

        return () => { map.removeLayer(layer); };
    }, [map, points, options]);

    return null;
}

export default HeatmapLayer;
