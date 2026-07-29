import React, { useEffect, useState } from 'react';
import { useDonationStore } from '@/store/supabaseStore';
import { IconHeart } from '@/components/icons/Icons';

function RecentDonations({ limit = 10, showTicker = true }) {
    const { donations } = useDonationStore();
    const [recentDonations, setRecentDonations] = useState([]);
    const [newDonation, setNewDonation] = useState(null);

    useEffect(() => {
        // Filter successful donations and sort by date
        const successful = donations
            .filter(d => d.stripe_payment_status === 'succeeded')
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, limit);

        setRecentDonations(successful);
    }, [donations, limit]);

    useEffect(() => {
        // Check if there's a new donation (notify)
        if (recentDonations.length > 0) {
            const latestId = recentDonations[0].id;
            const currentNew = newDonation?.id;

            if (latestId && latestId !== currentNew) {
                setNewDonation(recentDonations[0]);
                const timer = setTimeout(() => setNewDonation(null), 5000);
                return () => clearTimeout(timer);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recentDonations]);

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}min ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    const formatDonorName = (donation) => {
        if (donation.is_anonymous) {
            return 'Anonymous Donor';
        }
        return donation.donor_name || 'Anonymous';
    };

    if (recentDonations.length === 0) {
        return (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-6 text-center">
                <p className="text-slate-400 text-sm">No donations yet. Be the first to contribute!</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* New Donation Toast */}
            {newDonation && (
                <div className="rounded-lg border border-success-500/30 bg-success-500/10 p-3">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">🎉</span>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-success-200">
                                {formatDonorName(newDonation)} donated {newDonation.currency === 'LKR' ? 'Rs.' : '$'}{parseFloat(newDonation.amount).toFixed(2)}
                            </p>
                            <p className="text-xs text-success-300/80">
                                Thank you for the generosity
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Donations List */}
            <div className="rounded-xl border border-white/10 bg-white/[0.04] overflow-hidden">
                <div className="bg-white/[0.03] p-3 border-b border-white/10">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <IconHeart className="h-4 w-4 text-slate-400" /> Recent Donations
                    </h3>
                    <p className="text-slate-500 text-xs">Live updates from our donors</p>
                </div>

                <div className="divide-y divide-white/10 max-h-72 overflow-y-auto">
                    {recentDonations.map((donation) => (
                        <div key={donation.id} className="p-3">
                            <div className="flex items-start justify-between gap-4">
                                {/* Left: Donor Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-sm font-semibold text-white truncate">
                                            {formatDonorName(donation)}
                                        </span>
                                    </div>

                                    <p className="text-xs text-slate-400 mb-1">
                                        {donation.donation_purpose || 'General Relief'}
                                    </p>

                                    {donation.message && !donation.is_anonymous && (
                                        <p className="text-xs text-slate-400 italic mt-1.5 border-l-2 border-white/10 pl-2.5">
                                            "{donation.message?.substring(0, 100) || ''}
                                            {donation.message.length > 100 ? '...' : ''}"
                                        </p>
                                    )}

                                    <p className="text-[11px] text-slate-500 mt-1.5">
                                        {formatTimeAgo(donation.created_at)}
                                    </p>
                                </div>

                                {/* Right: Amount */}
                                <div className="text-right flex-shrink-0">
                                    <div className="text-sm font-bold text-slate-200">
                                        {donation.currency === 'LKR' ? 'Rs.' : '$'}{parseFloat(donation.amount).toFixed(2)}
                                    </div>
                                    <div className="text-[10px] text-slate-500 uppercase">
                                        {donation.currency || 'USD'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* View All Link */}
                {donations.filter(d => d.stripe_payment_status === 'succeeded').length > limit && (
                    <div className="bg-white/[0.02] border-t border-white/10 p-2.5 text-center">
                        <button className="text-primary-300 hover:text-primary-200 text-xs font-semibold">
                            View All {donations.filter(d => d.stripe_payment_status === 'succeeded').length} Donations →
                        </button>
                    </div>
                )}
            </div>

            {/* Ticker Mode (Optional) */}
            {showTicker && recentDonations.length > 3 && (
                <div className="rounded-lg border border-white/10 bg-gradient-to-r from-primary-600/70 to-fuchsia-600/70 backdrop-blur-md overflow-hidden">
                    <div className="ticker-container py-3">
                        <div className="ticker-content flex gap-8 items-center">
                            {[...recentDonations, ...recentDonations].map((donation, index) => (
                                <div
                                    key={`${donation.id}-${index}`}
                                    className="flex items-center gap-3 text-white whitespace-nowrap"
                                >
                                    <span>🎁</span>
                                    <span className="font-semibold">
                                        {formatDonorName(donation)}
                                    </span>
                                    <span>donated</span>
                                    <span className="font-bold text-amber-300">
                                        {donation.currency === 'LKR' ? 'Rs.' : '$'}{parseFloat(donation.amount).toFixed(2)}
                                    </span>
                                    <span className="text-slate-300">•</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .ticker-container {
                    overflow: hidden;
                }
                .ticker-content {
                    display: flex;
                    animation: ticker 30s linear infinite;
                }
                @keyframes ticker {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .ticker-content:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    );
}

export default RecentDonations;
