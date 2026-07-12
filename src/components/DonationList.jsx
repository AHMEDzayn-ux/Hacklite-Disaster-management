import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useDonationStore } from '../store/supabaseStore';
import { IconInfo } from './icons/Icons';

function DonationList() {
    const { donations } = useDonationStore();
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPurpose, setFilterPurpose] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('date-desc'); // date-desc, date-asc, amount-desc, amount-asc

    // Get unique purposes for filter
    const uniquePurposes = useMemo(() => {
        const purposes = donations.map(d => d.donation_purpose).filter(Boolean);
        return [...new Set(purposes)];
    }, [donations]);

    // Filter and sort donations
    const filteredDonations = useMemo(() => {
        let filtered = [...donations];

        // Filter by status
        if (filterStatus !== 'all') {
            filtered = filtered.filter(d => d.stripe_payment_status === filterStatus);
        }

        // Filter by purpose
        if (filterPurpose !== 'all') {
            filtered = filtered.filter(d => d.donation_purpose === filterPurpose);
        }

        // Search by donor name or email
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(d =>
                (!d.is_anonymous && d.donor_name?.toLowerCase().includes(query)) ||
                d.donor_email?.toLowerCase().includes(query) ||
                d.donation_purpose?.toLowerCase().includes(query)
            );
        }

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'date-desc':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'date-asc':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'amount-desc':
                    return parseFloat(b.amount) - parseFloat(a.amount);
                case 'amount-asc':
                    return parseFloat(a.amount) - parseFloat(b.amount);
                default:
                    return 0;
            }
        });

        return filtered;
    }, [donations, filterStatus, filterPurpose, searchQuery, sortBy]);

    // Statistics
    const stats = useMemo(() => {
        const successful = donations.filter(d => d.stripe_payment_status === 'succeeded');
        const totalAmount = successful.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
        const avgAmount = successful.length > 0 ? totalAmount / successful.length : 0;
        const maxAmount = successful.length > 0 ? Math.max(...successful.map(d => parseFloat(d.amount))) : 0;

        return {
            total: totalAmount,
            average: avgAmount,
            max: maxAmount,
            count: successful.length
        };
    }, [donations]);

    const getStatusBadge = (status) => {
        const badges = {
            succeeded: 'bg-success-500/15 text-success-300 border-success-400/20',
            pending: 'bg-amber-500/15 text-amber-300 border-amber-400/20',
            failed: 'bg-danger-500/15 text-danger-300 border-danger-400/20',
            refunded: 'bg-white/10 text-slate-300 border-white/15'
        };
        const labels = {
            succeeded: 'Completed',
            pending: 'Pending',
            failed: 'Failed',
            refunded: 'Refunded'
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${badges[status] || badges.pending}`}>
                {labels[status] || status}
            </span>
        );
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            {/* Compact Statistics Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/10 bg-gradient-to-br from-primary-600/20 to-indigo-700/20 backdrop-blur-md p-6 shadow-xl"
            >
                <h3 className="text-white text-lg font-bold mb-4 text-center">
                    📊 Donation Statistics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 border border-white/10 backdrop-blur rounded-lg p-3 text-center">
                        <div className="text-xs text-slate-400 mb-1">Total Raised</div>
                        <div className="text-2xl font-bold text-white">LKR {stats.total.toLocaleString()}</div>
                        <div className="text-xs text-slate-500 mt-1">{stats.count} donations</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 backdrop-blur rounded-lg p-3 text-center">
                        <div className="text-xs text-slate-400 mb-1">Average</div>
                        <div className="text-2xl font-bold text-white">LKR {stats.average.toFixed(0)}</div>
                        <div className="text-xs text-slate-500 mt-1">per contributor</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 backdrop-blur rounded-lg p-3 text-center">
                        <div className="text-xs text-slate-400 mb-1">Largest</div>
                        <div className="text-2xl font-bold text-white">LKR {stats.max.toLocaleString()}</div>
                        <div className="text-xs text-slate-500 mt-1">single gift</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 backdrop-blur rounded-lg p-3 text-center">
                        <div className="text-xs text-slate-400 mb-1">Total Donors</div>
                        <div className="text-2xl font-bold text-white">{stats.count}</div>
                        <div className="text-xs text-slate-500 mt-1">generous people</div>
                    </div>
                </div>
            </motion.div>

            {/* Filters */}
            <div className="card">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-1">
                            Search
                        </label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search donors..."
                            className="input-field"
                        />
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-1">
                            Status
                        </label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="input-field"
                        >
                            <option value="all">All Statuses</option>
                            <option value="succeeded">Completed</option>
                            <option value="pending">Pending</option>
                            <option value="failed">Failed</option>
                            <option value="refunded">Refunded</option>
                        </select>
                    </div>

                    {/* Purpose Filter */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-1">
                            Purpose
                        </label>
                        <select
                            value={filterPurpose}
                            onChange={(e) => setFilterPurpose(e.target.value)}
                            className="input-field"
                        >
                            <option value="all">All Purposes</option>
                            {uniquePurposes.map(purpose => (
                                <option key={purpose} value={purpose}>{purpose}</option>
                            ))}
                        </select>
                    </div>

                    {/* Sort */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-300 mb-1">
                            Sort By
                        </label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="input-field"
                        >
                            <option value="date-desc">Newest First</option>
                            <option value="date-asc">Oldest First</option>
                            <option value="amount-desc">Highest Amount</option>
                            <option value="amount-asc">Lowest Amount</option>
                        </select>
                    </div>
                </div>

                {/* Results Count */}
                <div className="mt-3 text-sm text-slate-400">
                    Showing {filteredDonations.length} of {donations.length} donations
                </div>
            </div>

            {/* Donation Table */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-md overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5 border-b border-white/10">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Donor
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Purpose
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Payment ID
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {filteredDonations.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-slate-400">
                                        No donations found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredDonations.map((donation, index) => (
                                    <motion.tr
                                        key={donation.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="hover:bg-white/[0.05] transition-colors duration-150"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <div className="font-semibold text-white">
                                                    {donation.is_anonymous ? '🙏 Anonymous' : donation.donor_name || 'Anonymous'}
                                                </div>
                                                {!donation.is_anonymous && (
                                                    <div className="text-sm text-slate-500">
                                                        {donation.donor_email}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-lg font-bold text-success-400">
                                                {donation.currency === 'LKR' ? 'Rs.' : '$'}{parseFloat(donation.amount).toLocaleString()}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {donation.currency || 'LKR'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-200">
                                                {donation.donation_purpose || 'General Relief'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {formatDate(donation.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(donation.stripe_payment_status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <code className="text-xs text-slate-400 bg-white/10 px-2 py-1 rounded">
                                                {donation.stripe_payment_id ?
                                                    `${donation.stripe_payment_id.substring(0, 20)}...` :
                                                    'N/A'
                                                }
                                            </code>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Transparency Note */}
            <div className="rounded-2xl border border-primary-400/20 bg-primary-500/10 backdrop-blur-md p-4">
                <div className="flex items-start gap-3">
                    <IconInfo className="w-6 h-6 text-primary-300 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <h4 className="font-semibold text-white mb-1">
                            100% Transparency Guarantee
                        </h4>
                        <p className="text-sm text-slate-300">
                            All donations are publicly visible to ensure complete transparency and accountability.
                            Donors can choose to remain anonymous. Every payment is verified through Stripe's secure platform
                            and can be traced via the Payment ID shown above.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DonationList;
