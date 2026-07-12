import React, { useState, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { reviewAllocationPlan } from '../services/aiAgentService';
import { IconCheck, IconX } from './icons/Icons';

/**
 * Allocation Plan Review Modal
 * ============================
 * Makes the approve/reject action transparent instead of a black box:
 * shows current stock at both camps before the decision, explains exactly
 * what approving will do (an atomic transfer-out/transfer-in ledger pair -
 * the same "goods issue / goods receipt" pattern real humanitarian logistics
 * systems like WFP's SCOPE or IFRC's LMMS use), and after the decision shows
 * the concrete before/after stock numbers rather than just closing.
 */
function AllocationReviewModal({ plan, onClose, onDecided }) {
    const [stock, setStock] = useState({ from: null, to: null });
    const [loadingStock, setLoadingStock] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [reason, setReason] = useState('');
    const [result, setResult] = useState(null); // { action, error? } | null

    useEffect(() => {
        if (!plan) return;
        let cancelled = false;
        setLoadingStock(true);
        setResult(null);
        setReason('');

        const loadStock = async () => {
            const ids = [plan.from_camp_id, plan.to_camp_id].filter(Boolean);
            const { data } = await supabase
                .from('camp_inventory_levels')
                .select('camp_id, quantity_on_hand')
                .eq('category', plan.resource_category)
                .in('camp_id', ids);
            if (cancelled) return;
            const byCamp = {};
            (data || []).forEach(row => { byCamp[row.camp_id] = (byCamp[row.camp_id] || 0) + Number(row.quantity_on_hand); });
            setStock({
                from: plan.from_camp_id ? (byCamp[plan.from_camp_id] ?? 0) : null,
                to: byCamp[plan.to_camp_id] ?? 0,
            });
            setLoadingStock(false);
        };
        loadStock();
        return () => { cancelled = true; };
    }, [plan]);

    if (!plan) return null;

    const handleDecision = async (action) => {
        setProcessing(true);
        const res = await reviewAllocationPlan(plan.id, action, { notes: reason || undefined });
        setProcessing(false);
        if (!res.success) {
            setResult({ action, error: res.error });
            return;
        }
        if (action === 'approve') {
            // Re-fetch stock so the result view shows the real before/after.
            const ids = [plan.from_camp_id, plan.to_camp_id].filter(Boolean);
            const { data } = await supabase
                .from('camp_inventory_levels')
                .select('camp_id, quantity_on_hand')
                .eq('category', plan.resource_category)
                .in('camp_id', ids);
            const byCamp = {};
            (data || []).forEach(row => { byCamp[row.camp_id] = (byCamp[row.camp_id] || 0) + Number(row.quantity_on_hand); });
            setResult({
                action,
                afterFrom: plan.from_camp_id ? (byCamp[plan.from_camp_id] ?? 0) : null,
                afterTo: byCamp[plan.to_camp_id] ?? 0,
            });
        } else {
            setResult({ action });
        }
        onDecided?.(plan, action);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[2000] p-4">
            <div className="bg-slate-900 border border-white/10 rounded-xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                {!result ? (
                    <>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-primary-500/20 rounded-full flex items-center justify-center text-2xl">📦</div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Review Resource Allocation Plan</h3>
                                <p className="text-sm text-slate-400">AI recommendation — nothing has moved yet</p>
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4 space-y-3">
                            <p className="font-semibold text-white capitalize">{plan.quantity} units of {plan.resource_category}{plan.item_name ? ` (${plan.item_name})` : ''}</p>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-white/5 rounded p-2 border border-white/10">
                                    <p className="text-xs text-slate-400">FROM</p>
                                    <p className="font-medium text-white">{plan.from_camp?.name || 'Unknown camp'}</p>
                                    <p className="text-xs text-slate-500">{plan.from_camp?.district}</p>
                                    <p className="text-xs mt-1 text-slate-300">
                                        Current stock: {loadingStock ? '…' : <span className="font-semibold text-white">{stock.from} units</span>}
                                        {!loadingStock && <span className="text-danger-400"> → {Math.max(0, stock.from - plan.quantity)} after</span>}
                                    </p>
                                </div>
                                <div className="bg-white/5 rounded p-2 border border-white/10">
                                    <p className="text-xs text-slate-400">TO</p>
                                    <p className="font-medium text-white">{plan.to_camp?.name || 'Unknown camp'}</p>
                                    <p className="text-xs text-slate-500">{plan.to_camp?.district}</p>
                                    <p className="text-xs mt-1 text-slate-300">
                                        Current stock: {loadingStock ? '…' : <span className="font-semibold text-white">{stock.to} units</span>}
                                        {!loadingStock && <span className="text-success-400"> → {stock.to + plan.quantity} after</span>}
                                    </p>
                                </div>
                            </div>

                            <p className="text-xs text-slate-400">Distance: {plan.distance_km?.toFixed(1)} km · Solved via {plan.solver_metadata?.method === 'vogel_approximation' ? "Vogel's Approximation (transportation LP)" : plan.solver_metadata?.method || 'transportation LP'}</p>

                            {plan.solver_metadata?.recommendation_text && (
                                <p className="text-sm text-slate-300 italic border-l-2 border-primary-400/50 pl-2">{plan.solver_metadata.recommendation_text}</p>
                            )}
                        </div>

                        <div className="bg-primary-500/10 border border-primary-400/20 rounded-lg p-3 mb-4 text-xs text-primary-200">
                            <strong>What happens if you approve:</strong> the system atomically writes a <code>transferred_out</code> entry at the source camp and a matching <code>transferred_in</code> entry at the destination camp to the inventory ledger, then marks this plan approved. This is the same "goods issue / goods receipt" pairing real relief logistics systems (e.g. WFP's SCOPE, IFRC's LMMS) use — every movement is a paired, timestamped ledger entry, never a silent count edit, so stock can always be reconciled later. The decision is also written to the admin audit log with your account and timestamp.
                            <br /><strong>If you reject:</strong> nothing changes — no inventory moves, the plan is just marked rejected.
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-medium text-slate-300 mb-1">Note (optional, saved to audit log)</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g. Confirmed by phone with camp coordinator"
                                className="input-field text-sm h-16 resize-none"
                                disabled={processing}
                            />
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button onClick={onClose} disabled={processing} className="px-4 py-2 border border-white/20 bg-white/5 text-white hover:bg-white/10 rounded-lg font-medium disabled:opacity-50 transition-colors">Cancel</button>
                            <button onClick={() => handleDecision('reject')} disabled={processing} className="btn-danger disabled:opacity-50">Reject</button>
                            <button onClick={() => handleDecision('approve')} disabled={processing} className="btn-success disabled:opacity-50">
                                {processing ? 'Processing…' : 'Approve & Transfer'}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {result.error ? (
                            <div className="text-center py-4">
                                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-danger-500/20 text-danger-400">
                                    <IconX className="h-7 w-7" />
                                </div>
                                <p className="font-bold text-danger-300 mb-1">Failed to {result.action}</p>
                                <p className="text-sm text-slate-300">{result.error}</p>
                            </div>
                        ) : result.action === 'approve' ? (
                            <div className="py-2">
                                <div className="text-center mb-4">
                                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success-500/20 text-success-400">
                                        <IconCheck className="h-7 w-7" />
                                    </div>
                                    <p className="font-bold text-white">Transfer recorded</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                                    <div className="bg-danger-500/10 border border-danger-400/20 rounded p-2 text-center">
                                        <p className="text-xs text-slate-400">{plan.from_camp?.name}</p>
                                        <p className="font-bold text-danger-300">{result.afterFrom} units</p>
                                        <p className="text-xs text-slate-500">on hand now</p>
                                    </div>
                                    <div className="bg-success-500/10 border border-success-400/20 rounded p-2 text-center">
                                        <p className="text-xs text-slate-400">{plan.to_camp?.name}</p>
                                        <p className="font-bold text-success-300">{result.afterTo} units</p>
                                        <p className="text-xs text-slate-500">on hand now</p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 text-center">Logged to the audit trail as <code>APPROVE_ALLOCATION_PLAN</code>. A route can now be generated for this shipment from the Route Optimization agent.</p>
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-slate-300">
                                    <IconX className="h-7 w-7" />
                                </div>
                                <p className="font-bold text-white mb-1">Plan rejected</p>
                                <p className="text-sm text-slate-300">No inventory was moved. Logged to the audit trail as <code>REJECT_ALLOCATION_PLAN</code>.</p>
                            </div>
                        )}
                        <div className="flex justify-end mt-4">
                            <button onClick={onClose} className="btn-primary px-4 py-2">Close</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default AllocationReviewModal;
