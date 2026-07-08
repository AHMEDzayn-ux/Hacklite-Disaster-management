// Thin client for OSRM's free public routing API - real road-network
// distances/durations rather than Haversine straight-line distance. Same
// "call a free public API via fetch" pattern already used for OSM Nominatim
// geocoding in sms-report/index.ts. No API key required.
//
// Production note: the public demo server (router.project-osrm.org) is
// rate-limited and not meant for high-volume production traffic; a
// self-hosted OSRM instance is the natural upgrade path if usage grows, with
// zero code changes here beyond the base URL.

import type { LatLng } from './geo.ts';
export type { LatLng };

const OSRM_BASE_URL = Deno.env.get('OSRM_BASE_URL') ?? 'https://router.project-osrm.org';

export interface OsrmRouteResult {
    distanceKm: number;
    durationMin: number;
    geometry: unknown; // GeoJSON LineString, consumed directly by react-leaflet Polyline
}

export interface OsrmTableResult {
    /** distances[i][j] in km between points[i] and points[j] */
    distances: number[][];
    durations: number[][];
}

function coordsParam(points: LatLng[]): string {
    return points.map(p => `${p.lng},${p.lat}`).join(';');
}

/** Single origin -> destination road route. */
export async function getRoute(origin: LatLng, destination: LatLng): Promise<OsrmRouteResult | null> {
    try {
        const url = `${OSRM_BASE_URL}/route/v1/driving/${coordsParam([origin, destination])}?overview=full&geometries=geojson`;
        const response = await fetch(url);
        if (!response.ok) {
            console.error('OSRM route error:', response.status);
            return null;
        }
        const result = await response.json();
        const route = result.routes?.[0];
        if (!route) return null;
        return {
            distanceKm: route.distance / 1000,
            durationMin: route.duration / 60,
            geometry: route.geometry,
        };
    } catch (error) {
        console.error('OSRM route call failed:', error);
        return null;
    }
}

/** Full pairwise distance/duration matrix for multi-stop route optimization. */
export async function getDistanceMatrix(points: LatLng[]): Promise<OsrmTableResult | null> {
    try {
        const url = `${OSRM_BASE_URL}/table/v1/driving/${coordsParam(points)}?annotations=distance,duration`;
        const response = await fetch(url);
        if (!response.ok) {
            console.error('OSRM table error:', response.status);
            return null;
        }
        const result = await response.json();
        if (!result.distances || !result.durations) return null;
        return {
            distances: result.distances.map((row: number[]) => row.map(d => d / 1000)),
            durations: result.durations.map((row: number[]) => row.map(d => d / 60)),
        };
    } catch (error) {
        console.error('OSRM table call failed:', error);
        return null;
    }
}

// Haversine fallback (for when OSRM is unreachable) now lives in ./geo.ts so
// it has no Deno/environment dependency and can be reused (and unit tested)
// anywhere a straight-line distance is needed - re-exported here for
// backwards-compatible imports.
export { haversineKm } from './geo.ts';
