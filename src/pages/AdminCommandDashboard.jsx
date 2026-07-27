import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import '../utils/leafletIconFix';
import { redIcon, orangeIcon, greenIcon } from '../utils/leafletIconFix';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import HeatmapLayer from '../components/shared/HeatmapLayer';
import AllocationReviewModal from '../components/AllocationReviewModal';
import ShipmentStatusModal from '../components/ShipmentStatusModal';
import {
    runSituationAwarenessAgent, runIncidentPrioritizationAgent, runResourceAllocationAgent,
    runRouteOptimizationAgent, runVolunteerAssignmentAgent,
    fetchLatestSituationReports, fetchLatestPriorityQueue, fetchPendingAllocationPlans,
    fetchInFlightAllocationPlans, fetchLatestRoutePlans, fetchAgentRunHistory,
} from '../services/aiAgentService';
import { defaultMapConfig } from '../utils/mapConfig';
import { IconSiren, IconBolt, IconClock, IconGlobe } from '../components/icons/Icons';
import heroImage from '../assets/blue.png';

/**
 * Emergency Command Dashboard
 * ============================
 * Single pane-of-glass admin view modeled on real EOC (Emergency Operations
 * Center) software: a GIS map layering the disaster density/damage heatmap,
 * camp markers, and optimized routes, alongside a live side panel showing
 * the situation report feed, incident priority queue, pending AI resource
 * allocation recommendations awaiting approval, and recent agent run history.
 *
 * Every AI output here is a recommendation, not an action - allocation plans
 * require an explicit approve/reject click (see aiAgentService.reviewAllocationPlan).
 */

function riskColor(score) {
    if (score >= 70) return 'text-danger-300 bg-danger-500/15';
    if (score >= 40) return 'text-amber-300 bg-amber-500/15';
    return 'text-success-300 bg-success-500/15';
}

function occupancyIcon(camp) {
    if (!camp.capacity) return greenIcon;
    const pct = camp.current_occupancy / camp.capacity;
    if (pct >= 0.9) return redIcon;
    if (pct >= 0.7) return orangeIcon;
    return greenIcon;
}

function AdminCommandDashboard() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [camps, setCamps] = useState([]);
    const [disasters, setDisasters] = useState([]);
    const [situationReports, setSituationReports] = useState([]);
    const [priorityQueue, setPriorityQueue] = useState([]);
    const [allocationPlans, setAllocationPlans] = useState([]);
    const [inFlightPlans, setInFlightPlans] = useState([]);
    const [routePlans, setRoutePlans] = useState([]);
    const [runHistory, setRunHistory] = useState({});
    const [reviewPlan, setReviewPlan] = useState(null);
    const [shipmentPlan, setShipmentPlan] = useState(null);
    const [running, setRunning] = useState(false);
    const [runProgress, setRunProgress] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!authLoading && !user) navigate('/admin/login');
    }, [user, authLoading, navigate]);

    const loadAll = useCallback(async () => {
        const [campsRes, disastersRes, sitRes, queueRes, plansRes, inFlightRes, routesRes] = await Promise.all([
            supabase.from('camps').select('id, name, district, latitude, longitude, capacity, current_occupancy').eq('status', 'Active'),
            supabase.from('disasters').select('id, disaster_type, severity, description, location, damage_index, status').eq('status', 'Active'),
            fetchLatestSituationReports(),
            fetchLatestPriorityQueue(),
            fetchPendingAllocationPlans(),
            fetchInFlightAllocationPlans(),
            fetchLatestRoutePlans(),
        ]);

        setCamps((campsRes.data || []).filter(c => c.latitude != null && c.longitude != null));
        setDisasters(disastersRes.data || []);
        setSituationReports(sitRes.data || []);
        setPriorityQueue(queueRes.data || []);
        setAllocationPlans(plansRes.data || []);
        setInFlightPlans(inFlightRes.data || []);
        setRoutePlans(routesRes.data || []);

        const agentNames = ['situation_awareness', 'incident_prioritization', 'resource_allocation', 'route_optimization', 'volunteer_assignment'];
        const histories = await Promise.all(agentNames.map(name => fetchAgentRunHistory(name, 1)));
        const historyMap = {};
        agentNames.forEach((name, i) => { historyMap[name] = histories[i].data?.[0] || null; });
        setRunHistory(historyMap);
    }, []);

    useEffect(() => { if (user) loadAll(); }, [user, loadAll]);

    const runFullPipeline = async () => {
        setRunning(true);
        setError('');
        const steps = [
            ['Analyzing situation...', runSituationAwarenessAgent],
            ['Prioritizing incidents...', runIncidentPrioritizationAgent],
            ['Optimizing resource allocation...', runResourceAllocationAgent],
            ['Optimizing routes...', runRouteOptimizationAgent],
            ['Matching volunteers...', runVolunteerAssignmentAgent],
        ];
        for (const [label, fn] of steps) {
            setRunProgress(label);
            const result = await fn();
            if (!result.success) {
                setError(`${label} failed: ${result.error}`);
                break;
            }
        }
        setRunProgress('');
        setRunning(false);
        await loadAll();
    };

    const handlePlanDecided = (plan, action) => {
        setAllocationPlans(prev => prev.filter(p => p.id !== plan.id));
        if (action === 'approve') {
            setInFlightPlans(prev => [{ ...plan, status: 'approved' }, ...prev]);
        }
    };

    const handleShipmentUpdated = (planId, newStatus) => {
        if (newStatus === 'delivered') {
            setInFlightPlans(prev => prev.filter(p => p.id !== planId));
        } else {
            setInFlightPlans(prev => prev.map(p => p.id === planId ? { ...p, status: newStatus } : p));
        }
    };

    const heatmapPoints = disasters
        .filter(d => d.location?.lat && d.location?.lng)
        .map(d => ({ lat: d.location.lat, lng: d.location.lng, weight: (d.damage_index ?? 30) / 100 }));

    const campById = Object.fromEntries(camps.map(c => [c.id, c]));
    const shipmentStatusBadge = (status) => ({
        approved: 'bg-blue-500/15 text-blue-300',
        dispatched: 'bg-amber-500/15 text-amber-300',
        delivered: 'bg-success-500/15 text-success-300',
    }[status] || 'bg-white/10 text-slate-300');

    if (authLoading || !user) {
        return (
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
            {/* Slow-moving colour blobs for depth */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none mix-blend-screen">
                <div className="absolute -top-24 -left-24 w-[28rem] h-[28rem] bg-danger-500/10 rounded-full blur-3xl animate-blob"></div>
                <div className="absolute top-1/3 -right-24 w-[28rem] h-[28rem] bg-primary-500/10 rounded-full blur-3xl animate-blob [animation-delay:2s]"></div>
            </div>

            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            {/* Cinematic command-center banner */}
            <div className="relative z-10 h-28 w-full overflow-hidden sm:h-36 animate-fade-in-up">
                <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/10"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/80"></div>
            </div>

            <header className="relative z-10 border-b border-white/10 bg-white/[0.03] backdrop-blur-md animate-fade-in-up">
                <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                        <Link to="/admin/dashboard" className="text-slate-400 hover:text-white transition-colors text-sm">← Dashboard</Link>
                        <h1 className="flex items-center gap-2 text-xl font-bold text-white">
                            <IconSiren className="h-5 w-5 text-danger-400" />
                            Emergency Command Dashboard
                        </h1>
                    </div>
                    <button
                        onClick={runFullPipeline}
                        disabled={running}
                        className="group px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:shadow-lg hover:shadow-primary-500/40 hover:-translate-y-0.5 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:translate-y-0 rounded-lg text-sm font-semibold text-white flex items-center gap-2 shadow-md shadow-primary-500/25 transition-all duration-300"
                    >
                        {running ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                {runProgress || 'Running...'}
                            </>
                        ) : (
                            <>
                                <IconBolt className="h-4 w-4 transition-transform duration-300 group-hover:scale-125" />
                                Run AI Analysis
                            </>
                        )}
                    </button>
                </div>
            </header>

            {error && (
                <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 pt-4">
                    <div className="bg-danger-500/10 border border-danger-400/30 text-danger-300 px-4 py-3 rounded-xl backdrop-blur-md">{error}</div>
                </div>
            )}

            <main className="relative z-10 mx-auto max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Map: heatmap + camp markers + route polylines */}
                <div className="xl:col-span-2 rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-md overflow-hidden shadow-xl animate-fade-in-up [animation-delay:60ms]" style={{ height: '600px' }}>
                    <MapContainer center={defaultMapConfig.center} zoom={defaultMapConfig.zoom} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <HeatmapLayer points={heatmapPoints} />
                        {camps.map(camp => (
                            <Marker key={camp.id} position={[camp.latitude, camp.longitude]} icon={occupancyIcon(camp)}>
                                <Popup>
                                    <strong>{camp.name}</strong><br />
                                    {camp.district}<br />
                                    Occupancy: {camp.current_occupancy}/{camp.capacity}
                                </Popup>
                            </Marker>
                        ))}
                        {routePlans.filter(r => r.geometry?.coordinates).map(route => {
                            const origin = campById[route.origin_camp_id];
                            const dest = campById[route.stop_camp_ids?.[0]];
                            return (
                                <Polyline
                                    key={route.id}
                                    positions={route.geometry.coordinates.map(([lng, lat]) => [lat, lng])}
                                    color="#2563eb"
                                    weight={4}
                                >
                                    <Popup>
                                        <strong>{origin?.name || 'Unknown'} → {dest?.name || 'Unknown'}</strong><br />
                                        {route.total_distance_km?.toFixed(1)} km · ~{Math.round(route.total_duration_min)} min<br />
                                        <span className="text-xs text-gray-500">{route.optimization_method === 'osrm_direct' ? 'Real road route (OSRM)' : 'Straight-line estimate'}</span>
                                    </Popup>
                                </Polyline>
                            );
                        })}
                    </MapContainer>
                </div>

                {/* Side panel */}
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1 animate-fade-in-up [animation-delay:120ms]">
                    {/* Agent run status */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-md p-4">
                        <h3 className="flex items-center gap-1.5 font-bold text-white mb-2 text-sm"><IconClock className="h-4 w-4 text-primary-300" />Agent Status</h3>
                        <div className="space-y-1 text-xs">
                            {Object.entries(runHistory).map(([name, run]) => (
                                <div key={name} className="flex justify-between items-center">
                                    <span className="text-slate-400 capitalize">{name.replace(/_/g, ' ')}</span>
                                    <span className={run?.status === 'success' ? 'text-success-400' : run?.status === 'failed' ? 'text-danger-400' : 'text-slate-500'}>
                                        {run ? `${run.status} · ${new Date(run.started_at).toLocaleTimeString()}` : 'never run'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pending allocation plans */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-md p-4">
                        <h3 className="font-bold text-white mb-2 text-sm">📦 Pending Resource Allocations ({allocationPlans.length})</h3>
                        <div className="space-y-2">
                            {allocationPlans.length === 0 && <p className="text-xs text-slate-500">No pending recommendations.</p>}
                            {allocationPlans.map(plan => (
                                <div key={plan.id} className="border border-white/10 bg-white/5 rounded-lg p-2 text-xs">
                                    <p className="font-medium text-white">{plan.quantity} {plan.resource_category} units</p>
                                    <p className="text-slate-400">{plan.from_camp?.name || 'Unknown'} → {plan.to_camp?.name || 'Unknown'} ({plan.distance_km?.toFixed(1)}km)</p>
                                    {plan.solver_metadata?.recommendation_text && (
                                        <p className="text-slate-500 italic mt-1">{plan.solver_metadata.recommendation_text}</p>
                                    )}
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={() => setReviewPlan(plan)} className="flex-1 bg-primary-600 hover:bg-primary-500 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary-500/30 text-white rounded-lg py-1.5 font-semibold transition-all duration-200">Review & Decide</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Shipments in transit: approved -> dispatched -> delivered */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-md p-4">
                        <h3 className="font-bold text-white mb-2 text-sm">🚚 Shipments In Transit ({inFlightPlans.length})</h3>
                        <div className="space-y-2">
                            {inFlightPlans.length === 0 && <p className="text-xs text-slate-500">No shipments awaiting dispatch or delivery.</p>}
                            {inFlightPlans.map(plan => {
                                const route = routePlans.find(r => r.allocation_plan_id === plan.id);
                                return (
                                    <div key={plan.id} className="border border-white/10 bg-white/5 rounded-lg p-2 text-xs">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="font-medium text-white">{plan.quantity} {plan.resource_category} units</p>
                                            <span className={`px-2 py-0.5 rounded-full font-bold capitalize ${shipmentStatusBadge(plan.status)}`}>{plan.status}</span>
                                        </div>
                                        <p className="text-slate-400">{plan.from_camp?.name || 'Unknown'} → {plan.to_camp?.name || 'Unknown'}</p>
                                        {route ? (
                                            <p className="text-slate-500 mt-1">🛣️ {route.total_distance_km?.toFixed(1)} km · ~{Math.round(route.total_duration_min)} min</p>
                                        ) : (
                                            <p className="text-slate-500 mt-1 italic">No route generated yet - run the Route Optimization agent.</p>
                                        )}
                                        {plan.status === 'delivered' && plan.received_by_name && (
                                            <p className="text-success-400 mt-1">✓ Received by {plan.received_by_name}</p>
                                        )}
                                        <button onClick={() => setShipmentPlan(plan)} className="w-full mt-2 bg-primary-600 hover:bg-primary-500 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary-500/30 text-white rounded-lg py-1.5 font-semibold transition-all duration-200">
                                            {plan.status === 'approved' ? 'Mark as Dispatched' : 'Confirm Delivery'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Incident priority queue */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-md p-4">
                        <h3 className="flex items-center gap-1.5 font-bold text-white mb-2 text-sm"><IconBolt className="h-4 w-4 text-primary-300" />Incident Priority Queue</h3>
                        <div className="space-y-2">
                            {priorityQueue.slice(0, 8).map(item => (
                                <Link
                                    key={item.id}
                                    to={`/disasters-list/${item.disaster_id}`}
                                    className="block border border-white/10 bg-white/5 hover:bg-white/10 rounded-lg p-2 text-xs transition-colors"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-white">#{item.rank} {item.disasters?.disaster_type}</span>
                                        <span className={`px-2 py-0.5 rounded-full font-bold ${riskColor(item.priority_score)}`}>{item.priority_score?.toFixed(0)}</span>
                                    </div>
                                    <p className="text-slate-400 truncate">{item.disasters?.description}</p>
                                </Link>
                            ))}
                            {priorityQueue.length === 0 && <p className="text-xs text-slate-500">No active incidents queued.</p>}
                        </div>
                    </div>

                    {/* SITREP feed */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-md p-4">
                        <h3 className="flex items-center gap-1.5 font-bold text-white mb-2 text-sm"><IconGlobe className="h-4 w-4 text-primary-300" />SITREP Feed</h3>
                        <div className="space-y-2">
                            {situationReports.map(report => (
                                <div key={report.id} className="border border-white/10 bg-white/5 rounded-lg p-2 text-xs">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-white">{report.district}</span>
                                        <span className={`px-2 py-0.5 rounded-full font-bold ${riskColor(report.risk_score)}`}>
                                            risk {report.risk_score?.toFixed(0)} ({report.risk_trend})
                                        </span>
                                    </div>
                                    <p className="text-slate-300">{report.narrative_summary}</p>
                                </div>
                            ))}
                            {situationReports.length === 0 && <p className="text-xs text-slate-500">Run AI Analysis to generate SITREPs.</p>}
                        </div>
                    </div>

                    <Link to="/admin/inventory" className="block rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-md p-4 hover:border-white/25 hover:bg-white/[0.08] transition-all text-sm font-semibold text-primary-300">
                        📦 View Full Inventory Overview →
                    </Link>
                </div>
            </main>

            {reviewPlan && (
                <AllocationReviewModal
                    plan={reviewPlan}
                    onClose={() => setReviewPlan(null)}
                    onDecided={handlePlanDecided}
                />
            )}

            {shipmentPlan && (
                <ShipmentStatusModal
                    plan={shipmentPlan}
                    routeInfo={routePlans.find(r => r.allocation_plan_id === shipmentPlan.id)}
                    onClose={() => setShipmentPlan(null)}
                    onUpdated={handleShipmentUpdated}
                />
            )}
        </div>
    );
}

export default AdminCommandDashboard;
