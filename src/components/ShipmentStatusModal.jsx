import React, { useState } from 'react';
import { reviewAllocationPlan } from '../services/aiAgentService';

const STATUS_STEPS = ['approved', 'dispatched', 'delivered'];

function StatusTracker({ current }) {
    const currentIndex = STATUS_STEPS.indexOf(current);
    const labels = { approved: 'Approved', dispatched: 'Dispatched', delivered: 'Delivered' };
    return (
        <div className="flex items-center justify-between mb-4">
            {STATUS_STEPS.map((step, i) => (
                <React.Fragment key={step}>
                    <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i <= currentIndex ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            {i < currentIndex ? '✓' : i + 1}
                        </div>
                        <span className={`text-xs mt-1 ${i <= currentIndex ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>{labels[step]}</span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-1 ${i < currentIndex ? 'bg-primary-600' : 'bg-gray-200'}`} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

/**
 * Shipment Status Modal
 * =====================
 * Advances an already-approved allocation plan through the real-world
 * shipment lifecycle: approved -> dispatched (physically left the source
 * camp) -> delivered (received and signed for by the destination camp /
 * authority). Each step is a separate accountable action logged to the
 * audit trail, mirroring how relief logistics systems track a shipment from
 * warehouse release to proof-of-delivery, not just "the paperwork was
 * approved".
 */
function ShipmentStatusModal({ plan, routeInfo, onClose, onUpdated }) {
    const [notes, setNotes] = useState('');
    const [receivedByName, setReceivedByName] = useState('');
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState(null);

    if (!plan) return null;

    const nextAction = plan.status === 'approved' ? 'dispatch' : 'deliver';

    const handleSubmit = async () => {
        setProcessing(true);
        const res = await reviewAllocationPlan(plan.id, nextAction, { notes, receivedByName });
        setProcessing(false);
        if (!res.success) {
            setResult({ error: res.error });
            return;
        }
        setResult({ success: true });
        onUpdated?.(plan.id, nextAction === 'dispatch' ? 'dispatched' : 'delivered');
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
                {!result ? (
                    <>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">Update Shipment Status</h3>
                        <p className="text-sm text-gray-600 mb-4">{plan.quantity} units of {plan.resource_category} — {plan.from_camp?.name} → {plan.to_camp?.name}</p>

                        <StatusTracker current={plan.status} />

                        {routeInfo && (
                            <p className="text-xs text-gray-500 mb-4 bg-gray-50 rounded p-2">
                                🛣️ Route: {routeInfo.total_distance_km?.toFixed(1)} km · ~{Math.round(routeInfo.total_duration_min)} min drive ({routeInfo.optimization_method === 'osrm_direct' ? 'real road route' : 'straight-line estimate'})
                            </p>
                        )}

                        {nextAction === 'dispatch' ? (
                            <div className="mb-4">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Dispatch note (optional)</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="e.g. Vehicle plate, driver name, departure time"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-16 resize-none"
                                    disabled={processing}
                                />
                            </div>
                        ) : (
                            <>
                                <div className="mb-3">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Received by (name / role) <span className="text-danger-500">*</span></label>
                                    <input
                                        type="text"
                                        value={receivedByName}
                                        onChange={(e) => setReceivedByName(e.target.value)}
                                        placeholder="e.g. Camp Coordinator - Balangoda"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        disabled={processing}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Delivery note (optional)</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="e.g. Verified against manifest, quantities matched"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm h-16 resize-none"
                                        disabled={processing}
                                    />
                                </div>
                            </>
                        )}

                        <div className="flex gap-3 justify-end">
                            <button onClick={onClose} disabled={processing} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium disabled:opacity-50">Cancel</button>
                            <button
                                onClick={handleSubmit}
                                disabled={processing || (nextAction === 'deliver' && !receivedByName.trim())}
                                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processing ? 'Saving…' : nextAction === 'dispatch' ? 'Mark as Dispatched' : 'Mark as Delivered'}
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-4">
                        <p className="text-4xl mb-2">{result.error ? '⚠️' : nextAction === 'dispatch' ? '🚚' : '📦'}</p>
                        <p className="font-bold text-gray-800 mb-1">
                            {result.error ? 'Update failed' : nextAction === 'dispatch' ? 'Marked as dispatched' : 'Marked as delivered'}
                        </p>
                        <p className="text-sm text-gray-600 mb-4">
                            {result.error || (nextAction === 'dispatch'
                                ? 'Logged to the audit trail. Confirm delivery once the destination camp receives it.'
                                : `Logged to the audit trail as received by ${receivedByName}.`)}
                        </p>
                        <button onClick={onClose} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium">Close</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ShipmentStatusModal;
