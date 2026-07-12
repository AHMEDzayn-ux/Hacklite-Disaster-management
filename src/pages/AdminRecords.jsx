import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import {
    secureDeleteRecord,
    checkIsAdmin,
    DELETABLE_TABLES,
    TABLE_DISPLAY_NAMES
} from '../services/adminService';
import DeleteConfirmModal from '../components/shared/DeleteConfirmModal';
import { IconGrid, IconSearch, IconX } from '../components/icons/Icons';

/**
 * Admin Records Management
 * ========================
 * Comprehensive admin page to view and delete ANY records
 * All deletions go through secure edge function with audit logging
 */
function AdminRecords() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();

    // Table selection
    const [selectedTable, setSelectedTable] = useState('camp_requests');
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Admin status
    const [adminStatus, setAdminStatus] = useState({ isAdmin: false, role: null });
    const [checkingAdmin, setCheckingAdmin] = useState(true);

    // Delete state
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, record: null });
    const [isDeleting, setIsDeleting] = useState(false);

    // Detail view state
    const [detailModal, setDetailModal] = useState({ isOpen: false, record: null });

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/admin/login');
        }
    }, [user, authLoading, navigate]);

    // Check admin status
    useEffect(() => {
        if (user) {
            setCheckingAdmin(true);
            checkIsAdmin().then((status) => {
                setAdminStatus(status);
                setCheckingAdmin(false);
            });
        } else {
            setCheckingAdmin(false);
        }
    }, [user]);

    // Fetch records when table changes
    useEffect(() => {
        if (user && selectedTable) {
            fetchRecords();
        }
    }, [user, selectedTable]);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from(selectedTable)
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setRecords(data || []);
        } catch (error) {
            console.error('Error fetching records:', error);
            setRecords([]);
        } finally {
            setLoading(false);
        }
    };

    // Secure delete handler
    const handleDeleteRecord = async (reason) => {
        if (!deleteModal.record) return;

        setIsDeleting(true);
        try {
            const result = await secureDeleteRecord(
                selectedTable,
                deleteModal.record.id,
                reason
            );

            if (result.success) {
                alert(`✅ ${result.message}`);
                fetchRecords();
                setDeleteModal({ isOpen: false, record: null });
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

    // Get display name for a record
    const getRecordDisplayName = (record) => {
        // Try common name fields
        return record.name ||
            record.camp_name ||
            record.title ||
            record.person_name ||
            record.full_name ||
            record.donor_name ||
            record.description?.substring(0, 50) ||
            `Record ${record.id?.substring(0, 8)}...`;
    };

    // Get record summary based on table type
    const getRecordSummary = (record) => {
        switch (selectedTable) {
            case 'camps':
                return `${record.district || 'Unknown'} | Capacity: ${record.total_capacity || 'N/A'} | Status: ${record.status || 'Unknown'}`;
            case 'camp_requests':
                return `${record.district || 'Unknown'} | Requester: ${record.requester_name || 'Unknown'} | Status: ${record.status || 'pending'}`;
            case 'missing_persons':
                return `Age: ${record.age || 'N/A'} | Last seen: ${record.last_seen_location || 'Unknown'} | Status: ${record.status || 'missing'}`;
            case 'disasters':
                return `Type: ${record.disaster_type || 'Unknown'} | Location: ${record.location || 'Unknown'} | Severity: ${record.severity || 'Unknown'}`;
            case 'animal_rescues':
                return `Animal: ${record.animal_type || 'Unknown'} | Location: ${record.location || 'Unknown'} | Status: ${record.status || 'pending'}`;
            case 'donations':
                return `Amount: ₹${record.amount || 0} | Donor: ${record.donor_name || 'Anonymous'} | Status: ${record.status || 'Unknown'}`;
            default:
                return `ID: ${record.id}`;
        }
    };

    // Filter records by search term
    const filteredRecords = records.filter(record => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return JSON.stringify(record).toLowerCase().includes(search);
    });

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Render a detail field with label and value
    const renderDetailField = (label, value) => {
        if (value === null || value === undefined || value === '') return null;
        return (
            <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="font-medium text-white capitalize">{value}</p>
            </div>
        );
    };

    if (authLoading || !user || checkingAdmin) {
        return (
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            </div>
        );
    }

    if (!adminStatus.isAdmin) {
        return (
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans flex items-center justify-center">
                <div className="relative z-10 text-center">
                    <div className="text-6xl mb-4">🚫</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-slate-400 mb-4">You are not authorized to access this page.</p>
                    <Link to="/admin/dashboard" className="text-primary-400 hover:underline">
                        Return to Dashboard
                    </Link>
                </div>
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
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link to="/admin/dashboard" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
                            ← Dashboard
                        </Link>
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-lg shadow-primary-500/30">
                                <IconGrid className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-white md:text-4xl">Records Management</h1>
                                <p className="mt-1 text-slate-300 text-sm">View, inspect, and securely delete any record</p>
                            </div>
                        </div>
                    </div>
                    <span className="px-3 py-1 bg-success-500/15 text-success-300 text-xs font-semibold rounded-full">
                        Admin: {user.email}
                    </span>
                </div>

                {/* Info Banner */}
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 backdrop-blur-md">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <h3 className="font-semibold text-amber-200">Admin Records Management</h3>
                        <p className="text-sm text-amber-100/80">
                            You can delete any record from any table. All deletions are permanently logged for audit purposes.
                            Deleted data can be recovered from audit logs if needed.
                        </p>
                    </div>
                </div>

                {/* Table Selection */}
                <div className="card mb-6">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Select Table</label>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(DELETABLE_TABLES).map(([key, tableName]) => (
                            <button
                                key={key}
                                onClick={() => {
                                    setSelectedTable(tableName);
                                    setSearchTerm('');
                                }}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedTable === tableName
                                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30'
                                    : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                {TABLE_DISPLAY_NAMES[tableName] || tableName}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search and Stats */}
                <div className="flex flex-wrap gap-4 mb-6">
                    <div className="flex-1 min-w-[200px] relative">
                        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder={`Search in ${TABLE_DISPLAY_NAMES[selectedTable] || selectedTable}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field pl-10"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-400">
                            Total: <strong className="text-slate-200">{records.length}</strong> records
                        </span>
                        <button
                            onClick={fetchRecords}
                            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                            🔄 Refresh
                        </button>
                    </div>
                </div>

                {/* Records List */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
                    </div>
                ) : filteredRecords.length === 0 ? (
                    <div className="card text-center py-12">
                        <div className="text-6xl mb-4">📭</div>
                        <h3 className="text-xl font-semibold text-white mb-2">No Records Found</h3>
                        <p className="text-slate-400">
                            {searchTerm ? 'Try a different search term.' : `No records in ${TABLE_DISPLAY_NAMES[selectedTable] || selectedTable}.`}
                        </p>
                    </div>
                ) : (
                    <div className="card p-0 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-xs uppercase tracking-wide text-slate-400 border-b border-white/10">
                                        <th className="px-4 py-3 text-left font-semibold">Name/Title</th>
                                        <th className="px-4 py-3 text-left font-semibold">Details</th>
                                        <th className="px-4 py-3 text-left font-semibold">Created</th>
                                        <th className="px-4 py-3 text-right font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRecords.map((record) => (
                                        <tr key={record.id} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-white">
                                                    {getRecordDisplayName(record)}
                                                </div>
                                                <div className="text-xs text-slate-500 font-mono">
                                                    {record.id?.substring(0, 8)}...
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-400">
                                                {getRecordSummary(record)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-500">
                                                {formatDate(record.created_at)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <button
                                                        onClick={() => setDetailModal({ isOpen: true, record })}
                                                        className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
                                                    >
                                                        👁️ View
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteModal({ isOpen: true, record })}
                                                        disabled={isDeleting}
                                                        className="px-3 py-1.5 bg-danger-600 hover:bg-danger-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                <DeleteConfirmModal
                    isOpen={deleteModal.isOpen}
                    onClose={() => setDeleteModal({ isOpen: false, record: null })}
                    onConfirm={handleDeleteRecord}
                    itemName={deleteModal.record ? getRecordDisplayName(deleteModal.record) : ''}
                    itemType={TABLE_DISPLAY_NAMES[selectedTable] || selectedTable}
                    requireReason={true}
                    isProcessing={isDeleting}
                    warningMessage={`This will permanently delete this ${TABLE_DISPLAY_NAMES[selectedTable] || 'record'} from the database. A snapshot will be saved in the audit log for potential recovery.`}
                />

                {/* Detail View Modal */}
                {detailModal.isOpen && detailModal.record && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
                        <div className="bg-slate-900 border border-white/10 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                            {/* Header */}
                            <div className="sticky top-0 bg-slate-900 px-6 py-4 border-b border-white/10 flex items-start justify-between z-10">
                                <div>
                                    <span className="text-sm text-slate-500">{TABLE_DISPLAY_NAMES[selectedTable]}</span>
                                    <h3 className="text-xl font-bold text-white">
                                        {getRecordDisplayName(detailModal.record)}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-mono mt-1">ID: {detailModal.record.id}</p>
                                </div>
                                <button
                                    onClick={() => setDetailModal({ isOpen: false, record: null })}
                                    className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <IconX className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Left Column - Photo & Key Info */}
                                    <div className="lg:col-span-1 space-y-6">
                                        {/* Photo Section */}
                                        {(detailModal.record.photo || detailModal.record.image || detailModal.record.photo_url || detailModal.record.image_url) && (
                                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                                <h4 className="text-lg font-semibold text-white mb-4">Photo</h4>
                                                <img
                                                    src={detailModal.record.photo || detailModal.record.image || detailModal.record.photo_url || detailModal.record.image_url}
                                                    alt={getRecordDisplayName(detailModal.record)}
                                                    className="w-full max-h-80 rounded-lg border border-white/10 shadow-md object-contain bg-white/5"
                                                    loading="lazy"
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                            </div>
                                        )}

                                        {/* Status Card */}
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                            <h4 className="text-lg font-semibold text-white mb-4">Status</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-sm text-slate-500">Current Status</p>
                                                    <p className="font-medium text-white">
                                                        {detailModal.record.status === 'approved' || detailModal.record.status === 'active' ? (
                                                            <span className="text-success-400">✅ {detailModal.record.status}</span>
                                                        ) : detailModal.record.status === 'pending' ? (
                                                            <span className="text-amber-400">⏳ {detailModal.record.status}</span>
                                                        ) : detailModal.record.status === 'rejected' ? (
                                                            <span className="text-danger-400">❌ {detailModal.record.status}</span>
                                                        ) : (
                                                            <span className="capitalize">{detailModal.record.status || 'N/A'}</span>
                                                        )}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-slate-500">Created At</p>
                                                    <p className="font-medium text-white">{formatDate(detailModal.record.created_at)}</p>
                                                </div>
                                                {detailModal.record.updated_at && (
                                                    <div>
                                                        <p className="text-sm text-slate-500">Last Updated</p>
                                                        <p className="font-medium text-white">{formatDate(detailModal.record.updated_at)}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Contact Info Card */}
                                        {(detailModal.record.contact_number || detailModal.record.phone || detailModal.record.email || detailModal.record.contact) && (
                                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                                <h4 className="text-lg font-semibold text-white mb-4">Contact Information</h4>
                                                <div className="space-y-3">
                                                    {(detailModal.record.contact_number || detailModal.record.phone || detailModal.record.contact) && (
                                                        <div>
                                                            <p className="text-sm text-slate-500">Phone Number</p>
                                                            <a href={`tel:${detailModal.record.contact_number || detailModal.record.phone || detailModal.record.contact}`}
                                                                className="font-medium text-primary-300 hover:text-primary-200">
                                                                📞 {detailModal.record.contact_number || detailModal.record.phone || detailModal.record.contact}
                                                            </a>
                                                        </div>
                                                    )}
                                                    {detailModal.record.email && (
                                                        <div>
                                                            <p className="text-sm text-slate-500">Email</p>
                                                            <a href={`mailto:${detailModal.record.email}`}
                                                                className="font-medium text-primary-300 hover:text-primary-200">
                                                                ✉️ {detailModal.record.email}
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Column - Details */}
                                    <div className="lg:col-span-2 space-y-6">
                                        {/* Primary Information Card */}
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                            <h4 className="text-lg font-semibold text-white mb-4">
                                                {selectedTable === 'camps' ? 'Camp Information' :
                                                    selectedTable === 'camp_requests' ? 'Request Information' :
                                                        selectedTable === 'missing_persons' ? 'Person Information' :
                                                            selectedTable === 'disasters' ? 'Disaster Information' :
                                                                selectedTable === 'animal_rescues' ? 'Rescue Information' :
                                                                    selectedTable === 'donations' ? 'Donation Information' : 'Details'}
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {renderDetailField('Name', detailModal.record.name || detailModal.record.camp_name || detailModal.record.title || detailModal.record.person_name)}
                                                {renderDetailField('District', detailModal.record.district)}
                                                {renderDetailField('Location', detailModal.record.location || detailModal.record.address)}
                                                {renderDetailField('Type', detailModal.record.type || detailModal.record.disaster_type || detailModal.record.animal_type)}
                                                {renderDetailField('Severity', detailModal.record.severity)}
                                                {renderDetailField('Age', detailModal.record.age)}
                                                {renderDetailField('Gender', detailModal.record.gender)}
                                                {renderDetailField('Capacity', detailModal.record.total_capacity || detailModal.record.capacity)}
                                                {renderDetailField('Current Occupancy', detailModal.record.current_occupancy)}
                                                {renderDetailField('Amount', detailModal.record.amount ? `₹${detailModal.record.amount}` : null)}
                                                {renderDetailField('Donor Name', detailModal.record.donor_name)}
                                                {renderDetailField('Requester', detailModal.record.requester_name)}
                                            </div>
                                        </div>

                                        {/* Description Card */}
                                        {(detailModal.record.description || detailModal.record.notes || detailModal.record.additional_info || detailModal.record.reason) && (
                                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                                <h4 className="text-lg font-semibold text-white mb-4">Description</h4>
                                                <p className="text-slate-300 whitespace-pre-wrap">
                                                    {detailModal.record.description || detailModal.record.notes || detailModal.record.additional_info || detailModal.record.reason}
                                                </p>
                                            </div>
                                        )}

                                        {/* Facilities Card (for camps) */}
                                        {detailModal.record.facilities && (
                                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                                <h4 className="text-lg font-semibold text-white mb-4">Facilities</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {(Array.isArray(detailModal.record.facilities)
                                                        ? detailModal.record.facilities
                                                        : (typeof detailModal.record.facilities === 'string'
                                                            ? detailModal.record.facilities.split(',')
                                                            : [])
                                                    ).map((facility, idx) => (
                                                        <span key={idx} className="px-3 py-1 bg-primary-500/15 text-primary-300 rounded-full text-sm">
                                                            {facility.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* All Fields (Expandable) */}
                                        <details className="bg-white/5 border border-white/10 rounded-xl">
                                            <summary className="p-4 cursor-pointer font-semibold text-white hover:bg-white/10 rounded-xl">
                                                📋 View All Raw Fields
                                            </summary>
                                            <div className="px-4 pb-4 space-y-3 border-t border-white/10 mt-2 pt-4">
                                                {Object.entries(detailModal.record).map(([key, value]) => {
                                                    if (value === null || value === undefined) return null;

                                                    let displayValue = value;
                                                    if (typeof value === 'object') {
                                                        displayValue = JSON.stringify(value, null, 2);
                                                    } else if (typeof value === 'boolean') {
                                                        displayValue = value ? '✅ Yes' : '❌ No';
                                                    } else if (key.includes('date') || key.includes('_at')) {
                                                        displayValue = formatDate(value);
                                                    }

                                                    return (
                                                        <div key={key} className="border-b border-white/10 pb-2">
                                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                                {key.replace(/_/g, ' ')}
                                                            </p>
                                                            <div className="text-sm text-slate-200 mt-1">
                                                                {typeof value === 'object' ? (
                                                                    <pre className="bg-black/30 p-2 rounded text-xs overflow-x-auto border border-white/10">
                                                                        {displayValue}
                                                                    </pre>
                                                                ) : (
                                                                    <span className="whitespace-pre-wrap">{displayValue}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </details>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="sticky bottom-0 bg-slate-900 px-6 py-4 border-t border-white/10 flex gap-3 justify-end">
                                <button
                                    onClick={() => setDetailModal({ isOpen: false, record: null })}
                                    className="px-4 py-2 border border-white/20 bg-white/5 text-white hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        setDetailModal({ isOpen: false, record: null });
                                        setDeleteModal({ isOpen: true, record: detailModal.record });
                                    }}
                                    className="px-4 py-2 bg-danger-600 hover:bg-danger-700 text-white rounded-lg transition-colors flex items-center gap-2"
                                >
                                    🗑️ Delete This Record
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminRecords;
