import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDonationStore } from '../store/supabaseStore';
import { IconHeart } from './icons/Icons';

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-md p-6 text-center shadow-xl">
                <p className="text-slate-400">No donations yet. Be the first to contribute!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* New Donation Toast */}
            <AnimatePresence>
                {newDonation && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -50, scale: 0.9 }}
                        className="rounded-lg border border-success-400/30 bg-success-500 text-white p-4 shadow-xl shadow-success-500/30"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🎉</span>
                            <div className="flex-1">
                                <p className="font-bold">
                                    {formatDonorName(newDonation)} just donated ${parseFloat(newDonation.amount).toFixed(2)}!
                                </p>
                                <p className="text-sm text-success-50">
                                    Thank you for your generosity! 🙏
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Recent Donations List */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-md overflow-hidden shadow-xl">
                <div className="bg-gradient-to-r from-primary-600/70 to-fuchsia-600/70 backdrop-blur-md p-4 border-b border-white/10">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <IconHeart className="h-5 w-5" /> Recent Donations
                    </h3>
                    <p className="text-slate-300 text-sm">Live updates from our generous donors</p>
                </div>

                <div className="divide-y divide-white/10 max-h-96 overflow-y-auto">
                    {recentDonations.map((donation, index) => (
                        <motion.div
                            key={donation.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-4 hover:bg-white/[0.08] transition-colors duration-200"
                        >
                            <div className="flex items-start justify-between gap-4">
                                {/* Left: Donor Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-lg">
                                            {donation.is_anonymous ? '🙏' : '👤'}
                                        </span>
                                        <span className="font-semibold text-white">
                                            {formatDonorName(donation)}
                                        </span>
                                    </div>

                                    <p className="text-sm text-slate-400 mb-1">
                                        {donation.donation_purpose || 'General Relief'}
                                    </p>

                                    {donation.message && !donation.is_anonymous && (
                                        <p className="text-sm text-slate-400 italic mt-2 border-l-2 border-white/10 pl-3">
                                            "{donation.message?.substring(0, 100) || ''}
                                            {donation.message.length > 100 ? '...' : ''}"
                                        </p>
                                    )}

                                    <p className="text-xs text-slate-500 mt-2">
                                        {formatTimeAgo(donation.created_at)}
                                    </p>
                                </div>

                                {/* Right: Amount */}
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-success-400">
                                        ${parseFloat(donation.amount).toFixed(2)}
                                    </div>
                                    <div className="text-xs text-slate-500 uppercase">
                                        {donation.currency || 'USD'}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* View All Link */}
                {donations.filter(d => d.stripe_payment_status === 'succeeded').length > limit && (
                    <div className="bg-white/5 border-t border-white/10 p-3 text-center">
                        <button className="text-primary-300 hover:text-primary-200 text-sm font-semibold">
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
                                        ${parseFloat(donation.amount).toFixed(2)}
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
