import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { IconSiren, IconCheck, IconX, IconClock } from '@/components/icons/Icons';

/**
 * Flagged Case Closures
 * =====================
 * Case closures the screener rejected — see supabase/functions/_shared/closureScreening.ts.
 *
 * A rejected closure never touched the case (the search is still open) and no SMS
 * went to the reporter, so nothing here is urgent for the family. What it is, is
 * evidence: somebody tried to push a payment demand or a private phone number
 * through a channel that ends at a frightened relative. That is worth a human
 * looking at, which is what this panel is for.
 *
 * The rejected text is shown verbatim because that is the whole point — but only
 * here, to authenticated administrators. flagged_closure_attempts has no anon
 * policy at all.
 */

const REASON_LABELS = {
    payment_demand: 'Payment demand',
    financial_credentials: 'Bank / card / OTP details',
    money_amount: 'Money amount',
    off_platform_contact: 'Off-platform contact route',
    personal_number_in_authority_contact: 'Personal mobile as "official" contact',
    coercion: 'Coercive conditions',
};

const STATUS_STYLES = {
    pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    cleared: 'bg-success-500/15 text-success-300 border-success-500/30',
    rejected: 'bg-danger-500/15 text-danger-300 border-danger-500/30',
};

function FlaggedClosuresPanel() {
    const [attempts, setAttempts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showResolved, setShowResolved] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('flagged_closure_attempts')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (!showResolved) query = query.eq('review_status', 'pending');

            const { data, error: fetchError } = await query;
            if (fetchError) throw fetchError;
            setAttempts(data || []);
            setError(null);
        } catch (err) {
            console.error('Error loading flagged closures:', err);
            setAttempts([]);
            // PGRST205 is PostgREST's "relation not in the schema cache", i.e. the
            // migration has not been applied. That is a deployment step, not a
            // fault, so say so instead of showing a raw driver message.
            setError(err?.code === 'PGRST205' || /schema cache/i.test(err?.message || '')
                ? { setup: true, message: 'Screening is active, but the review table has not been created in this project yet. Apply migration 20260730000002 (supabase db push) to see flagged closures here.' }
                : { setup: false, message: err?.message || 'Unknown error' });
        } finally {
            setLoading(false);
        }
    }, [showResolved]);

    useEffect(() => { load(); }, [load]);

    const review = async (id, reviewStatus) => {
        setUpdatingId(id);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error: updateError } = await supabase
                .from('flagged_closure_attempts')
                .update({
                    review_status: reviewStatus,
                    reviewed_by: user?.id || null,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('id', id);
            if (updateError) throw updateError;
            await load();
        } catch (err) {
            console.error('Error reviewing flagged closure:', err);
            setError(err.message);
        } finally {
            setUpdatingId(null);
        }
    };

    const pendingCount = attempts.filter(a => a.review_status === 'pending').length;

    return (
        <section className="flex-none rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
                        <IconSiren className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            Flagged Case Closures
                            {pendingCount > 0 && (
                                <span className="ml-2 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
                                    {pendingCount} pending
                                </span>
                            )}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Closures rejected for requesting money or adding a private contact route. The cases stayed open and no reporter was messaged.
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowResolved(v => !v)}
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
                >
                    {showResolved ? 'Show pending only' : 'Show all'}
                </button>
            </div>

            {/* An error and "nothing pending" are contradictory - only ever show one. */}
            {error ? (
                <div className={`mt-4 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${error.setup
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                    : 'border-danger-500/30 bg-danger-500/10 text-danger-300'}`}>
                    <IconSiren className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <p>{error.setup ? error.message : `Could not load flagged closures: ${error.message}`}</p>
                </div>
            ) : loading ? (
                <p className="mt-4 text-sm text-slate-400">Loading…</p>
            ) : attempts.length === 0 ? (
                <p className="mt-4 flex items-center gap-2 text-sm text-slate-400">
                    <IconCheck className="h-4 w-4 text-success-400" />
                    {showResolved ? 'No flagged closures on record.' : 'Nothing pending review.'}
                </p>
            ) : (
                <ul className="mt-4 space-y-3">
                    {attempts.map(attempt => (
                        <li key={attempt.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-white">
                                        {attempt.submitted_by_name || 'Unnamed submitter'}
                                        {attempt.submitted_contact && (
                                            <span className="ml-2 font-mono text-xs font-normal text-slate-400">{attempt.submitted_contact}</span>
                                        )}
                                    </p>
                                    <p className="flex items-center gap-1 text-xs text-slate-500">
                                        <IconClock className="h-3 w-3" />
                                        {new Date(attempt.created_at).toLocaleString()}
                                        <span className="mx-1">·</span>
                                        case
                                        <span className="font-mono">{String(attempt.related_id || '').slice(0, 8)}</span>
                                    </p>
                                </div>
                                <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[attempt.review_status] || STATUS_STYLES.pending}`}>
                                    {attempt.review_status}
                                </span>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {(attempt.flag_reasons || []).map(reason => (
                                    <span key={reason} className="rounded-md border border-danger-500/30 bg-danger-500/10 px-2 py-0.5 text-xs font-medium text-danger-300">
                                        {REASON_LABELS[reason] || reason}
                                    </span>
                                ))}
                            </div>

                            <dl className="mt-3 space-y-1.5 border-t border-white/10 pt-3 text-sm">
                                {[
                                    ['Where the person is', attempt.payload?.found_person_location],
                                    ['Official contact given', attempt.payload?.authority_contact],
                                    ['Notes', attempt.payload?.notes],
                                ].filter(([, value]) => value).map(([label, value]) => (
                                    <div key={label}>
                                        <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
                                        <dd className="whitespace-pre-wrap text-slate-200">{value}</dd>
                                    </div>
                                ))}
                            </dl>

                            {attempt.review_status === 'pending' && (
                                <div className="mt-3 flex gap-2">
                                    <button
                                        onClick={() => review(attempt.id, 'cleared')}
                                        disabled={updatingId === attempt.id}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 disabled:opacity-50"
                                    >
                                        <IconCheck className="h-3.5 w-3.5" />
                                        False positive
                                    </button>
                                    <button
                                        onClick={() => review(attempt.id, 'rejected')}
                                        disabled={updatingId === attempt.id}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-danger-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-danger-700 disabled:opacity-50"
                                    >
                                        <IconX className="h-3.5 w-3.5" />
                                        Confirm abuse
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

export default FlaggedClosuresPanel;
