import React from 'react';
import { useDonationStore } from '@/store/supabaseStore';
import { APPEAL_TARGET_LKR } from '@/features/donations/impact';

const lkr = n => `LKR ${Math.round(n).toLocaleString()}`;

/**
 * Appeal progress band.
 *
 * A bare "total raised" figure gives a donor nothing to act on. Framed against
 * a target it becomes a gap somebody can help close, which is the single
 * strongest motivator on the page — so the remaining amount is stated
 * explicitly rather than left to be inferred from the bar.
 */
function DonationCounter() {
    const { totalRaised, donationStats } = useDonationStore();

    const pct = APPEAL_TARGET_LKR > 0
        ? Math.min(100, (totalRaised / APPEAL_TARGET_LKR) * 100)
        : 0;
    const remaining = Math.max(0, APPEAL_TARGET_LKR - totalRaised);

    return (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Raised so far</p>
                    <p className="text-2xl font-bold leading-tight tabular-nums text-slate-900 sm:text-3xl dark:text-white">
                        {lkr(totalRaised)}
                    </p>
                </div>
                <dl className="flex items-end gap-5 sm:gap-6">
                    <div>
                        <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Appeal target</dt>
                        <dd className="text-[15px] font-semibold tabular-nums text-slate-900 dark:text-white">{lkr(APPEAL_TARGET_LKR)}</dd>
                    </div>
                    <div>
                        <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Donors</dt>
                        <dd className="text-[15px] font-semibold tabular-nums text-slate-900 dark:text-white">{donationStats.successfulCount}</dd>
                    </div>
                    {donationStats.avgDonation > 0 && (
                        <div className="hidden sm:block">
                            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Average gift</dt>
                            <dd className="text-[15px] font-semibold tabular-nums text-slate-900 dark:text-white">{lkr(donationStats.avgDonation)}</dd>
                        </div>
                    )}
                </dl>
            </div>

            <div
                className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"
                role="progressbar"
                aria-valuenow={Math.round(pct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Appeal progress: ${lkr(totalRaised)} of ${lkr(APPEAL_TARGET_LKR)}`}
            >
                <div
                    className="h-full rounded-full bg-success-600 transition-[width] duration-700 ease-out dark:bg-success-500"
                    style={{ width: `${pct}%` }}
                />
            </div>

            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold text-slate-900 dark:text-white">{pct.toFixed(1)}%</span> of the target reached
                {remaining > 0 && <> · <span className="font-semibold text-slate-900 dark:text-white">{lkr(remaining)}</span> still needed</>}
            </p>
        </section>
    );
}

export default DonationCounter;
