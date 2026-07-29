import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '@/lib/leafletIconFix';
import { redIcon, orangeIcon, greenIcon, blueIcon, greyIcon } from '@/lib/leafletIconFix';
import { Donut, VBars, HBars, TrendLine, CHART_COLORS } from '@/components/ui/Charts';
import { useMissingPersonStore, useDisasterStore, useAnimalRescueStore, useCampStore } from '@/store';
import { defaultMapConfig, sriLankaFitBounds, districtBounds, allDistricts } from '@/lib/mapConfig';
import {
    IconGrid,
    IconBolt,
    IconSearch,
    IconInfo,
    IconSiren,
    IconUserSearch,
    IconPawPrint,
    IconTent,
    IconMap,
    IconMapPin,
    IconClock,
    IconCheck,
} from '@/components/icons/Icons';

/**
 * Responder Dashboard — AI-assisted Emergency Operations Center
 * =============================================================
 * A single operational pane for responders: mission KPIs, a live incident
 * map, a client-side "AI" layer (operational summary, hotspot detection,
 * duplicate clustering, resource recommendations and insights all derived
 * from the live report data — the /respond route is public, so the admin
 * agent tables are intentionally not used here), category deep-dives, and a
 * live activity timeline.
 *
 * Everything is filterable by time window and district, and organized into
 * compact sub-views to keep scrolling minimal.
 */

// ---------------------------------------------------------------------------
// Pure helpers (module scope so they never re-create per render)
// ---------------------------------------------------------------------------

const MS = { hour: 3600e3, day: 86400e3 };

const hoursSince = ds => (ds ? (Date.now() - new Date(ds).getTime()) / MS.hour : null);

const timeAgo = ds => {
    const h = hoursSince(ds);
    if (h == null || isNaN(h)) return '';
    if (h < 1) return `${Math.max(1, Math.round(h * 60))}m ago`;
    if (h < 24) return `${Math.round(h)}h ago`;
    return `${Math.floor(h / 24)}d ago`;
};

const fmtDuration = h => {
    if (h == null || isNaN(h)) return '—';
    if (h < 1) return `${Math.round(h * 60)}m`;
    if (h < 48) return `${h.toFixed(1)}h`;
    return `${(h / 24).toFixed(1)}d`;
};

const districtFromAddress = address => {
    if (!address) return null;
    const lower = address.toLowerCase();
    return allDistricts.find(d => lower.includes(d.toLowerCase())) || null;
};

const districtFromLatLng = (lat, lng) => {
    if (lat == null || lng == null) return null;
    for (const [name, [[minLat, minLng], [maxLat, maxLng]]] of Object.entries(districtBounds)) {
        if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) return name;
    }
    return null;
};

const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const isResolved = status => String(status || '').toLowerCase() === 'resolved';

// Normalize every report type into one incident shape for cross-category work.
const normalize = (disasters, missingPersons, animalRescues) => {
    const out = [];
    disasters.forEach(d => {
        const loc = d.location || {};
        out.push({
            id: d.id, kind: 'disaster', type: d.disaster_type || 'other', severity: d.severity,
            status: d.status, created_at: d.created_at, resolvedAt: d.resolved_at,
            lat: loc.lat, lng: loc.lng, address: loc.address, description: d.description,
            damage: d.damage_index, link: `/disasters-list/${d.id}`,
            title: `${cap((d.disaster_type || 'Disaster').replace('-', ' '))}`,
        });
    });
    missingPersons.forEach(p => {
        const loc = p.last_seen_location || {};
        out.push({
            id: p.id, kind: 'missing', type: 'missing', status: p.status,
            created_at: p.created_at, resolvedAt: p.found_at, seenAt: p.last_seen_date,
            lat: loc.lat, lng: loc.lng, address: loc.address, description: p.description,
            link: `/missing-persons-list/${p.id}`,
            title: `${p.name || 'Missing person'}${p.age != null ? `, ${p.age}` : ''}`,
            raw: p,
        });
    });
    animalRescues.forEach(a => {
        const loc = a.location || {};
        out.push({
            id: a.id, kind: 'animal', type: a.animal_type || 'other', condition: a.condition,
            status: a.status, created_at: a.created_at, resolvedAt: a.found_at,
            lat: loc.lat, lng: loc.lng, address: loc.address, description: a.description,
            link: `/animal-rescue-list/${a.id}`,
            title: `${cap(a.animal_type || 'Animal')} rescue`,
            raw: a,
        });
    });
    out.forEach(i => {
        i.district = i.district || districtFromAddress(i.address) || districtFromLatLng(i.lat, i.lng);
        i.active = !isResolved(i.status);
    });
    return out;
};

const RANGE_CONF = {
    '24h': { count: 24, ms: MS.hour, label: '24 hours' },
    '7d': { count: 7, ms: MS.day, label: '7 days' },
    '30d': { count: 30, ms: MS.day, label: '30 days' },
};

// Bucket records into a time-series ending "now" for the chosen range.
const bucketize = (records, range, getDate) => {
    const { count, ms } = RANGE_CONF[range];
    const now = Date.now();
    const counts = new Array(count).fill(0);
    const labels = [];
    for (let i = 0; i < count; i++) {
        const t = now - (count - 1 - i) * ms;
        const dt = new Date(t);
        labels.push(range === '24h' ? `${dt.getHours()}:00` : `${dt.getMonth() + 1}/${dt.getDate()}`);
    }
    records.forEach(r => {
        const raw = getDate(r);
        if (!raw) return;
        const t = new Date(raw).getTime();
        if (isNaN(t)) return;
        const idxFromEnd = Math.floor((now - t) / ms);
        if (idxFromEnd < 0 || idxFromEnd >= count) return;
        counts[count - 1 - idxFromEnd]++;
    });
    return { counts, labels };
};

const countInWindow = (records, spanMs, getDate, offset = 0) => {
    const now = Date.now();
    const start = now - spanMs * (offset + 1);
    const end = now - spanMs * offset;
    return records.filter(r => {
        const t = new Date(getDate(r)).getTime();
        return !isNaN(t) && t > start && t <= end;
    }).length;
};

const RESOURCE_KEYWORDS = {
    Food: ['food', 'hungry', 'meal', 'ration', 'rice', 'starv'],
    Water: ['water', 'drink', 'thirst', 'dehydr'],
    Medicine: ['medicine', 'medical', 'medic', 'injur', 'sick', 'wound', 'doctor', 'hospital'],
    Shelter: ['shelter', 'homeless', 'roof', 'tent', 'stranded', 'displac'],
    'Rescue Boats': ['boat', 'submerg', 'trapped', 'stuck', 'flood', 'drown'],
    'Medical Teams': ['ambulance', 'paramedic', 'casualt', 'emergency care', 'critical'],
};

const topN = (obj, n) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);

const KIND_META = {
    disaster: { label: 'Disasters', icon: '🚨', color: CHART_COLORS[1], marker: redIcon },
    missing: { label: 'Missing Persons', icon: '🔍', color: CHART_COLORS[3], marker: orangeIcon },
    animal: { label: 'Animal Rescues', icon: '🐾', color: CHART_COLORS[2], marker: greenIcon },
    camp: { label: 'Relief Camps', icon: '⛺', color: CHART_COLORS[0], marker: blueIcon },
};

// ---------------------------------------------------------------------------
// Small presentational primitives
// ---------------------------------------------------------------------------

function Card({ title, icon: Icon, right, children, className = '' }) {
    return (
        <div className={`rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-md shadow-xl p-4 hover:border-white/20 ${className}`}>
            {(title || right) && (
                <div className="flex items-center justify-between mb-3 gap-2 flex-shrink-0">
                    {title && (
                        <h3 className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white text-sm truncate min-w-0">
                            {Icon && <Icon className="h-4 w-4 text-primary-300 flex-shrink-0" />}
                            <span className="truncate">{title}</span>
                        </h3>
                    )}
                    {right}
                </div>
            )}
            {children}
        </div>
    );
}

const ICON_BADGE = {
    primary: 'bg-primary-500/15 text-primary-300',
    danger: 'bg-danger-500/15 text-danger-300',
    success: 'bg-success-500/15 text-success-300',
    slate: 'bg-white/10 text-slate-300',
};

function KPI({ value, label, sub, accent = 'text-white', icon: Icon, iconColor = 'slate', onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={sub || undefined}
            className={`group flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] backdrop-blur-md px-2.5 py-2 text-left w-full transition-colors duration-150 ${onClick ? 'hover:border-white/25 hover:bg-white/[0.08] hover:shadow-lg' : 'cursor-default hover:border-white/20'}`}
        >
            {Icon && (
                <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${ICON_BADGE[iconColor]}`}>
                    <Icon className="h-3.5 w-3.5" />
                </span>
            )}
            <div className="min-w-0 leading-tight">
                <p className={`text-lg font-extrabold leading-none truncate ${accent}`}>{value}</p>
                <p className="text-[11px] font-medium text-slate-400 mt-0.5 truncate">{label}</p>
            </div>
        </button>
    );
}

function MiniStat({ value, label, accent = 'text-white' }) {
    return (
        <div className="rounded-xl bg-white/5 border border-white/10 px-2.5 py-2 text-center">
            <p className={`text-lg font-bold leading-none ${accent}`}>{value}</p>
            <p className="text-xs text-slate-400 mt-1 leading-tight">{label}</p>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Command Center (the EOC) — everything below the top-level category tabs
// ---------------------------------------------------------------------------

const SUBVIEWS = [
    { key: 'overview', label: 'Overview', icon: IconMap },
    { key: 'analytics', label: 'Analytics', icon: IconGrid },
    { key: 'categories', label: 'Categories', icon: IconSearch },
    { key: 'ai', label: 'AI Insights', icon: IconInfo },
];

function CommandCenter({ disasters, missingPersons, animalRescues, camps, loading }) {
    const navigate = useNavigate();
    const [range, setRange] = useState('7d');
    const [district, setDistrict] = useState('all');
    const [view, setView] = useState('overview');
    const [layers, setLayers] = useState({ disaster: true, missing: true, animal: true, camp: true });

    const A = useMemo(
        () => computeAnalytics({ disasters, missingPersons, animalRescues, camps, range, district }),
        [disasters, missingPersons, animalRescues, camps, range, district]
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-4 h-full min-h-0 flex-1">
            {/* Left: live incident map — Sri Lanka is tall/narrow, so this column is
                sized from the map's own aspect ratio rather than a fixed half-width,
                giving the space that would've been empty sea back to the right column. */}
            <div className="h-[50vh] lg:h-full lg:aspect-[3/5] min-h-0 flex flex-col flex-shrink-0">
                <MapPanel A={A} layers={layers} setLayers={setLayers} navigate={navigate} />
            </div>

            {/* Right: filter bar + KPIs / analytics / categories / AI insights */}
            <div className="flex-1 min-w-0 h-full min-h-0 flex flex-col gap-4">
                {/* Global filter bar */}
                <div className="rounded-2xl border border-white/10 bg-white/95 dark:bg-white/[0.05] backdrop-blur-md p-2 flex flex-wrap items-center gap-2 flex-shrink-0 z-20">
                    <div className="flex rounded-xl bg-white/5 border border-white/10 p-0.5">
                        {Object.keys(RANGE_CONF).map(r => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${range === r ? 'border-2 border-slate-900 dark:border-white text-slate-900 dark:text-white bg-white dark:bg-transparent' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                            >
                                {r === '24h' ? '24h' : r === '7d' ? '7 days' : '30 days'}
                            </button>
                        ))}
                    </div>
                    <select
                        value={district}
                        onChange={e => setDistrict(e.target.value)}
                        className="text-xs bg-white/5 border border-white/15 text-slate-900 dark:text-white rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400/50 transition-colors"
                    >
                        <option value="all" className="bg-slate-900 text-white">All districts</option>
                        {allDistricts.map(d => <option key={d} value={d} className="bg-slate-900 text-white">{d}</option>)}
                    </select>
                    <div className="ml-auto flex rounded-xl bg-white/5 border border-white/10 p-0.5">
                        {SUBVIEWS.map(s => (
                            <button
                                key={s.key}
                                onClick={() => setView(s.key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1 ${view === s.key ? 'border-2 border-slate-900 dark:border-white text-slate-900 dark:text-white bg-white dark:bg-transparent' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                            >
                                <s.icon className="h-3.5 w-3.5" /><span className="hidden sm:inline">{s.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto">
                    {view === 'overview' && <OverviewStats A={A} range={range} navigate={navigate} />}
                    {view === 'analytics' && <AnalyticsView A={A} />}
                    {view === 'categories' && <CategoriesView A={A} />}
                    {view === 'ai' && <AiView A={A} />}
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// OVERVIEW: mission KPIs, AI summary, live map, needs-attention, timeline
// ---------------------------------------------------------------------------

// Fits the map to Sri Lanka's coastline on mount using Leaflet's own
// fitBounds() rather than a guessed center/zoom, so the island fills the
// viewport regardless of the container's actual rendered size. minZoom is
// locked to whatever zoom that fit produces, so users can't zoom out past
// the island (maxBounds stays generous so it never fights the fit at load).
function FitSriLanka() {
    const map = useMap();
    useEffect(() => {
        const fit = () => {
            map.invalidateSize();
            map.fitBounds(sriLankaFitBounds, { padding: [4, 4] });
            map.setMinZoom(map.getZoom());
        };
        fit();
        // Window 'resize' only fires on actual browser resizes — our column width
        // is driven by flex/aspect-ratio layout (header wraps, tab switches, etc.)
        // which changes the container's real size without that event ever firing,
        // leaving fitBounds() centered on a stale size. Watch the container itself.
        const ro = new ResizeObserver(fit);
        ro.observe(map.getContainer());
        return () => ro.disconnect();
    }, [map]);
    return null;
}

function MapPanel({ A, layers, setLayers, navigate }) {
    return (
        <Card
            icon={IconMap}
            className="h-full flex flex-col"
            right={
                <div className="flex flex-1 gap-1">
                    {['disaster', 'missing', 'animal', 'camp'].map(k => (
                        <button
                            key={k}
                            onClick={() => setLayers(l => ({ ...l, [k]: !l[k] }))}
                            className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full border-[1.5px] bg-white text-slate-600 transition-colors duration-150 dark:bg-white/5 dark:text-slate-300 ${layers[k] ? '' : 'border-slate-200 opacity-50 hover:opacity-100 dark:border-white/10'}`}
                            style={layers[k] ? { borderColor: KIND_META[k].color } : undefined}
                        >
                            <span className="text-xs leading-none">{KIND_META[k].icon}</span> {A.map.counts[k]}
                        </button>
                    ))}
                </div>
            }
        >
            <div className="flex-1 min-h-0 h-full rounded-2xl border border-white/15 overflow-hidden shadow-xl">
                <MapContainer
                    center={defaultMapConfig.center}
                    zoom={defaultMapConfig.zoom}
                    minZoom={defaultMapConfig.minZoom}
                    maxZoom={defaultMapConfig.maxZoom}
                    maxBounds={defaultMapConfig.maxBounds}
                    maxBoundsViscosity={defaultMapConfig.maxBoundsViscosity}
                    style={{ height: '100%', width: '100%' }}
                    preferCanvas
                >
                    <FitSriLanka />
                    <TileLayer
                        attribution='&copy; OpenStreetMap'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {['disaster', 'missing', 'animal'].map(k => layers[k] && A.map.markers[k].map(m => (
                        <Marker key={`${k}-${m.id}`} position={[m.lat, m.lng]} icon={KIND_META[k].marker}>
                            <Popup>
                                <div className="text-xs">
                                    <p className="font-bold">{KIND_META[k].icon} {m.title}</p>
                                    {m.severity && <p>Severity: <strong className="capitalize">{m.severity}</strong></p>}
                                    {m.condition && <p>Condition: <strong className="capitalize">{m.condition}</strong></p>}
                                    <p className="text-gray-500">{m.address || m.district || 'Location on map'}</p>
                                    <p className="text-gray-500">Waiting: {timeAgo(m.created_at)} · {m.active ? 'Active' : 'Resolved'}</p>
                                    {m.description && <p className="text-gray-600 mt-1 line-clamp-2">{m.description}</p>}
                                    <button onClick={() => navigate(m.link)} className="mt-1 text-primary-600 font-semibold">Open report →</button>
                                </div>
                            </Popup>
                        </Marker>
                    )))}
                    {layers.camp && A.map.markers.camp.map(c => (
                        <Marker key={`camp-${c.id}`} position={[c.lat, c.lng]} icon={c.full ? greyIcon : blueIcon}>
                            <Popup>
                                <div className="text-xs">
                                    <p className="font-bold">⛺ {c.title}</p>
                                    <p className="text-gray-500">{c.district}</p>
                                    <p>Occupancy: <strong>{c.occ}/{c.cap}</strong> ({c.pct}%)</p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </Card>
    );
}

function OverviewStats({ A, range, navigate }) {
    return (
        <div className="flex flex-col gap-4 h-full min-h-0">
            {/* Mission KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 flex-shrink-0">
                <KPI value={A.kpi.activeReports} label="Active Reports" sub={`${A.kpi.newInWindow} new / ${RANGE_CONF[range].label}`} accent="text-primary-300" icon={IconBolt} iconColor="primary" />
                <KPI value={A.kpi.highPriority} label="High Priority" sub={`${A.kpi.critical} critical`} accent="text-danger-400" icon={IconSiren} iconColor="danger" />
                <KPI value={A.kpi.resolvedToday} label="Resolved 24h" accent="text-success-400" icon={IconCheck} iconColor="success" />
                <KPI value={A.kpi.activeMissing} label="Missing Persons" sub="active cases" accent="text-orange-400" icon={IconUserSearch} iconColor="orange" />
                <KPI value={A.kpi.activeAnimals} label="Animal Rescues" sub="pending" accent="text-emerald-400" icon={IconPawPrint} iconColor="emerald" />
                <KPI value={fmtDuration(A.kpi.avgResponseH)} label="Avg Response" sub="report → resolved" accent="text-white" icon={IconClock} iconColor="slate" />
            </div>

            {/* Needs attention */}
            <Card icon={IconBolt} title="Needs Immediate Attention" className="flex-1 min-h-0 flex flex-col">
                {A.urgentFeed.length === 0 ? (
                    <p className="text-sm text-slate-500 py-6 text-center">Nothing urgent in this scope right now.</p>
                ) : (
                    <div className="divide-y divide-white/10 -mx-1 flex-1 min-h-0 overflow-y-auto">
                        {A.urgentFeed.map(item => {
                            const isCritical = item.icon === '🚨';
                            const isHigh = item.icon === '⚠️';
                            const badge = item.kind === 'disaster'
                                ? { text: isCritical ? 'Critical' : 'High', tone: isCritical ? 'bg-danger-500/15 text-danger-300' : 'bg-amber-500/15 text-amber-300' }
                                : { text: 'Missing', tone: 'bg-primary-500/15 text-primary-300' };
                            return (
                                <div
                                    key={`${item.kind}-${item.id}`}
                                    onClick={() => navigate(item.link)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(item.link); } }}
                                    role="button"
                                    tabIndex={0}
                                    className="py-2 px-1 flex items-center justify-between gap-2 cursor-pointer hover:bg-white/5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-base flex-shrink-0">{item.icon}</span>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{item.title}</p>
                                            <p className="text-xs text-slate-400 truncate">{item.subtitle}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${badge.tone}`}>{badge.text}</span>
                                    <span className="text-xs font-medium text-slate-500 flex-shrink-0">{item.meta}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>
        </div>
    );
}

// ---------------------------------------------------------------------------
// ANALYTICS: distribution, priority, trends, resolution, response, district, resources
// ---------------------------------------------------------------------------

function AnalyticsView({ A }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card icon={IconGrid} title="Report Distribution">
                <Donut data={A.distribution} size={100} thickness={16} centerLabel={A.kpi.totalReports} centerSub="reports" />
            </Card>

            <Card icon={IconBolt} title="Priority Breakdown (active disasters)">
                <VBars data={A.priority} height={90} />
            </Card>

            <Card icon={IconBolt} title="Resolution Trend" right={<span className="text-xs text-slate-500">incoming vs resolved</span>}>
                <TrendLine
                    series={[
                        { label: 'Incoming', color: CHART_COLORS[3], values: A.trend.incoming },
                        { label: 'Resolved', color: CHART_COLORS[2], values: A.trend.resolved },
                    ]}
                    labels={A.trend.labels}
                />
            </Card>

            <Card icon={IconClock} title="Response Time" right={<span className="text-xs text-slate-500">avg hrs to resolve</span>}>
                <TrendLine series={[{ label: 'Avg response (h)', color: CHART_COLORS[5], values: A.responseTrend.values }]} labels={A.responseTrend.labels} height={110} />
            </Card>

            <Card icon={IconMapPin} title="District Analytics" right={<span className="text-xs text-slate-500">active reports</span>}>
                <HBars data={A.districtRanking} />
            </Card>

            <Card icon={IconGrid} title="Resource Demand" right={<span className="text-xs text-slate-500">from report text</span>}>
                <HBars data={A.resourceDemand} labelWidth={110} />
            </Card>
        </div>
    );
}

// ---------------------------------------------------------------------------
// CATEGORIES: missing / disaster / animal / camp deep-dives
// ---------------------------------------------------------------------------

function CategoriesView({ A }) {
    const c = A.categories;
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Missing persons */}
            <Card icon={IconUserSearch} title="Missing Person Analytics">
                <div className="grid grid-cols-3 gap-2 mb-3">
                    <MiniStat value={c.missing.total} label="Total" accent="text-slate-900 dark:text-white" />
                    <MiniStat value={c.missing.found} label="Found" accent="text-success-400" />
                    <MiniStat value={c.missing.searching} label="Searching" accent="text-slate-900 dark:text-white" />
                </div>
                <TrendLine series={[{ label: 'New cases', color: CHART_COLORS[3], values: c.missing.trend }]} labels={A.trend.labels} height={100} />
            </Card>

            {/* Disasters */}
            <Card icon={IconSiren} title="Disaster Analytics">
                <div className="grid grid-cols-4 gap-2 mb-3">
                    <MiniStat value={c.disaster.byType.flood || 0} label="Flood" accent="text-slate-900 dark:text-white" />
                    <MiniStat value={c.disaster.byType.landslide || 0} label="Landslide" accent="text-slate-900 dark:text-white" />
                    <MiniStat value={c.disaster.byType.fire || 0} label="Fire" accent="text-slate-900 dark:text-white" />
                    <MiniStat value={c.disaster.byType.cyclone || 0} label="Storm" accent="text-slate-900 dark:text-white" />
                </div>
                <Donut data={c.disaster.donut} size={92} thickness={14} centerLabel={c.disaster.donut.reduce((s, d) => s + d.value, 0)} centerSub="types" />
            </Card>

            {/* Animals */}
            <Card icon={IconPawPrint} title="Animal Rescue Analytics">
                <div className="grid grid-cols-3 gap-2 mb-3">
                    <MiniStat value={c.animal.pending} label="Pending" accent="text-slate-900 dark:text-white" />
                    <MiniStat value={c.animal.completed} label="Completed" accent="text-success-400" />
                    <MiniStat value={c.animal.total} label="Total" accent="text-slate-900 dark:text-white" />
                </div>
                <VBars data={c.animal.byType} height={80} />
            </Card>

            {/* Camps */}
            <Card icon={IconTent} title="Relief Camp Analytics">
                <div className="grid grid-cols-3 gap-2 mb-3">
                    <MiniStat value={c.camp.active} label="Active Camps" accent="text-slate-900 dark:text-white" />
                    <MiniStat value={`${c.camp.occupancyPct}%`} label="Occupancy" accent={c.camp.occupancyPct >= 85 ? 'text-danger-400' : 'text-slate-900 dark:text-white'} />
                    <MiniStat value={c.camp.nearFull} label="Near Full" accent="text-danger-400" />
                </div>
                <HBars data={c.camp.byDistrict} valueSuffix="%" max={100} />
            </Card>
        </div>
    );
}

// ---------------------------------------------------------------------------
// AI INSIGHTS: hotspots, duplicates, recommendations, insights
// ---------------------------------------------------------------------------

function AiView({ A }) {
    return (
        <div className="space-y-4">
            {/* Hotspots */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {A.hotspots.map((h, i) => (
                    <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-md p-3">
                        <p className="text-xs font-medium text-slate-400">{h.icon} {h.label}</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-white mt-1 truncate">{h.value}</p>
                        <p className="text-xs text-slate-500 truncate">{h.detail}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Operational insights */}
                <Card icon={IconInfo} title="AI Operational Insights">
                    {A.insights.length === 0 ? (
                        <p className="text-sm text-slate-500 py-4 text-center">Not enough data in this scope for insights.</p>
                    ) : (
                        <div className="space-y-2">
                            {A.insights.map((ins, i) => (
                                <div key={i} className={`flex gap-2 p-2 rounded-lg ${ins.tone}`}>
                                    <span className="text-base flex-shrink-0">{ins.icon}</span>
                                    <p className="text-xs leading-snug">{ins.text}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Duplicate detection */}
                <Card icon={IconSearch} title="Duplicate Report Detection" right={<span className="text-xs text-slate-500">{A.duplicates.length} cluster(s)</span>}>
                    {A.duplicates.length === 0 ? (
                        <p className="text-sm text-slate-500 py-4 text-center">No likely duplicate clusters detected.</p>
                    ) : (
                        <div className="space-y-2">
                            {A.duplicates.map((d, i) => (
                                <div key={i} className="border border-white/10 bg-white/5 rounded-lg p-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-semibold text-slate-900 dark:text-white">{d.icon} {d.title}</p>
                                        <span className="text-xs font-bold text-danger-300 bg-danger-500/15 rounded-full px-2 py-0.5">{d.count} reports</span>
                                    </div>
                                    <p className="text-xs text-slate-400">{d.location} · primary submitted {d.primaryAgo}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            {/* Resource recommendations */}
            <Card icon={IconBolt} title="AI Resource Recommendations">
                {A.recommendations.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">No recommendations — operations look balanced in this scope.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                        {A.recommendations.map((r, i) => (
                            <div key={i} className="border border-white/10 bg-white/5 rounded-lg p-2.5 flex flex-col">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{r.icon} {r.action}</p>
                                    <span className={`text-xs font-bold rounded-full px-1.5 py-0.5 flex-shrink-0 ${r.confidence >= 75 ? 'bg-success-500/15 text-success-300' : r.confidence >= 50 ? 'bg-amber-500/15 text-amber-300' : 'bg-white/10 text-slate-400'}`}>{r.confidence}%</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1 flex-1">{r.reason}</p>
                                <p className="text-xs text-slate-500 mt-1.5">⏱ {r.impact}</p>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
}

// ---------------------------------------------------------------------------
// The analytics engine — one pure function producing everything the views need
// ---------------------------------------------------------------------------

function computeAnalytics({ disasters, missingPersons, animalRescues, camps, range, district }) {
    const all = normalize(disasters, missingPersons, animalRescues);
    const inDistrict = i => district === 'all' || i.district === district;
    const incidents = all.filter(inDistrict);
    const active = incidents.filter(i => i.active);
    const span = RANGE_CONF[range].count * RANGE_CONF[range].ms;

    const activeDisasters = active.filter(i => i.kind === 'disaster');
    const activeMissing = active.filter(i => i.kind === 'missing');
    const activeAnimals = active.filter(i => i.kind === 'animal');

    const campList = camps.filter(c => district === 'all' || c.district === district);
    const activeCamps = campList.filter(c => !isResolved(c.status) || String(c.status).toLowerCase() === 'active');

    // ---- KPIs
    const critical = activeDisasters.filter(i => i.severity === 'critical').length;
    const highPriority = activeDisasters.filter(i => i.severity === 'critical' || i.severity === 'high').length;
    const resolvedIncidents = incidents.filter(i => !i.active && i.resolvedAt);
    const responseDurations = resolvedIncidents
        .map(i => (new Date(i.resolvedAt).getTime() - new Date(i.created_at).getTime()) / MS.hour)
        .filter(h => h >= 0 && !isNaN(h));
    const avgResponseH = responseDurations.length ? responseDurations.reduce((a, b) => a + b, 0) / responseDurations.length : null;

    const kpi = {
        activeReports: active.length,
        totalReports: incidents.length,
        newInWindow: countInWindow(incidents, span, i => i.created_at),
        critical,
        highPriority,
        resolvedToday: incidents.filter(i => !i.active && hoursSince(i.resolvedAt) != null && hoursSince(i.resolvedAt) <= 24).length,
        activeMissing: activeMissing.length,
        activeAnimals: activeAnimals.length,
        avgResponseH,
    };

    // ---- Distribution donut
    const distribution = [
        { label: 'Disasters', value: incidents.filter(i => i.kind === 'disaster').length, color: KIND_META.disaster.color },
        { label: 'Missing Persons', value: incidents.filter(i => i.kind === 'missing').length, color: KIND_META.missing.color },
        { label: 'Animal Rescues', value: incidents.filter(i => i.kind === 'animal').length, color: KIND_META.animal.color },
    ].filter(d => d.value > 0);

    // ---- Priority breakdown
    const sevCount = s => activeDisasters.filter(i => i.severity === s).length;
    const priority = [
        { label: 'Critical', value: sevCount('critical'), color: '#dc2626' },
        { label: 'High', value: sevCount('high'), color: '#64748b' },
        { label: 'Moderate', value: sevCount('moderate'), color: '#94a3b8' },
        { label: 'Low', value: sevCount('low'), color: '#cbd5e1' },
    ];

    // ---- Trends (incoming vs resolved) + labels
    const inc = bucketize(incidents, range, i => i.created_at);
    const res = bucketize(resolvedIncidents, range, i => i.resolvedAt);
    const trend = { labels: inc.labels, incoming: inc.counts, resolved: res.counts };

    // ---- Response-time-over-time (avg resolution hours per bucket)
    const { count, ms } = RANGE_CONF[range];
    const rtSum = new Array(count).fill(0);
    const rtN = new Array(count).fill(0);
    const now = Date.now();
    resolvedIncidents.forEach(i => {
        const t = new Date(i.resolvedAt).getTime();
        const idxFromEnd = Math.floor((now - t) / ms);
        if (idxFromEnd < 0 || idxFromEnd >= count) return;
        const dur = (t - new Date(i.created_at).getTime()) / MS.hour;
        if (dur < 0 || isNaN(dur)) return;
        const idx = count - 1 - idxFromEnd;
        rtSum[idx] += dur; rtN[idx]++;
    });
    const responseTrend = { labels: inc.labels, values: rtSum.map((s, i) => (rtN[i] ? Math.round(s / rtN[i]) : 0)) };

    // ---- District ranking (active reports per district)
    const districtCounts = {};
    active.forEach(i => { if (i.district) districtCounts[i.district] = (districtCounts[i.district] || 0) + 1; });
    const districtRanking = topN(districtCounts, 8).map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length] }));

    // ---- Resource demand (keyword extraction over report text)
    const resourceCounts = Object.fromEntries(Object.keys(RESOURCE_KEYWORDS).map(k => [k, 0]));
    active.forEach(i => {
        const text = (i.description || '').toLowerCase();
        if (!text) return;
        for (const [res_, kws] of Object.entries(RESOURCE_KEYWORDS)) {
            if (kws.some(k => text.includes(k))) resourceCounts[res_]++;
        }
    });
    const resourceDemand = Object.entries(resourceCounts)
        .map(([label, value], i) => ({ label, value, color: CHART_COLORS[i % CHART_COLORS.length] }))
        .sort((a, b) => b.value - a.value);

    // ---- Map data (cap markers per layer for performance)
    const CAP = 300;
    const geo = i => i.lat != null && i.lng != null;
    const toMarker = i => ({ id: i.id, lat: i.lat, lng: i.lng, title: i.title, severity: i.severity, condition: i.condition, address: i.address, district: i.district, created_at: i.created_at, active: i.active, description: i.description, link: i.link });
    const map = {
        counts: {
            disaster: activeDisasters.filter(geo).length,
            missing: activeMissing.filter(geo).length,
            animal: activeAnimals.filter(geo).length,
            camp: activeCamps.filter(c => c.latitude != null && c.longitude != null).length,
        },
        markers: {
            disaster: activeDisasters.filter(geo).slice(0, CAP).map(toMarker),
            missing: activeMissing.filter(geo).slice(0, CAP).map(toMarker),
            animal: activeAnimals.filter(geo).slice(0, CAP).map(toMarker),
            camp: activeCamps.filter(c => c.latitude != null && c.longitude != null).slice(0, CAP).map(c => {
                const cap_ = c.capacity || 0; const occ = c.current_occupancy || 0;
                const pct = cap_ > 0 ? Math.round((occ / cap_) * 100) : 0;
                return { id: c.id, lat: c.latitude, lng: c.longitude, title: c.name, district: c.district, cap: cap_, occ, pct, full: pct >= 90 };
            }),
        },
    };

    // ---- Needs attention feed
    const urgentDisasters = activeDisasters
        .filter(i => i.severity === 'critical' || i.severity === 'high')
        .sort((a, b) => (a.severity === 'critical' ? 0 : 1) - (b.severity === 'critical' ? 0 : 1) || new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 4)
        .map(i => ({ id: i.id, kind: 'disaster', icon: i.severity === 'critical' ? '🚨' : '⚠️', title: `${i.title} — ${i.severity}`, subtitle: i.address || i.district || 'Location unknown', meta: timeAgo(i.created_at), link: i.link }));
    const longestMissing = [...activeMissing]
        .sort((a, b) => new Date(a.seenAt || a.created_at) - new Date(b.seenAt || b.created_at))
        .slice(0, 3)
        .map(i => ({ id: i.id, kind: 'missing', icon: '🔍', title: i.title, subtitle: i.address || i.district || 'Location unknown', meta: timeAgo(i.seenAt || i.created_at).replace(' ago', ' missing'), link: i.link }));
    const urgentFeed = [...urgentDisasters, ...longestMissing];

    // ---- Live activity timeline
    const events = [];
    incidents.forEach(i => {
        events.push({ ts: new Date(i.created_at).getTime(), icon: KIND_META[i.kind].icon, color: KIND_META[i.kind].color, text: `${i.title} reported${i.district ? ` in ${i.district}` : ''}`, link: i.link });
        if (!i.active && i.resolvedAt) {
            events.push({ ts: new Date(i.resolvedAt).getTime(), icon: '✅', color: CHART_COLORS[2], text: `${i.title} resolved`, link: i.link });
        }
    });
    const timeline = events.filter(e => !isNaN(e.ts)).sort((a, b) => b.ts - a.ts).slice(0, 25).map(e => ({ ...e, time: timeAgo(new Date(e.ts).toISOString()) }));

    // ---- Categories deep-dive
    const allMissing = incidents.filter(i => i.kind === 'missing');
    const allAnimals = incidents.filter(i => i.kind === 'animal');
    const allDisasters = incidents.filter(i => i.kind === 'disaster');

    const NEUTRAL_SLOTS = CHART_COLORS.slice(3);
    const disByType = {};
    allDisasters.forEach(i => { disByType[i.type] = (disByType[i.type] || 0) + 1; });
    const disasterDonut = topN(disByType, 6).map(([label, value], i) => ({ label: cap(label.replace('-', ' ')), value, color: NEUTRAL_SLOTS[i % NEUTRAL_SLOTS.length] }));

    const animalTypeGroups = { Dogs: ['dog'], Cats: ['cat'], Livestock: ['cattle', 'goat'], Birds: ['bird'], Wildlife: ['wildlife'], Other: ['other'] };
    const animalByType = Object.entries(animalTypeGroups).map(([label, types], i) => ({
        label, color: NEUTRAL_SLOTS[i % NEUTRAL_SLOTS.length],
        value: allAnimals.filter(a => types.includes(a.type)).length,
    })).filter(d => d.value > 0);

    const campByDistrict = {};
    activeCamps.forEach(c => {
        const cap_ = c.capacity || 0, occ = c.current_occupancy || 0;
        if (cap_ > 0 && c.district) {
            const pct = Math.round((occ / cap_) * 100);
            campByDistrict[c.district] = Math.max(campByDistrict[c.district] || 0, pct);
        }
    });
    const totalCap = activeCamps.reduce((s, c) => s + (c.capacity || 0), 0);
    const totalOcc = activeCamps.reduce((s, c) => s + (c.current_occupancy || 0), 0);
    const nearFull = activeCamps.filter(c => c.capacity > 0 && c.current_occupancy / c.capacity >= 0.85);

    const categories = {
        missing: {
            total: allMissing.length,
            found: allMissing.filter(i => !i.active).length,
            searching: allMissing.filter(i => i.active).length,
            trend: bucketize(allMissing, range, i => i.created_at).counts,
        },
        disaster: { byType: disByType, donut: disasterDonut },
        animal: {
            total: allAnimals.length,
            pending: allAnimals.filter(i => i.active).length,
            completed: allAnimals.filter(i => !i.active).length,
            byType: animalByType,
        },
        camp: {
            active: activeCamps.length,
            occupancyPct: totalCap > 0 ? Math.round((totalOcc / totalCap) * 100) : 0,
            nearFull: nearFull.length,
            byDistrict: topN(campByDistrict, 6).map(([label, value]) => ({ label, value, color: value >= 85 ? CHART_COLORS[1] : CHART_COLORS[3] })),
        },
    };

    // ---- Hotspots
    const floodByDistrict = {};
    activeDisasters.filter(i => i.type === 'flood').forEach(i => { if (i.district) floodByDistrict[i.district] = (floodByDistrict[i.district] || 0) + 1; });
    const missingByDistrict = {};
    activeMissing.forEach(i => { if (i.district) missingByDistrict[i.district] = (missingByDistrict[i.district] || 0) + 1; });
    const animalByDistrict = {};
    activeAnimals.forEach(i => { if (i.district) animalByDistrict[i.district] = (animalByDistrict[i.district] || 0) + 1; });
    // rising: compare last window vs previous window per district
    const risingByDistrict = {};
    Object.keys(districtCounts).forEach(d => {
        const recs = active.filter(i => i.district === d);
        const cur = countInWindow(recs, span, i => i.created_at, 0);
        const prev = countInWindow(recs, span, i => i.created_at, 1);
        risingByDistrict[d] = cur - prev;
    });
    const topFlood = topN(floodByDistrict, 1)[0];
    const topMissing = topN(missingByDistrict, 1)[0];
    const topAnimal = topN(animalByDistrict, 1)[0];
    const topRising = Object.entries(risingByDistrict).sort((a, b) => b[1] - a[1])[0];
    const hotspots = [
        { icon: '🌊', label: 'Highest Flood Activity', value: topFlood ? topFlood[0] : '—', detail: topFlood ? `${topFlood[1]} active flood report(s)` : 'no flood reports' },
        { icon: '🔍', label: 'Missing Person Cluster', value: topMissing ? topMissing[0] : '—', detail: topMissing ? `${topMissing[1]} active case(s)` : 'no active cases' },
        { icon: '🐾', label: 'Largest Rescue Cluster', value: topAnimal ? topAnimal[0] : '—', detail: topAnimal ? `${topAnimal[1]} pending rescue(s)` : 'no pending rescues' },
        { icon: '📈', label: 'Fastest Rising Area', value: topRising && topRising[1] > 0 ? topRising[0] : '—', detail: topRising && topRising[1] > 0 ? `+${topRising[1]} vs previous window` : 'no rising trend' },
    ];

    // ---- Duplicate detection (same type, ~2km, active)
    const buckets = {};
    active.filter(geo).forEach(i => {
        const key = `${i.kind}:${i.type}@${Math.round(i.lat / 0.02)}_${Math.round(i.lng / 0.02)}`;
        (buckets[key] = buckets[key] || []).push(i);
    });
    const duplicates = Object.values(buckets)
        .filter(g => g.length >= 2)
        .sort((a, b) => b.length - a.length)
        .slice(0, 6)
        .map(g => {
            const primary = [...g].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];
            return { icon: KIND_META[primary.kind].icon, title: primary.title, count: g.length, location: primary.address || primary.district || 'nearby cluster', primaryAgo: timeAgo(primary.created_at) };
        });

    // ---- Operational insights (real deltas)
    const insights = [];
    const infoTone = 'bg-primary-500/15 text-primary-300';
    const warnTone = 'bg-amber-500/15 text-amber-300';
    const dangerTone = 'bg-danger-500/15 text-danger-300';
    const okTone = 'bg-success-500/15 text-success-300';

    const curTotal = countInWindow(incidents, span, i => i.created_at, 0);
    const prevTotal = countInWindow(incidents, span, i => i.created_at, 1);
    if (prevTotal > 0) {
        const pct = Math.round(((curTotal - prevTotal) / prevTotal) * 100);
        if (Math.abs(pct) >= 10) insights.push({ icon: pct > 0 ? '📈' : '📉', tone: pct > 0 ? warnTone : okTone, text: `Total reports ${pct > 0 ? 'rose' : 'fell'} ${Math.abs(pct)}% vs the previous ${RANGE_CONF[range].label} (${curTotal} vs ${prevTotal}).` });
    }
    const curFlood = countInWindow(activeDisasters.filter(i => i.type === 'flood'), span, i => i.created_at, 0);
    const prevFlood = countInWindow(activeDisasters.filter(i => i.type === 'flood'), span, i => i.created_at, 1);
    if (curFlood > prevFlood && curFlood > 0) insights.push({ icon: '🌊', tone: warnTone, text: `Flood reports are rising (${curFlood} this window vs ${prevFlood} previously)${topFlood ? `, concentrated in ${topFlood[0]}` : ''}.` });
    const trapped = active.filter(i => (i.description || '').toLowerCase().match(/trapped|stuck|stranded/)).length;
    if (trapped > 0) insights.push({ icon: '🆘', tone: dangerTone, text: `${trapped} active report(s) mention people trapped or stranded — prioritize rescue dispatch.` });
    const topResource = resourceDemand.find(r => r.value > 0);
    if (topResource) {
        const dByRes = {};
        active.forEach(i => { const t = (i.description || '').toLowerCase(); if (RESOURCE_KEYWORDS[topResource.label].some(k => t.includes(k)) && i.district) dByRes[i.district] = (dByRes[i.district] || 0) + 1; });
        const topD = topN(dByRes, 1)[0];
        insights.push({ icon: '📦', tone: infoTone, text: `${topResource.label} is the most-referenced need (${topResource.value} reports)${topD ? `, highest in ${topD[0]}` : ''}.` });
    }
    if (nearFull.length > 0) {
        const worst = [...nearFull].sort((a, b) => b.current_occupancy / b.capacity - a.current_occupancy / a.capacity)[0];
        insights.push({ icon: '⛺', tone: dangerTone, text: `${nearFull.length} camp(s) are ≥85% full. ${worst.name} is at ${Math.round((worst.current_occupancy / worst.capacity) * 100)}% capacity.` });
    }
    if (duplicates.length > 0) insights.push({ icon: '🔄', tone: infoTone, text: `${duplicates.length} likely duplicate cluster(s) detected${duplicates[0].location ? ` near ${duplicates[0].location}` : ''} — review to reduce redundant work.` });
    const totIn = trend.incoming.reduce((a, b) => a + b, 0), totRes = trend.resolved.reduce((a, b) => a + b, 0);
    if (totIn > 0) insights.push({ icon: totRes >= totIn ? '✅' : '⚠️', tone: totRes >= totIn ? okTone : warnTone, text: totRes >= totIn ? `Responders are keeping up: ${totRes} resolved vs ${totIn} incoming this window.` : `Backlog growing: ${totIn} incoming but only ${totRes} resolved this window.` });

    // ---- Resource recommendations
    const recommendations = [];
    if (topFlood && topFlood[1] > 0) recommendations.push({ icon: '🚤', action: `Deploy boat team to ${topFlood[0]}`, reason: `${topFlood[1]} active flood report(s)${trapped ? ` and ${trapped} trapped-people mention(s)` : ''} concentrated here.`, confidence: Math.min(90, 55 + topFlood[1] * 8), impact: 'Faster water rescues' });
    nearFull.slice(0, 2).forEach(c => recommendations.push({ icon: '⛺', action: `Open overflow capacity near ${c.district || c.name}`, reason: `${c.name} is at ${Math.round((c.current_occupancy / c.capacity) * 100)}% (${c.current_occupancy}/${c.capacity}).`, confidence: 80, impact: 'Prevents shelter overflow' }));
    const medDistricts = {};
    active.forEach(i => { const t = (i.description || '').toLowerCase(); if (RESOURCE_KEYWORDS.Medicine.some(k => t.includes(k)) && i.district) medDistricts[i.district] = (medDistricts[i.district] || 0) + 1; });
    const topMed = topN(medDistricts, 1)[0];
    if (topMed && topMed[1] >= 2) recommendations.push({ icon: '🚑', action: `Send medical team to ${topMed[0]}`, reason: `${topMed[1]} report(s) reference injuries or medical needs.`, confidence: Math.min(85, 50 + topMed[1] * 7), impact: 'Reduces medical response time' });
    if (topMissing && topMissing[1] >= 2) recommendations.push({ icon: '👥', action: `Assign search team to ${topMissing[0]}`, reason: `${topMissing[1]} active missing-person case(s) clustered here.`, confidence: Math.min(80, 45 + topMissing[1] * 8), impact: 'Concentrates search effort' });
    if (topRising && topRising[1] >= 3) recommendations.push({ icon: '📡', action: `Pre-position resources in ${topRising[0]}`, reason: `Report volume up +${topRising[1]} vs the previous window — an emerging hotspot.`, confidence: 60, impact: 'Gets ahead of the surge' });

    return {
        kpi, distribution, priority, trend, responseTrend, districtRanking, resourceDemand,
        map, urgentFeed, timeline, categories, hotspots, duplicates, insights, recommendations,
    };
}

// ---------------------------------------------------------------------------
// Page shell — wraps the Command Center (the single operational pane)
// ---------------------------------------------------------------------------

function RespondDashboard() {
    const { missingPersons, isInitialized: mpInit, subscribeToMissingPersons } = useMissingPersonStore();
    const { disasters, isInitialized: dInit, subscribeToDisasters } = useDisasterStore();
    const { animalRescues, isInitialized: arInit, subscribeToAnimalRescues } = useAnimalRescueStore();
    const { camps, isInitialized: cInit, subscribeToCamps } = useCampStore();

    useEffect(() => {
        if (!mpInit) subscribeToMissingPersons();
        if (!dInit) subscribeToDisasters();
        if (!arInit) subscribeToAnimalRescues();
        if (!cInit) subscribeToCamps();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loading = !mpInit || !dInit || !arInit || !cInit;

    return (
        <div className="relative h-[calc(100vh-4rem)] overflow-y-auto lg:overflow-hidden bg-slate-50 font-sans dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col">
            {/* Slow-moving colour blobs for depth */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none mix-blend-screen">
                <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] bg-primary-500/10 rounded-full blur-3xl"></div>
                <div className="absolute top-1/3 -right-24 w-[28rem] h-[28rem] bg-success-500/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 left-1/4 w-[28rem] h-[28rem] bg-danger-500/10 rounded-full blur-3xl"></div>
            </div>

            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <div className="relative z-10 mx-auto w-full max-w-[1800px] px-3 pt-3 pb-3 sm:px-4 lg:px-6 flex-1 min-h-0 flex flex-col">
                <CommandCenter
                    disasters={disasters}
                    missingPersons={missingPersons}
                    animalRescues={animalRescues}
                    camps={camps}
                    loading={loading}
                />
            </div>
        </div>
    );
}

export default RespondDashboard;
