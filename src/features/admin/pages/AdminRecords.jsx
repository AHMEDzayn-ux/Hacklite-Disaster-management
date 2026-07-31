import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { supabase } from '@/lib/supabase';
import {
    secureDeleteRecord,
    checkIsAdmin,
    DELETABLE_TABLES,
    TABLE_DISPLAY_NAMES
} from '@/features/admin/services/adminService';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';
import { IconSearch, IconX } from '@/components/icons/Icons';

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
                <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
                <p className="font-medium text-slate-900 dark:text-white capitalize">{value}</p>
            </div>
        );
    };

    if (authLoading || !user || checkingAdmin) {
        return (
            <div className="page-shell flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            </div>
        );
    }

    if (!adminStatus.isAdmin) {
        return (
            <div className="page-shell flex items-center justify-center">
                <div className="relative z-10 text-center">
                    <div className="text-6xl mb-4">🚫</div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-4">You are not authorized to access this page.</p>
                    <Link to="/admin/dashboard" className="text-primary-700 dark:text-primary-300 hover:underline">
                        Return to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="page-shell flex h-[calc(100dvh-3rem)] flex-col overflow-hidden">
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-3 overflow-hidden px-3 py-3 sm:px-4 lg:px-6">
                {/* Info Banner */}
                <div className="flex flex-none items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 backdrop-blur-md dark:border-amber-400/20 dark:bg-amber-500/10">
                    <span className="text-lg leading-none text-amber-700 dark:text-amber-200">⚠️</span>
                    <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                        <h3 className="whitespace-nowrap text-sm font-semibold text-amber-900 dark:text-amber-200">Admin Records Management</h3>
                        <p className="truncate text-xs text-amber-800 dark:text-amber-100/80">
                            Permanent deletes are audit logged, with snapshots retained for recovery.
                        </p>
                    </div>
                </div>

                {/* Table Selection */}
                <div className="flex flex-none flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
                    <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Table</span>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(DELETABLE_TABLES).map(([key, tableName]) => (
                            <button
                                key={key}
                                onClick={() => {
                                    setSelectedTable(tableName);
                                    setSearchTerm('');
                                }}
                                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${selectedTable === tableName
                                    ? 'border border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
                                    }`}
                            >
                                {TABLE_DISPLAY_NAMES[tableName] || tableName}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search and Stats */}
                <div className="flex flex-none flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative min-w-[220px] flex-1">
                        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder={`Search in ${TABLE_DISPLAY_NAMES[selectedTable] || selectedTable}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pl-10 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-primary-400/50 dark:focus:ring-primary-500/50"
                        />
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <span className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                            Total: <strong className="text-slate-900 dark:text-slate-200">{records.length}</strong> records
                        </span>
                        <button
                            onClick={fetchRecords}
                            className="h-9 rounded-lg border-2 border-slate-900 bg-white px-3 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-900 hover:text-white dark:border-white dark:bg-transparent dark:text-white dark:hover:bg-white dark:hover:text-slate-900"
                        >
                            🔄 Refresh
                        </button>
                    </div>
                </div>

                {/* Records List */}
                {loading ? (
                    <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.05]">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent"></div>
                    </div>
                ) : filteredRecords.length === 0 ? (
                    <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
                        <div className="text-5xl mb-3">📭</div>
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Records Found</h3>
                        <p className="text-slate-500 dark:text-slate-400">
                            {searchTerm ? 'Try a different search term.' : `No records in ${TABLE_DISPLAY_NAMES[selectedTable] || selectedTable}.`}
                        </p>
                    </div>
                ) : (
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.05]">
                        <div className="scroll-panel min-h-0 flex-1 overflow-auto">
                            <table className="w-full min-w-[900px]">
                                <thead className="sticky top-0 z-10">
                                    <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
                                        <th className="px-4 py-2.5 text-left font-semibold">Name/Title</th>
                                        <th className="px-4 py-2.5 text-left font-semibold">Details</th>
                                        <th className="px-4 py-2.5 text-left font-semibold">Created</th>
                                        <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRecords.map((record) => (
                                        <tr key={record.id} className="border-b border-slate-200 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                                            <td className="px-4 py-2.5">
                                                <div className="font-medium text-slate-900 dark:text-white">
                                                    {getRecordDisplayName(record)}
                                                </div>
                                                <div className="text-xs text-slate-500 font-mono">
                                                    {record.id?.substring(0, 8)}...
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400">
                                                {getRecordSummary(record)}
                                            </td>
                                            <td className="px-4 py-2.5 text-sm text-slate-500">
                                                {formatDate(record.created_at)}
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <button
                                                        onClick={() => setDetailModal({ isOpen: true, record })}
                                                        className="px-3 py-1.5 border-2 border-slate-900 dark:border-white bg-white dark:bg-transparent hover:bg-slate-900 dark:hover:bg-white text-slate-900 dark:text-white hover:text-white dark:hover:text-slate-900 rounded-lg text-sm font-medium transition-colors"
                                                    >
                                                        👁️ View
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteModal({ isOpen: true, record })}
                                                        disabled={isDeleting}
                                                        className="px-3 py-1.5 bg-danger-600 hover:bg-danger-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
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
                    <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
                        <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl dark:bg-slate-900 dark:border-white/10">
                            {/* Header */}
                            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-200 flex items-start justify-between z-10 dark:bg-slate-900 dark:border-white/10">
                                <div>
                                    <span className="text-sm text-slate-500 dark:text-slate-400">{TABLE_DISPLAY_NAMES[selectedTable]}</span>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                        {getRecordDisplayName(detailModal.record)}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-mono mt-1">ID: {detailModal.record.id}</p>
                                </div>
                                <button
                                    onClick={() => setDetailModal({ isOpen: false, record: null })}
                                    className="text-slate-500 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100 transition-colors dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10"
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
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                                                <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Photo</h4>
                                                <img
                                                    src={detailModal.record.photo || detailModal.record.image || detailModal.record.photo_url || detailModal.record.image_url}
                                                    alt={getRecordDisplayName(detailModal.record)}
                                                    className="w-full max-h-80 rounded-lg border border-slate-200 shadow-md object-contain bg-white dark:border-white/10 dark:bg-white/5"
                                                    loading="lazy"
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                            </div>
                                        )}

                                        {/* Status Card */}
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                                            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Status</h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">Current Status</p>
                                                    <p className="font-medium text-slate-900 dark:text-white">
                                                        {detailModal.record.status === 'approved' || detailModal.record.status === 'active' ? (
                                                            <span className="text-success-700 dark:text-success-400">✅ {detailModal.record.status}</span>
                                                        ) : detailModal.record.status === 'pending' ? (
                                                            <span className="text-amber-700 dark:text-amber-400">⏳ {detailModal.record.status}</span>
                                                        ) : detailModal.record.status === 'rejected' ? (
                                                            <span className="text-danger-700 dark:text-danger-400">❌ {detailModal.record.status}</span>
                                                        ) : (
                                                            <span className="capitalize">{detailModal.record.status || 'N/A'}</span>
                                                        )}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">Created At</p>
                                                    <p className="font-medium text-slate-900 dark:text-white">{formatDate(detailModal.record.created_at)}</p>
                                                </div>
                                                {detailModal.record.updated_at && (
                                                    <div>
                                                        <p className="text-sm text-slate-500 dark:text-slate-400">Last Updated</p>
                                                        <p className="font-medium text-slate-900 dark:text-white">{formatDate(detailModal.record.updated_at)}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Contact Info Card */}
                                        {(detailModal.record.contact_number || detailModal.record.phone || detailModal.record.email || detailModal.record.contact) && (
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                                                <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Contact Information</h4>
                                                <div className="space-y-3">
                                                    {(detailModal.record.contact_number || detailModal.record.phone || detailModal.record.contact) && (
                                                        <div>
                                                            <p className="text-sm text-slate-500 dark:text-slate-400">Phone Number</p>
                                                            <a href={`tel:${detailModal.record.contact_number || detailModal.record.phone || detailModal.record.contact}`}
                                                                className="font-medium text-primary-700 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-200">
                                                                📞 {detailModal.record.contact_number || detailModal.record.phone || detailModal.record.contact}
                                                            </a>
                                                        </div>
                                                    )}
                                                    {detailModal.record.email && (
                                                        <div>
                                                            <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
                                                            <a href={`mailto:${detailModal.record.email}`}
                                                                className="font-medium text-primary-700 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-200">
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
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                                            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
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

                                        {/*
                                          Missing person cases only. The reporter's identity is withheld
                                          from every responder and public view — a stranger who can name
                                          the family and phone them directly is how "I found her, pay me
                                          first" starts. This console is the one place it is shown.
                                        */}
                                        {selectedTable === 'missing_persons' && (
                                            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                                                <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Reporter (withheld from public views)</h4>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                                                    Administrator-only. Responders never see these; the reporter is notified automatically by SMS when a case is closed.
                                                </p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {renderDetailField('Reporter Name', detailModal.record.reporter_name)}
                                                    {renderDetailField('Reporter Phone', detailModal.record.contact_number)}
                                                    {renderDetailField('Reported Via', detailModal.record.reported_via_sms ? 'SMS' : 'Web form')}
                                                </div>
                                            </div>
                                        )}

                                        {/* Case closure record (missing persons) */}
                                        {selectedTable === 'missing_persons' && detailModal.record.found_at && (
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                                                <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Case Closure</h4>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                                                    Submitted by a member of the public and screened for payment demands, but not independently verified.
                                                </p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {renderDetailField('Closed By', detailModal.record.resolved_by_name)}
                                                    {renderDetailField('Closer\'s Phone', detailModal.record.found_by_contact)}
                                                    {renderDetailField('Person Now At', detailModal.record.found_person_location)}
                                                    {renderDetailField('Condition', (detailModal.record.found_person_condition || '').replace(/_/g, ' '))}
                                                    {renderDetailField('Verify With', detailModal.record.authority_contact)}
                                                    {renderDetailField('Closed At', formatDate(detailModal.record.found_at))}
                                                    {renderDetailField('Reporter Notified',
                                                        detailModal.record.reporter_notification_status === 'sent'
                                                            ? `Yes — SMS ${formatDate(detailModal.record.reporter_notified_at)}`
                                                            : detailModal.record.reporter_notification_status
                                                                ? `No — ${detailModal.record.reporter_notification_status.replace(/_/g, ' ')}`
                                                                : null)}
                                                </div>
                                                {detailModal.record.found_notes && (
                                                    <p className="mt-4 pt-4 border-t border-slate-200 text-slate-700 whitespace-pre-wrap dark:border-white/10 dark:text-slate-300">
                                                        {detailModal.record.found_notes}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Description Card */}
                                        {(detailModal.record.description || detailModal.record.notes || detailModal.record.additional_info || detailModal.record.reason) && (
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                                                <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Description</h4>
                                                <p className="text-slate-700 whitespace-pre-wrap dark:text-slate-300">
                                                    {detailModal.record.description || detailModal.record.notes || detailModal.record.additional_info || detailModal.record.reason}
                                                </p>
                                            </div>
                                        )}

                                        {/* Facilities Card (for camps) */}
                                        {detailModal.record.facilities && (
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                                                <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Facilities</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {(Array.isArray(detailModal.record.facilities)
                                                        ? detailModal.record.facilities
                                                        : (typeof detailModal.record.facilities === 'string'
                                                            ? detailModal.record.facilities.split(',')
                                                            : [])
                                                    ).map((facility, idx) => (
                                                        <span key={idx} className="rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-sm text-primary-700 dark:border-transparent dark:bg-primary-500/15 dark:text-primary-300">
                                                            {facility.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* All Fields (Expandable) */}
                                        <details className="rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
                                            <summary className="p-4 cursor-pointer font-semibold text-slate-900 hover:bg-slate-100 rounded-xl dark:text-white dark:hover:bg-white/10">
                                                📋 View All Raw Fields
                                            </summary>
                                            <div className="px-4 pb-4 space-y-3 border-t border-slate-200 mt-2 pt-4 dark:border-white/10">
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
                                                        <div key={key} className="border-b border-slate-200 pb-2 dark:border-white/10">
                                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide dark:text-slate-400">
                                                                {key.replace(/_/g, ' ')}
                                                            </p>
                                                            <div className="text-sm text-slate-700 mt-1 dark:text-slate-200">
                                                                {typeof value === 'object' ? (
                                                                    <pre className="bg-slate-100 p-2 rounded text-xs overflow-x-auto border border-slate-200 text-slate-800 dark:bg-black/30 dark:border-white/10 dark:text-slate-100">
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
                            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-slate-200 flex gap-3 justify-end dark:bg-slate-900 dark:border-white/10">
                                <button
                                    onClick={() => setDetailModal({ isOpen: false, record: null })}
                                    className="px-4 py-2 border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 rounded-lg transition-colors dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        setDetailModal({ isOpen: false, record: null });
                                        setDeleteModal({ isOpen: true, record: detailModal.record });
                                    }}
                                    className="px-4 py-2 bg-danger-600 hover:bg-danger-700 text-white rounded-lg flex items-center gap-2"
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
