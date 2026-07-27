import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { checkIsAdmin, secureDeleteRecord, DELETABLE_TABLES } from '../services/adminService';
import { fetchCampRequests, rejectCampRequest } from '../services/campManagementService';
import DeleteConfirmModal from '../components/shared/DeleteConfirmModal';
import { IconTent } from '../components/icons/Icons';

/**
 * Admin Review Requests Page
 * ==========================
 * Lists all public camp requests for admin review
 * Admin can:
 * - Approve: Navigate to registration form with pre-filled data
 * - Reject: Provide reason and reject
 * - Delete: Permanently remove rejected/pending requests
 */
function AdminReviewRequests() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');

    // Rejection modal state
    const [rejectModal, setRejectModal] = useState({ isOpen: false, request: null });
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejecting, setRejecting] = useState(false);

    // Delete modal state
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, request: null });
    const [isDeleting, setIsDeleting] = useState(false);

    // Admin status
    const [adminStatus, setAdminStatus] = useState({ isAdmin: false, role: null });

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

    // Fetch camp requests
    useEffect(() => {
        if (user) {
            loadRequests();
        }
    }, [user, filter]);

    const loadRequests = async () => {
        setLoading(true);
        const result = await fetchCampRequests(filter);
        setRequests(result.data || []);
        setLoading(false);
    };

    // Handle approve - navigate to registration with pre-filled data
    const handleApprove = (request) => {
        navigate('/admin/register-camp', {
            state: {
                fromRequest: true,
                requestId: request.id,
                prefillData: {
                    camp_name: request.camp_name,
                    district: request.district,
                    ds_division: request.ds_division,
                    village_area: request.village_area,
                    nearby_landmark: request.nearby_landmark,
                    address: request.address,
                    latitude: request.latitude,
                    longitude: request.longitude,
                    estimated_capacity: request.estimated_capacity,
                    facilities_needed: request.facilities_needed || [],
                    requester_name: request.requester_name,
                    requester_phone: request.requester_phone,
                    requester_email: request.requester_email,
                    reason: request.reason,
                    additional_notes: request.additional_notes,
                    urgency_level: request.urgency_level,
                    special_needs: request.special_needs
                }
            }
        });
    };

    // Handle reject
    const handleReject = async () => {
        if (!rejectModal.request || !rejectionReason.trim()) {
            alert('Please provide a reason for rejection');
            return;
        }

        setRejecting(true);
        try {
            const result = await rejectCampRequest(rejectModal.request.id, rejectionReason.trim());

            if (result.success) {
                alert('✅ Camp request rejected successfully.');
                loadRequests();
                setRejectModal({ isOpen: false, request: null });
                setRejectionReason('');
            } else {
                alert(`❌ Error: ${result.error}`);
            }
        } catch (error) {
            console.error('Rejection error:', error);
            alert('❌ Failed to reject request: ' + error.message);
        } finally {
            setRejecting(false);
        }
    };

    // Handle delete
    const handleDelete = async (reason) => {
        if (!deleteModal.request) return;

        setIsDeleting(true);
        try {
            const result = await secureDeleteRecord(
                DELETABLE_TABLES.CAMP_REQUESTS,
                deleteModal.request.id,
                reason
            );

            if (result.success) {
                alert(`✅ ${result.message}`);
                loadRequests();
                setDeleteModal({ isOpen: false, request: null });
            } else {
                alert(`❌ Error: ${result.error}`);
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert(`❌ Failed to delete: ${error.message}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: 'bg-amber-500/15 text-amber-300 border-amber-400/20',
            approved: 'bg-success-500/15 text-success-300 border-success-400/20',
            rejected: 'bg-danger-500/15 text-danger-300 border-danger-400/20'
        };
        return badges[status] || 'bg-white/10 text-slate-300 border-white/10';
    };

    const getUrgencyBadge = (urgency) => {
        const badges = {
            low: '🟢 Low',
            medium: '🟡 Medium',
            high: '🟠 High',
            critical: '🔴 Critical'
        };
        const colors = {
            low: 'bg-success-500/15 text-success-300 border border-success-400/20',
            medium: 'bg-amber-500/15 text-amber-300 border border-amber-400/20',
            high: 'bg-orange-500/15 text-orange-300 border border-orange-400/20',
            critical: 'bg-danger-500/15 text-danger-300 border border-danger-400/20'
        };
        return { text: badges[urgency] || urgency, className: colors[urgency] || 'bg-white/10 text-slate-300 border border-white/10' };
    };

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
                {/* Header */}
                <div className="mb-6 flex items-center gap-4">
                    <Link to="/admin/dashboard" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
                        ← Dashboard
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
                            <IconTent className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white md:text-4xl">Review Camp Requests</h1>
                            <p className="mt-1 text-slate-300 text-sm">Approve or reject relief camp requests from the public</p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-6">
                    {['pending', 'approved', 'rejected', 'all'].map((status) => (
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

                {/* Request List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="card text-center py-12">
                        <div className="text-6xl mb-4">📭</div>
                        <h3 className="text-xl font-semibold text-white mb-2">No Requests Found</h3>
                        <p className="text-slate-400">No {filter !== 'all' ? filter : ''} camp requests at this time.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {requests.map((request) => (
                            <div key={request.id} className="card">
                                {/* Header with title and action buttons */}
                                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-lg font-bold text-white">{request.camp_name}</h3>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(request.status)}`}>
                                            {request.status}
                                        </span>
                                        {request.urgency_level && (() => {
                                            const urgency = getUrgencyBadge(request.urgency_level);
                                            return (
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${urgency.className}`}>
                                                    {urgency.text}
                                                </span>
                                            );
                                        })()}
                                    </div>

                                    {/* Action Buttons - Always visible for pending */}
                                    {request.status === 'pending' && (
                                        <div className="flex gap-2 flex-shrink-0">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleApprove(request);
                                                }}
                                                className="btn-success py-2 px-4 cursor-pointer"
                                            >
                                                ✓ Approve
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setRejectModal({ isOpen: true, request });
                                                }}
                                                className="btn-danger py-2 px-4 cursor-pointer"
                                            >
                                                ✕ Reject
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div>
                                    {/* Location & Contact Info */}
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 text-sm text-slate-300 mb-3">
                                        <p>📍 <strong className="text-slate-200">District:</strong> {request.district}</p>
                                        {request.village_area && <p>🏘️ <strong className="text-slate-200">Village:</strong> {request.village_area}</p>}
                                        {request.nearby_landmark && <p>🏛️ <strong className="text-slate-200">Landmark:</strong> {request.nearby_landmark}</p>}
                                        <p>👤 <strong className="text-slate-200">Contact:</strong> {request.requester_name}</p>
                                        <p>📞 {request.requester_phone}</p>
                                        <p>👥 <strong className="text-slate-200">People:</strong> {request.estimated_capacity}</p>
                                        <p>🕒 {formatDate(request.created_at)}</p>
                                    </div>

                                    {/* Special Needs - Highlighted */}
                                    {request.special_needs && (
                                        <div className="bg-amber-500/10 border-l-4 border-amber-400 p-3 rounded mb-3">
                                            <p className="text-sm font-semibold text-amber-200 mb-1">⚠️ Special Needs:</p>
                                            <p className="text-sm text-amber-100/80 whitespace-pre-line">{request.special_needs}</p>
                                        </div>
                                    )}

                                    {/* Facilities Needed */}
                                    {request.facilities_needed && request.facilities_needed.length > 0 && (
                                        <div className="mb-3">
                                            <p className="text-xs font-semibold text-slate-300 mb-1">Facilities Needed:</p>
                                            <div className="flex flex-wrap gap-1">
                                                {request.facilities_needed.map((facility, idx) => (
                                                    <span key={idx} className="px-2 py-1 bg-primary-500/10 border border-primary-400/20 rounded text-xs text-primary-300">
                                                        {facility}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Reason/Situation */}
                                    <div className="bg-white/5 border border-white/10 p-3 rounded mb-2">
                                        <p className="text-xs font-semibold text-slate-300 mb-1">📝 Situation Description:</p>
                                        <p className="text-sm text-slate-300 whitespace-pre-line">{request.reason}</p>
                                    </div>

                                    {/* Additional Notes */}
                                    {request.additional_notes && (
                                        <div className="bg-white/5 border border-white/10 p-3 rounded">
                                            <p className="text-xs font-semibold text-slate-300 mb-1">📎 Additional Notes:</p>
                                            <p className="text-sm text-slate-400 whitespace-pre-line">{request.additional_notes}</p>
                                        </div>
                                    )}

                                    {/* Rejection Reason */}
                                    {request.rejection_reason && (
                                        <div className="bg-danger-500/10 border-l-4 border-danger-400 p-3 rounded mt-3">
                                            <p className="text-sm font-semibold text-danger-300 mb-1">❌ Rejection Reason:</p>
                                            <p className="text-sm text-danger-200/80">{request.rejection_reason}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Footer with delete button */}
                                {(request.status === 'rejected' || request.status === 'pending') && adminStatus.isAdmin && (
                                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setDeleteModal({ isOpen: true, request });
                                            }}
                                            disabled={isDeleting}
                                            className="px-3 py-2 border border-white/20 bg-white/5 text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
                                        >
                                            🗑️ Delete Request
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Rejection Modal */}
                {rejectModal.isOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl">
                            <h3 className="text-lg font-bold text-white mb-2">Reject Camp Request</h3>
                            <p className="text-sm text-slate-300 mb-4">
                                Please provide a reason for rejecting "<strong className="text-white">{rejectModal.request?.camp_name}</strong>"
                            </p>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Enter rejection reason..."
                                className="input-field h-28 mb-4 resize-none"
                                autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => {
                                        setRejectModal({ isOpen: false, request: null });
                                        setRejectionReason('');
                                    }}
                                    className="px-4 py-2 border border-white/20 bg-white/5 text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={rejecting || !rejectionReason.trim()}
                                    className="btn-danger py-2 px-4 disabled:opacity-50"
                                >
                                    {rejecting ? 'Rejecting...' : 'Reject Request'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                <DeleteConfirmModal
                    isOpen={deleteModal.isOpen}
                    onClose={() => setDeleteModal({ isOpen: false, request: null })}
                    onConfirm={handleDelete}
                    itemName={deleteModal.request?.camp_name || ''}
                    itemType="Camp Request"
                    requireReason={true}
                    isProcessing={isDeleting}
                    warningMessage="This will permanently remove this camp request from the database. The action will be recorded in the audit log."
                />
            </div>
        </div>
    );
}

export default AdminReviewRequests;
