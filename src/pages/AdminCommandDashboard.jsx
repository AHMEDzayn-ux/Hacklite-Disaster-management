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
    if (score >= 70) return 'text-red-600 bg-red-50';
    if (score >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
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
        approved: 'bg-blue-100 text-blue-700',
        dispatched: 'bg-orange-100 text-orange-700',
        delivered: 'bg-green-100 text-green-700',
    }[status] || 'bg-gray-100 text-gray-600');

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-gray-800 text-white shadow-lg">
                <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                        <Link to="/admin/dashboard" className="text-gray-400 hover:text-white transition-colors">← Dashboard</Link>
                        <h1 className="text-xl font-bold">🚨 Emergency Command Dashboard</h1>
                    </div>
                    <button
                        onClick={runFullPipeline}
                        disabled={running}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-500 rounded-lg text-sm font-semibold flex items-center gap-2"
                    >
                        {running ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                {runProgress || 'Running...'}
                            </>
                        ) : '🤖 Run AI Analysis'}
                    </button>
                </div>
            </header>

            {error && (
                <div className="w-full px-4 sm:px-6 lg:px-8 pt-4">
                    <div className="bg-danger-50 border border-danger-300 text-danger-700 px-4 py-3 rounded-lg">{error}</div>
                </div>
            )}

            <main className="w-full px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Map: heatmap + camp markers + route polylines */}
                <div className="xl:col-span-2 bg-white rounded-lg shadow-sm overflow-hidden" style={{ height: '600px' }}>
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
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                    {/* Agent run status */}
                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <h3 className="font-bold text-gray-800 mb-2 text-sm">Agent Status</h3>
                        <div className="space-y-1 text-xs">
                            {Object.entries(runHistory).map(([name, run]) => (
                                <div key={name} className="flex justify-between items-center">
                                    <span className="text-gray-600 capitalize">{name.replace(/_/g, ' ')}</span>
                                    <span className={run?.status === 'success' ? 'text-green-600' : run?.status === 'failed' ? 'text-red-600' : 'text-gray-400'}>
                                        {run ? `${run.status} · ${new Date(run.started_at).toLocaleTimeString()}` : 'never run'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pending allocation plans */}
                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <h3 className="font-bold text-gray-800 mb-2 text-sm">📦 Pending Resource Allocations ({allocationPlans.length})</h3>
                        <div className="space-y-2">
                            {allocationPlans.length === 0 && <p className="text-xs text-gray-500">No pending recommendations.</p>}
                            {allocationPlans.map(plan => (
                                <div key={plan.id} className="border rounded-lg p-2 text-xs">
                                    <p className="font-medium">{plan.quantity} {plan.resource_category} units</p>
                                    <p className="text-gray-600">{plan.from_camp?.name || 'Unknown'} → {plan.to_camp?.name || 'Unknown'} ({plan.distance_km?.toFixed(1)}km)</p>
                                    {plan.solver_metadata?.recommendation_text && (
                                        <p className="text-gray-500 italic mt-1">{plan.solver_metadata.recommendation_text}</p>
                                    )}
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={() => setReviewPlan(plan)} className="flex-1 bg-primary-600 text-white rounded py-1">Review & Decide</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Shipments in transit: approved -> dispatched -> delivered */}
                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <h3 className="font-bold text-gray-800 mb-2 text-sm">🚚 Shipments In Transit ({inFlightPlans.length})</h3>
                        <div className="space-y-2">
                            {inFlightPlans.length === 0 && <p className="text-xs text-gray-500">No shipments awaiting dispatch or delivery.</p>}
                            {inFlightPlans.map(plan => {
                                const route = routePlans.find(r => r.allocation_plan_id === plan.id);
                                return (
                                    <div key={plan.id} className="border rounded-lg p-2 text-xs">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="font-medium">{plan.quantity} {plan.resource_category} units</p>
                                            <span className={`px-2 py-0.5 rounded-full font-bold capitalize ${shipmentStatusBadge(plan.status)}`}>{plan.status}</span>
                                        </div>
                                        <p className="text-gray-600">{plan.from_camp?.name || 'Unknown'} → {plan.to_camp?.name || 'Unknown'}</p>
                                        {route ? (
                                            <p className="text-gray-500 mt-1">🛣️ {route.total_distance_km?.toFixed(1)} km · ~{Math.round(route.total_duration_min)} min</p>
                                        ) : (
                                            <p className="text-gray-400 mt-1 italic">No route generated yet - run the Route Optimization agent.</p>
                                        )}
                                        {plan.status === 'delivered' && plan.received_by_name && (
                                            <p className="text-success-700 mt-1">✓ Received by {plan.received_by_name}</p>
                                        )}
                                        <button onClick={() => setShipmentPlan(plan)} className="w-full mt-2 bg-primary-600 text-white rounded py-1">
                                            {plan.status === 'approved' ? 'Mark as Dispatched' : 'Confirm Delivery'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Incident priority queue */}
                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <h3 className="font-bold text-gray-800 mb-2 text-sm">🚦 Incident Priority Queue</h3>
                        <div className="space-y-2">
                            {priorityQueue.slice(0, 8).map(item => (
                                <Link
                                    key={item.id}
                                    to={`/disasters-list/${item.disaster_id}`}
                                    className="block border rounded-lg p-2 text-xs hover:bg-gray-50"
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">#{item.rank} {item.disasters?.disaster_type}</span>
                                        <span className={`px-2 py-0.5 rounded-full font-bold ${riskColor(item.priority_score)}`}>{item.priority_score?.toFixed(0)}</span>
                                    </div>
                                    <p className="text-gray-500 truncate">{item.disasters?.description}</p>
                                </Link>
                            ))}
                            {priorityQueue.length === 0 && <p className="text-xs text-gray-500">No active incidents queued.</p>}
                        </div>
                    </div>

                    {/* SITREP feed */}
                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <h3 className="font-bold text-gray-800 mb-2 text-sm">📡 SITREP Feed</h3>
                        <div className="space-y-2">
                            {situationReports.map(report => (
                                <div key={report.id} className="border rounded-lg p-2 text-xs">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold">{report.district}</span>
                                        <span className={`px-2 py-0.5 rounded-full font-bold ${riskColor(report.risk_score)}`}>
                                            risk {report.risk_score?.toFixed(0)} ({report.risk_trend})
                                        </span>
                                    </div>
                                    <p className="text-gray-600">{report.narrative_summary}</p>
                                </div>
                            ))}
                            {situationReports.length === 0 && <p className="text-xs text-gray-500">Run AI Analysis to generate SITREPs.</p>}
                        </div>
                    </div>

                    <Link to="/admin/inventory" className="block bg-white rounded-lg shadow-sm p-4 hover:shadow-md text-sm font-semibold text-primary-700">
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
