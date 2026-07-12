import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { checkIsAdmin } from '../services/adminService';
import {
    IconTent,
    IconShieldLock,
    IconSearch,
    IconMapPin,
    IconUsers,
    IconPhone,
    IconClock,
    IconCheck,
    IconX,
} from '../components/icons/Icons';

/**
 * Admin Manage Camps
 * ==================
 * Admin-only page to view and manage all camps
 * Admins can mark camps as closed but cannot delete them to maintain records
 */
function AdminManageCamps() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [camps, setCamps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Admin status
    const [adminStatus, setAdminStatus] = useState({ isAdmin: false, role: null });

    // Close camp modal state
    const [closeModal, setCloseModal] = useState({ isOpen: false, camp: null });
    const [isClosing, setIsClosing] = useState(false);

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/admin/login');
        }
    }, [user, authLoading, navigate]);

    // Check admin status
    useEffect(() => {
        if (user) {
            checkIsAdmin().then(setAdminStatus);
        }
    }, [user]);

    // Fetch camps
    useEffect(() => {
        if (user) {
            fetchCamps();
        }
    }, [user, filter]);

    const fetchCamps = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('camps')
                .select('*')
                .order('created_at', { ascending: false });

            if (filter !== 'all') {
                query = query.ilike('status', filter);
            }

            const { data, error } = await query;

            if (error) throw error;
            setCamps(data || []);
        } catch (error) {
            console.error('Error fetching camps:', error);
        } finally {
            setLoading(false);
        }
    };

    // Mark camp as closed handler
    const handleCloseCamp = async () => {
        if (!closeModal.camp) return;

        setIsClosing(true);
        try {
            const { error } = await supabase
                .from('camps')
                .update({
                    status: 'Closed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', closeModal.camp.id);

            if (error) throw error;

            alert(`✅ Camp "${closeModal.camp.name}" has been marked as closed.`);
            fetchCamps();
            setCloseModal({ isOpen: false, camp: null });
        } catch (error) {
            console.error('Close camp error:', error);
            alert(`❌ Failed to close camp: ${error.message}`);
        } finally {
            setIsClosing(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusBadge = (status) => {
        const statusLower = status?.toLowerCase() || '';
        const badges = {
            active: 'bg-success-500/15 text-success-300',
            approved: 'bg-success-500/15 text-success-300',
            inactive: 'bg-white/10 text-slate-300',
            closed: 'bg-danger-500/15 text-danger-300'
        };
        return badges[statusLower] || 'bg-white/10 text-slate-300';
    };

    // Filter camps by search term
    const filteredCamps = camps.filter(camp => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            camp.camp_name?.toLowerCase().includes(search) ||
            camp.district?.toLowerCase().includes(search) ||
            camp.address?.toLowerCase().includes(search)
        );
    });

    if (authLoading || !user) {
        return (
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
                {/* Top bar */}
                <div className="mb-6 flex items-center justify-between">
                    <Link to="/admin/dashboard" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
                        ← Dashboard
                    </Link>
                    {adminStatus.role === 'super_admin' && (
                        <span className="px-3 py-1 rounded-full bg-fuchsia-500/15 text-fuchsia-300 text-xs font-semibold">
                            Super Admin
                        </span>
                    )}
                </div>

                {/* Header */}
                <div className="mb-8 flex items-center gap-5">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
                        <IconTent className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white md:text-4xl">Manage Camps</h1>
                        <p className="mt-1 text-slate-300">View and manage all relief camps</p>
                    </div>
                </div>

                {/* Info Banner */}
                <div className="mb-6 flex items-start gap-4 rounded-2xl border border-primary-400/20 bg-primary-500/10 p-4 backdrop-blur-md">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-500/20 text-primary-300">
                        <IconShieldLock className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Secure Camp Management</h3>
                        <p className="text-sm text-slate-300">
                            As an admin, you can view and mark camps as closed. Camp records are maintained for historical tracking.
                        </p>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="card mb-6">
                    <div className="flex flex-wrap gap-4">
                        <div className="relative flex-1 min-w-[200px]">
                            <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search camps..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input-field pl-10"
                            />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {['all', 'active', 'inactive', 'closed'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilter(status)}
                                    className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${filter === status
                                        ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                                        : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                                        }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="card p-4">
                        <p className="text-sm text-slate-400">Total Camps</p>
                        <p className="text-2xl font-bold text-white">{camps.length}</p>
                    </div>
                    <div className="card p-4">
                        <p className="text-sm text-slate-400">Active</p>
                        <p className="text-2xl font-bold text-success-400">
                            {camps.filter(c => c.status?.toLowerCase() === 'active').length}
                        </p>
                    </div>
                    <div className="card p-4">
                        <p className="text-sm text-slate-400">Inactive</p>
                        <p className="text-2xl font-bold text-slate-300">
                            {camps.filter(c => c.status?.toLowerCase() === 'inactive').length}
                        </p>
                    </div>
                    <div className="card p-4">
                        <p className="text-sm text-slate-400">Closed</p>
                        <p className="text-2xl font-bold text-danger-400">
                            {camps.filter(c => c.status?.toLowerCase() === 'closed').length}
                        </p>
                    </div>
                </div>

                {/* Camp List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
                    </div>
                ) : filteredCamps.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-center">
                        <IconTent className="mx-auto mb-4 h-16 w-16 text-slate-600" />
                        <h3 className="text-xl font-semibold text-white mb-2">No Camps Found</h3>
                        <p className="text-slate-400">
                            {searchTerm ? 'Try a different search term.' : 'No camps match the selected filter.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredCamps.map((camp) => (
                            <div key={camp.id} className="card hover:border-white/25 hover:bg-white/[0.08] transition-all duration-300">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-bold text-white">{camp.camp_name}</h3>
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(camp.status)}`}>
                                                {camp.status}
                                            </span>
                                        </div>
                                        <div className="grid sm:grid-cols-2 gap-2 text-sm text-slate-400">
                                            <p className="flex items-center gap-1.5">
                                                <IconMapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                                {camp.district} - {camp.address}
                                            </p>
                                            <p className="flex items-center gap-1.5">
                                                <IconUsers className="h-3.5 w-3.5 flex-shrink-0" />
                                                Capacity: {camp.current_occupancy || 0}/{camp.total_capacity || 'N/A'}
                                            </p>
                                            <p className="flex items-center gap-1.5">
                                                <IconPhone className="h-3.5 w-3.5 flex-shrink-0" />
                                                {camp.contact_number || 'No contact'}
                                            </p>
                                            <p className="flex items-center gap-1.5">
                                                <IconClock className="h-3.5 w-3.5 flex-shrink-0" />
                                                Created: {formatDate(camp.created_at)}
                                            </p>
                                        </div>
                                        {camp.facilities && camp.facilities.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {camp.facilities.slice(0, 5).map((facility, idx) => (
                                                    <span key={idx} className="px-2 py-1 bg-white/10 rounded text-xs text-slate-300">
                                                        {facility}
                                                    </span>
                                                ))}
                                                {camp.facilities.length > 5 && (
                                                    <span className="px-2 py-1 bg-white/10 rounded text-xs text-slate-300">
                                                        +{camp.facilities.length - 5} more
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2 flex-wrap">
                                        <Link
                                            to={`/camps/${camp.id}`}
                                            className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
                                        >
                                            View Details
                                        </Link>

                                        {/* Edit Camp button - available to all admins */}
                                        {adminStatus.isAdmin && (
                                            <Link
                                                to={`/admin/edit-camp/${camp.id}`}
                                                className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/15 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                                                title="Edit camp details"
                                            >
                                                ✏️ Edit
                                            </Link>
                                        )}

                                        {/* Mark as Closed button - available to all admins */}
                                        {adminStatus.isAdmin && camp.status?.toLowerCase() !== 'closed' && (
                                            <button
                                                onClick={() => setCloseModal({ isOpen: true, camp })}
                                                disabled={isClosing}
                                                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                                                title="Mark camp as closed"
                                            >
                                                <IconX className="h-3.5 w-3.5" />
                                                Mark as Closed
                                            </button>
                                        )}

                                        {camp.status?.toLowerCase() === 'closed' && (
                                            <span className="px-3 py-2 bg-white/10 text-slate-300 rounded-lg text-sm font-medium flex items-center gap-1">
                                                <IconCheck className="h-3.5 w-3.5" />
                                                Closed
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Close Confirmation Modal */}
                {closeModal.isOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-slate-900 border border-white/10 rounded-lg shadow-2xl max-w-md w-full p-6">
                            <h3 className="text-xl font-bold text-white mb-4">Mark Camp as Closed</h3>
                            <p className="text-slate-300 mb-4">
                                Are you sure you want to mark <strong className="text-white">{closeModal.camp?.name}</strong> as closed?
                            </p>
                            <p className="text-sm text-slate-400 mb-6">
                                The camp will be marked as closed but all records will be maintained for historical tracking.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCloseCamp}
                                    disabled={isClosing}
                                    className="btn-primary flex-1 disabled:opacity-50"
                                >
                                    {isClosing ? 'Closing...' : 'Yes, Mark as Closed'}
                                </button>
                                <button
                                    onClick={() => setCloseModal({ isOpen: false, camp: null })}
                                    disabled={isClosing}
                                    className="px-6 py-2 border border-white/20 bg-white/5 text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminManageCamps;
