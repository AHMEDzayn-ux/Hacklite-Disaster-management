import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '@/lib/leafletIconFix';
import { defaultMapConfig } from '@/lib/mapConfig';
import MapResizeFix from '@/components/map/MapResizeFix';
import { SURFACE, FOCUS, LABEL, VALUE, TONES, DOTS, describeWeather } from '@/lib/detailKit';
import {
    IconArrowLeft,
    IconExternalLink,
    IconMaximize,
    IconX,
    IconMapPin,
    IconThermometer,
    IconDroplet,
    IconWind,
    IconCloud,
} from '@/components/icons/Icons';

/**
 * Detail Kit — the shared presentation layer for every incident/record detail
 * page (disaster, missing person, animal rescue, relief camp).
 *
 * Design contract, applied identically by every consumer:
 *   • 8px spacing scale only — p-2 / p-3 / p-4 / gap-2 / gap-3 / gap-4.
 *   • One card style: 8px radius, 1px border, sm shadow, 12px body padding,
 *     a 32px title bar. No glassmorphism, no gradients, no oversized icons.
 *   • Icons are 14-18px, never decorative-large. Colour is reserved for
 *     meaning: red = critical, amber = warning, green = resolved, blue =
 *     primary action / informational. Everything else is neutral grey.
 *   • Type scale: page title 20-24px semibold, card title 14px semibold,
 *     label 12px grey, value 15px semibold, body 14px, timeline 13px.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Compact status/severity pill. Small by design — never a banner. */
export function StatusChip({ tone = 'neutral', children, dot = true, className = '' }) {
    return (
        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded border px-2 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}>
            {dot && <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${DOTS[tone]}`} />}
            {children}
        </span>
    );
}

/** Tag-sized chip that takes only the space its label needs (needs, tags). */
export function Chip({ tone = 'neutral', icon, children }) {
    return (
        <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>
            {icon && <span className="text-[11px] leading-none">{icon}</span>}
            {children}
        </span>
    );
}

/**
 * The single card shape used across all detail pages: 32px title bar with a
 * 16px icon, a hairline divider, and a 12px body.
 */
export function InfoCard({ title, icon: Icon, right, children, className = '', bodyClassName = 'p-3' }) {
    return (
        <section className={`${SURFACE} flex flex-col ${className}`}>
            {title && (
                <header className="flex h-8 flex-shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-3 dark:border-white/10">
                    <h2 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {Icon && <Icon className="h-4 w-4 flex-shrink-0 text-slate-400" />}
                        <span className="truncate">{title}</span>
                    </h2>
                    {right && <div className="flex flex-shrink-0 items-center gap-1.5">{right}</div>}
                </header>
            )}
            <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
        </section>
    );
}

/** Label-above-value pair. Stack these in a `grid grid-cols-2 gap-x-4 gap-y-3`. */
export function KeyValueRow({ label, value, href, mono = false, capitalize = false, className = '' }) {
    const display = value == null || value === '' ? '—' : value;
    return (
        <div className={`min-w-0 ${className}`}>
            <dt className={LABEL}>{label}</dt>
            <dd className={`mt-0.5 break-words ${VALUE} ${mono ? 'font-mono text-[13px]' : ''} ${capitalize ? 'capitalize' : ''}`}>
                {href && value ? (
                    <a href={href} className={`rounded text-primary-700 underline-offset-2 hover:underline dark:text-primary-300 ${FOCUS}`}>{display}</a>
                ) : display}
            </dd>
        </div>
    );
}

/** Compact metric tile for a stat strip (people affected, capacity, …). */
export function MetricCard({ label, value, icon: Icon, tone }) {
    const accent = tone === 'critical' ? 'text-danger-600 dark:text-danger-400'
        : tone === 'warning' ? 'text-amber-600 dark:text-amber-400'
            : tone === 'success' ? 'text-success-600 dark:text-success-400'
                : 'text-slate-900 dark:text-slate-100';
    return (
        <div className="rounded border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-white/10 dark:bg-white/[0.03]">
            <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {Icon && <Icon className="h-3.5 w-3.5 flex-shrink-0" />}
                <span className="truncate">{label}</span>
            </p>
            <p className={`mt-0.5 truncate text-[15px] font-semibold leading-tight ${accent}`}>{value ?? '—'}</p>
        </div>
    );
}

/** One node of the vertical activity timeline. */
export function TimelineItem({ label, time, detail, tone = 'neutral', last = false }) {
    return (
        <li className="relative flex gap-2.5 pb-3 last:pb-0">
            {!last && <span className="absolute left-[7px] top-4 h-full w-px bg-slate-200 dark:bg-white/10" aria-hidden="true" />}
            <span className={`relative z-10 mt-1 h-[15px] w-[15px] flex-shrink-0 rounded-full border-2 border-white ring-1 dark:border-slate-900 ${DOTS[tone]} ${tone === 'neutral' ? 'ring-slate-300 dark:ring-white/20' : 'ring-transparent'}`} />
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{label}</p>
                    {time && <time className="flex-shrink-0 text-[12px] tabular-nums text-slate-500 dark:text-slate-400">{time}</time>}
                </div>
                {detail && <p className="mt-0.5 text-[12px] leading-snug text-slate-500 dark:text-slate-400">{detail}</p>}
            </div>
        </li>
    );
}

export function Timeline({ children }) {
    return <ol className="m-0 list-none p-0">{children}</ol>;
}

/**
 * Enterprise button: 36px tall, square-ish, no gradient.
 *
 * `primary` mirrors the app-wide `.btn-primary` (dark outline that inverts to
 * a solid fill on hover) rather than introducing a second primary style — the
 * rest of the app deliberately avoids a coloured primary fill.
 */
export function Button({ variant = 'secondary', icon: Icon, children, className = '', ...props }) {
    const styles = {
        primary: 'border-2 border-slate-900 bg-white text-slate-900 hover:bg-slate-900 hover:text-white font-semibold dark:border-white dark:bg-transparent dark:text-white dark:hover:bg-white dark:hover:text-slate-900',
        secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10',
        ghost: 'border border-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10',
    };
    return (
        <button
            type="button"
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${FOCUS} ${className}`}
            {...props}
        >
            {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
            {children}
        </button>
    );
}

/** Text-sized action used inside card title bars ("Open full map"). */
export function CardAction({ icon: Icon, children, ...props }) {
    return (
        <button
            type="button"
            className={`inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white ${FOCUS}`}
            {...props}
        >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {children}
        </button>
    );
}

// ---------------------------------------------------------------------------
// Page scaffolding
// ---------------------------------------------------------------------------

/** Flat neutral page background — no blobs, no dot grid, no blur. */
export function DetailShell({ children }) {
    return (
        <div className="min-h-[calc(100dvh-3rem)] bg-slate-100 font-sans dark:bg-slate-950">
            <div className="mx-auto w-full max-w-[1600px] px-3 pb-6 sm:px-4 lg:px-6">{children}</div>
        </div>
    );
}

/**
 * Sticky command bar: identity on the left, live status in the middle, the
 * primary action on the right. Sits directly under the 48px app navbar so it
 * stays reachable while the operator scrolls.
 */
export function DetailHeader({ icon: Icon, iconTone = 'neutral', title, subtitle, chips, meta, actions, backLabel = 'Back' }) {
    const navigate = useNavigate();
    return (
        <header className="sticky top-12 z-20 -mx-3 mb-3 border-b border-slate-200 bg-slate-100/95 px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4 lg:-mx-6 lg:px-6 dark:border-white/10 dark:bg-slate-950/95">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Button variant="ghost" icon={IconArrowLeft} onClick={() => navigate(-1)} className="!px-2">
                    <span className="hidden sm:inline">{backLabel}</span>
                </Button>

                <div className="h-6 w-px bg-slate-300 dark:bg-white/10" aria-hidden="true" />

                {Icon && (
                    <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border ${TONES[iconTone]}`}>
                        <Icon className="h-[18px] w-[18px]" />
                    </span>
                )}

                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="truncate text-xl font-semibold leading-tight text-slate-900 sm:text-2xl dark:text-white">{title}</h1>
                        {chips}
                    </div>
                    {(subtitle || meta) && (
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {subtitle && <span className="font-medium">{subtitle}</span>}
                            {meta}
                        </p>
                    )}
                </div>

                {actions && <div className="ml-auto flex flex-shrink-0 items-center gap-2">{actions}</div>}
            </div>
        </header>
    );
}

/** Inline separator for the header meta line. */
export function MetaDot() {
    return <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">•</span>;
}

export function DetailLoading({ label = 'Loading record…' }) {
    return (
        <div className="flex min-h-dvh items-center justify-center bg-slate-100 dark:bg-slate-950">
            <div className="text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
            </div>
        </div>
    );
}

export function DetailNotFound({ title, message }) {
    const navigate = useNavigate();
    return (
        <div className="flex min-h-dvh items-center justify-center bg-slate-100 px-4 dark:bg-slate-950">
            <div className={`${SURFACE} max-w-sm p-6 text-center`}>
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message}</p>
                <Button variant="primary" icon={IconArrowLeft} onClick={() => navigate(-1)} className="mx-auto mt-4">Go back</Button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Composite panels shared by every detail page
// ---------------------------------------------------------------------------

/** Fullscreen overlay used by the photo and map "expand" actions. */
export function Overlay({ title, onClose, children }) {
    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-950/90 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
            <div className="mb-2 flex flex-shrink-0 items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold text-white">{title}</p>
                <Button variant="secondary" icon={IconX} onClick={onClose}>Close</Button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-lg bg-slate-900">{children}</div>
        </div>
    );
}

/** Photo evidence — fixed 220px frame plus a full-size viewer. */
export function PhotoCard({ src, alt, title = 'Photo Evidence', icon }) {
    const [open, setOpen] = useState(false);
    if (!src) return null;
    return (
        <>
            <InfoCard
                title={title}
                icon={icon}
                bodyClassName="p-2"
                right={<CardAction icon={IconMaximize} onClick={() => setOpen(true)}>View full image</CardAction>}
            >
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className={`flex h-[220px] w-full items-center justify-center overflow-hidden rounded bg-slate-100 dark:bg-white/[0.03] ${FOCUS}`}
                    aria-label="Open full image"
                >
                    <img src={src} alt={alt} loading="lazy" className="max-h-full max-w-full object-contain" />
                </button>
            </InfoCard>
            {open && (
                <Overlay title={alt || title} onClose={() => setOpen(false)}>
                    <div className="flex h-full w-full items-center justify-center p-2">
                        <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
                    </div>
                </Overlay>
            )}
        </>
    );
}

/**
 * Four-metric weather strip. Small icons, tabular values, no nested boxes.
 * Lives in the wide left column, so nothing here truncates — "Temperature"
 * and "Partly Cloudy" render in full rather than as "Temper…"/"Partly C…".
 */
export function WeatherCard({ weather, loading, title = 'Weather at Site', icon = IconCloud }) {
    const metrics = weather ? [
        { icon: IconThermometer, label: 'Temperature', value: `${weather.temperature_2m}°C` },
        { icon: IconDroplet, label: 'Humidity', value: `${weather.relative_humidity_2m}%` },
        { icon: IconWind, label: 'Wind', value: `${weather.wind_speed_10m} km/h` },
        { icon: IconCloud, label: 'Sky', value: describeWeather(weather.weather_code) },
    ] : [];

    return (
        <InfoCard title={title} icon={icon} bodyClassName="p-2">
            {loading ? (
                <p className="py-3 text-center text-xs text-slate-500 dark:text-slate-400">Loading conditions…</p>
            ) : weather ? (
                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {metrics.map(m => (
                        <div key={m.label} className="min-w-0 rounded border border-slate-200 bg-slate-50 px-2 py-1.5 dark:border-white/10 dark:bg-white/[0.03]">
                            <dt className="flex items-center gap-1 text-[11px] font-medium leading-tight text-slate-500 dark:text-slate-400">
                                <m.icon className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>{m.label}</span>
                            </dt>
                            <dd className="mt-0.5 break-words text-[15px] font-semibold tabular-nums leading-tight text-slate-900 dark:text-slate-100">{m.value}</dd>
                        </div>
                    ))}
                </dl>
            ) : (
                <p className="py-3 text-center text-xs text-slate-500 dark:text-slate-400">Conditions unavailable</p>
            )}
        </InfoCard>
    );
}

/**
 * Location card: address block, a 260px map, coordinates and an external
 * Google Maps hand-off. The map never grows past its frame.
 */
export function LocationCard({ lat, lng, title = 'Location', label, address, children, mapHeight = 'h-[260px]' }) {
    const [expanded, setExpanded] = useState(false);
    const hasCoords = lat != null && lng != null;

    const map = (interactive = false) => (
        <MapContainer
            center={hasCoords ? [lat, lng] : defaultMapConfig.center}
            zoom={hasCoords ? 15 : defaultMapConfig.zoom}
            minZoom={defaultMapConfig.minZoom}
            maxZoom={defaultMapConfig.maxZoom}
            maxBounds={defaultMapConfig.maxBounds}
            maxBoundsViscosity={defaultMapConfig.maxBoundsViscosity}
            scrollWheelZoom={interactive}
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapResizeFix />
            {hasCoords && (
                <Marker position={[lat, lng]}>
                    <Popup>
                        <p className="text-xs font-semibold">{label || 'Reported location'}</p>
                        {address && <p className="text-xs text-gray-600">{address}</p>}
                    </Popup>
                </Marker>
            )}
        </MapContainer>
    );

    return (
        <>
            <InfoCard
                title={title}
                icon={IconMapPin}
                bodyClassName="p-2"
                right={hasCoords && <CardAction icon={IconMaximize} onClick={() => setExpanded(true)}>Open full map</CardAction>}
            >
                {children && <div className="mb-2 px-1">{children}</div>}

                <div className={`relative ${mapHeight} overflow-hidden rounded border border-slate-200 dark:border-white/10`} style={{ zIndex: 0 }}>
                    {map(false)}
                    {!hasCoords && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/20">
                            <p className="rounded bg-slate-900/90 px-2 py-1 text-xs font-medium text-white">No coordinates recorded</p>
                        </div>
                    )}
                </div>

                {hasCoords && (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1">
                        <p className="font-mono text-[12px] text-slate-500 dark:text-slate-400">
                            {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
                        </p>
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-primary-700 hover:underline dark:text-primary-300 ${FOCUS}`}
                        >
                            <IconExternalLink className="h-3.5 w-3.5" /> Google Maps
                        </a>
                    </div>
                )}
            </InfoCard>

            {expanded && (
                <Overlay title={label || address || 'Location'} onClose={() => setExpanded(false)}>
                    <div className="h-full w-full">{map(true)}</div>
                </Overlay>
            )}
        </>
    );
}

/**
 * Shared confirmation modal for the resolve/found/rescued actions.
 * `wide` widens it and lets the body scroll — for multi-field forms such as a
 * missing person case closure, which does not fit the default one-input size.
 */
export function ConfirmDialog({ title, description, confirmLabel = 'Confirm', onConfirm, onCancel, submitting = false, wide = false, children }) {
    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape' && !submitting) onCancel(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onCancel, submitting]);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <div className={`flex max-h-[90vh] w-full flex-col rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-900 ${wide ? 'max-w-xl' : 'max-w-md'}`}>
                <header className="flex h-10 flex-shrink-0 items-center border-b border-slate-200 px-4 dark:border-white/10">
                    <h2 id="confirm-title" className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
                </header>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">{description}</p>
                    {children}
                </div>
                <footer className="flex flex-shrink-0 justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-white/10">
                    <Button variant="secondary" onClick={onCancel} disabled={submitting}>Cancel</Button>
                    <Button variant="primary" onClick={onConfirm} disabled={submitting}>
                        {submitting ? 'Saving…' : confirmLabel}
                    </Button>
                </footer>
            </div>
        </div>
    );
}

/** Labelled input used inside ConfirmDialog. */
export function Field({ label, children }) {
    return (
        <label className="block">
            <span className={`mb-1 block ${LABEL}`}>{label}</span>
            {children}
        </label>
    );
}
