import React, { useEffect, useMemo, useState } from 'react';
import { useDonationStore } from '@/store/supabaseStore';
import { IconHeart, IconCheck, IconUser } from '@/components/icons/Icons';

/** A gift counts as "just in" for two minutes after it clears. */
const JUST_IN_MS = 120_000;

const CURRENCY_PREFIX = { LKR: 'Rs.', USD: '$', EUR: '€', GBP: '£' };

const formatAmount = donation =>
    `${CURRENCY_PREFIX[donation.currency] || 'Rs.'}${parseFloat(donation.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatTimeAgo = dateString => {
    const date = new Date(dateString);
    if (isNaN(date)) return '';
    const secs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (secs < 60) return 'Just now';
    if (secs < 3600) return `${Math.floor(secs / 60)} min ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    if (secs < 2592000) return `${Math.floor(secs / 86400)}d ago`;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const donorName = donation => (donation.is_anonymous ? 'Anonymous donor' : donation.donor_name || 'Anonymous');

/**
 * Public donor ledger.
 *
 * This is the page's social proof: seeing that other people just gave, and
 * reading why, is what moves an undecided visitor. So real names, amounts,
 * designations and messages are all shown rather than summarised away.
 */
function RecentDonations({ limit = 8 }) {
    const { donations, isInitialized } = useDonationStore();

    const successful = useMemo(
        () => donations
            .filter(d => d.stripe_payment_status === 'succeeded')
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
        [donations]
    );

    const recent = useMemo(() => successful.slice(0, limit), [successful, limit]);

    // "New" is derived from the timestamp rather than flagged on arrival: a
    // donation earns the badge because it genuinely just happened, not because
    // this component happened to mount — otherwise a days-old gift gets
    // announced as new on first paint. The clock is held in state and ticked
    // from an interval so render stays pure and the badge expires on its own.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 30_000);
        return () => clearInterval(id);
    }, []);

    const isJustIn = donation => now - new Date(donation.created_at).getTime() < JUST_IN_MS;

    return (
        <section className="flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <header className="flex h-10 flex-shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-3 dark:border-white/10">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                    <IconHeart className="h-4 w-4 flex-shrink-0 text-slate-400" />
                    Recent Donations
                </h2>
                {successful.length > 0 && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                        {successful.length} total
                    </span>
                )}
            </header>

            {recent.length === 0 ? (
                <div className="px-3 py-8 text-center">
                    {/* An empty ledger and a ledger that hasn't loaded look identical
                        in the data — only claim "no donations" once the fetch is in. */}
                    {isInitialized ? (
                        <>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No donations recorded yet.</p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Be the first to contribute to this appeal.</p>
                        </>
                    ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">Loading donations…</p>
                    )}
                </div>
            ) : (
                <ul className="m-0 max-h-[22rem] list-none divide-y divide-slate-200 overflow-y-auto p-0 scroll-panel dark:divide-white/10">
                    {recent.map(donation => (
                        <li
                            key={donation.id}
                            className={`px-3 py-2.5 ${isJustIn(donation) ? 'bg-success-50 dark:bg-success-500/10' : ''}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900 dark:text-white">
                                        <IconUser className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                                        <span className="truncate">{donorName(donation)}</span>
                                        {isJustIn(donation) && (
                                            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded border border-success-200 bg-success-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
                                                <IconCheck className="h-3 w-3" /> New
                                            </span>
                                        )}
                                    </p>
                                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                                        {donation.donation_purpose || 'General Relief Fund'} · {formatTimeAgo(donation.created_at)}
                                    </p>
                                    {donation.message && !donation.is_anonymous && (
                                        <p className="mt-1.5 border-l-2 border-slate-200 pl-2 text-xs italic leading-snug text-slate-600 dark:border-white/15 dark:text-slate-300">
                                            “{donation.message.length > 120 ? `${donation.message.slice(0, 120)}…` : donation.message}”
                                        </p>
                                    )}
                                </div>
                                <p className="flex-shrink-0 text-[15px] font-semibold tabular-nums text-slate-900 dark:text-white">
                                    {formatAmount(donation)}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

export default RecentDonations;
