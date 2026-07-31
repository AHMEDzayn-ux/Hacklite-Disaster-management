import { useEffect, useState } from 'react';

/**
 * Design tokens, formatters and data hooks behind the detail-page kit
 * (`@/components/detail/DetailKit`). Kept out of the component file so that
 * file only exports components (react-refresh/only-export-components).
 */

// ---------------------------------------------------------------------------
// Tokens — one card shape, one focus ring, one type scale, five tones
// ---------------------------------------------------------------------------

export const SURFACE =
    'rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]';

export const FOCUS =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-950';

export const LABEL = 'text-xs font-medium text-slate-500 dark:text-slate-400';
export const VALUE = 'text-[15px] font-semibold text-slate-900 dark:text-slate-100';

export const INPUT =
    'w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500';

/** Semantic chip tones. Deliberately few — colour must stay meaningful. */
export const TONES = {
    critical: 'border-danger-200 bg-danger-50 text-danger-700 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-300',
    warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
    success: 'border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300',
    info: 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-primary-300',
    neutral: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300',
};

export const DOTS = {
    critical: 'bg-danger-500',
    warning: 'bg-amber-500',
    success: 'bg-success-500',
    info: 'bg-primary-500',
    neutral: 'bg-slate-400',
};

// ---------------------------------------------------------------------------
// Formatting — every detail page reads dates identically
// ---------------------------------------------------------------------------

export const formatDateTime = value => {
    if (!value) return 'N/A';
    const d = new Date(value);
    if (isNaN(d)) return 'N/A';
    return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
};

export const formatTime = value => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d)) return '';
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

export const timeSince = value => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d)) return '';
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
};

// ---------------------------------------------------------------------------
// Weather — one fetch and one code table for all pages
// ---------------------------------------------------------------------------

const WEATHER_CODES = {
    0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Foggy', 51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
    61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain', 71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow',
    80: 'Rain Showers', 81: 'Rain Showers', 82: 'Heavy Showers', 95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm',
};

export const describeWeather = code => WEATHER_CODES[code] || 'Unknown';

/**
 * Current conditions at a coordinate (Open-Meteo, no API key required).
 *
 * `loading` is derived by comparing the coordinate we have a result for
 * against the one being asked about, so the effect only ever writes state
 * from its async callbacks — no synchronous setState, no cascading render.
 */
export function useWeather(lat, lng) {
    const key = lat != null && lng != null ? `${lat},${lng}` : null;
    const [result, setResult] = useState({ key: null, weather: null });

    useEffect(() => {
        if (!key) return undefined;
        let cancelled = false;
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`)
            .then(res => res.json())
            .then(data => { if (!cancelled) setResult({ key, weather: data.current ?? null }); })
            .catch(err => {
                console.error('Weather fetch error:', err);
                if (!cancelled) setResult({ key, weather: null });
            });
        return () => { cancelled = true; };
        // lat/lng are the two halves of `key` — re-running on key alone is correct.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    const settled = result.key === key;
    return { weather: settled ? result.weather : null, loading: Boolean(key) && !settled };
}
