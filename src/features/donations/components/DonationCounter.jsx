import React from 'react';
import { useDonationStore } from '@/store/supabaseStore';
import { IconHeart } from '@/components/icons/Icons';

function DonationCounter() {
    const { totalRaised, donationStats } = useDonationStore();

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-success-500/15 text-success-600 dark:text-success-400">
                        <IconHeart className="h-4.5 w-4.5" />
                    </span>
                    <div>
                        <div className="text-xl font-bold text-slate-900 leading-tight dark:text-white">
                            LKR {totalRaised.toLocaleString()}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Total raised · {donationStats.successfulCount} donors</p>
                    </div>
                </div>

                {donationStats.avgDonation > 0 && (
                    <div className="flex items-center gap-4 border-t border-slate-200 pt-3 dark:border-white/10 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
                        <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">LKR {donationStats.avgDonation.toFixed(2)}</div>
                            <div className="text-xs text-slate-500">Avg. donation</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DonationCounter;
