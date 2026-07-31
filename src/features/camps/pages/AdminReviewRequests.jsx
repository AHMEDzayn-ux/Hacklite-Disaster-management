import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { checkIsAdmin, secureDeleteRecord, DELETABLE_TABLES } from '@/features/admin/services/adminService';
import { fetchCampRequests, rejectCampRequest } from '@/features/camps/services/campManagementService';
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal';
import {
    PANEL, PANEL_HEAD, PANEL_FOOT, TH, TD, BTN, BTN_SOLID, BTN_DANGER, INPUT_SM,
    PILL, chip, sortRows, nextSort,
} from '@/components/ui/tableStyles';
import SortHeader from '@/components/ui/SortHeader';
import { IconSearch, IconChevronRight } from '@/components/icons/Icons';

/**
 * Admin Review Requests
 * =====================
 * Camps the public has asked for, waiting on a decision. Approving carries the
 * request's details into the registration form rather than creating a camp
 * outright - someone has to fill in what the public can't know (exact capacity,
 * who will manage it) before a camp exists.
 *
 * The decision itself reads off a handful of comparable fields, so those are
 * columns and the request is a row; the prose a requester wrote - why they need
 * it, who needs special care - opens under the row, where it doesn't cost every
 * other request its place on screen.
 */

const STATUS_FILTERS = ['pending', 'approved', 'rejected', 'all'];

const COLUMNS = [
    { key: 'createdMs', label: 'Requested', numeric: true },
    { key: 'camp_name', label: 'Camp' },
    { key: 'district', label: 'District' },
    { key: 'urgencyRank', label: 'Urgency', numeric: true },
    { key: 'estimated_capacity', label: 'People', className: 'text-right', numeric: true },
    { key: 'requester_name', label: 'Requested by' },
    { key: 'status', label: 'Status' },
];

const STATUS_STYLES = {
    pending: 'border-amber-400/60 text-amber-700 dark:border-amber-400/30 dark:text-amber-300',
    approved: 'border-success-500/60 text-success-700 dark:border-success-400/30 dark:text-success-300',
    rejected: 'border-danger-400/60 text-danger-700 dark:border-danger-400/30 dark:text-danger-300',
};

/** Ranked so the urgency column sorts by how urgent it is, not alphabetically. */
const URGENCY_RANK = { low: 1, medium: 2, high: 3, critical: 4 };

const URGENCY_STYLES = {
    low: 'border-slate-300 text-slate-500 dark:border-white/15 dark:text-slate-400',
    medium: 'border-amber-400/60 text-amber-700 dark:border-amber-400/30 dark:text-amber-300',
    high: 'border-orange-400/60 text-orange-700 dark:border-orange-400/30 dark:text-orange-300',
    critical: 'border-danger-400/60 text-danger-700 dark:border-danger-400/30 dark:text-danger-300',
};

const timestamp = (iso) => (iso
    ? new Date(iso).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—');

function AdminReviewRequests() {
    const navigate = useNavigate();
    const { user } = useAuth();
    // Approving or rejecting changes the count on the section's Requests tab.
    const { refreshPending } = useOutletContext() ?? {};

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState({ key: 'urgencyRank', dir: 'desc' });
    const [expanded, setExpanded] = useState(null);

    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const [rejectModal, setRejectModal] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejecting, setRejecting] = useState(false);

    const [deleteModal, setDeleteModal] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [adminStatus, setAdminStatus] = useState({ isAdmin: false, role: null });

    useEffect(() => {
        if (user) checkIsAdmin().then(setAdminStatus);
    }, [user]);

    const loadRequests = useCallback(async () => {
        setLoading(true);
        const result = await fetchCampRequests(filter);
        if (!result.success) setError(result.error || 'Failed to load camp requests');
        setRequests(result.data || []);
        setLoading(false);
        refreshPending?.();
    }, [filter, refreshPending]);

    useEffect(() => { if (user) loadRequests(); }, [user, loadRequests]);

    /**
     * Approving hands the request's details to the registration form. The form
     * creates the camp and closes the request, so nothing is written here.
     */
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
                    special_needs: request.special_needs,
                },
            },
        });
    };

    const handleReject = async () => {
        if (!rejectModal || !rejectionReason.trim()) return;
        setRejecting(true);
        setError('');
        const result = await rejectCampRequest(rejectModal.id, rejectionReason.trim());
        setRejecting(false);
        if (result.success) {
            setNotice(`Rejected "${rejectModal.camp_name}".`);
            setRejectModal(null);
            setRejectionReason('');
            loadRequests();
        } else {
            setError(result.error || 'Failed to reject the request');
        }
    };

    const handleDelete = async (reason) => {
        if (!deleteModal) return;
        setIsDeleting(true);
        setError('');
        const result = await secureDeleteRecord(DELETABLE_TABLES.CAMP_REQUESTS, deleteModal.id, reason);
        setIsDeleting(false);
        if (result.success) {
            setNotice(result.message || 'Request deleted.');
            setDeleteModal(null);
            loadRequests();
        } else {
            setError(result.error || 'Failed to delete the request');
        }
    };

    const rows = useMemo(() => requests.map(request => ({
        ...request,
        camp_name: request.camp_name || '(unnamed)',
        urgencyRank: URGENCY_RANK[request.urgency_level] ?? 0,
        createdMs: request.created_at ? new Date(request.created_at).getTime() : null,
    })), [requests]);

    const visibleRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        const filtered = term
            ? rows.filter(row => `${row.camp_name} ${row.district} ${row.requester_name} ${row.village_area || ''}`
                .toLowerCase().includes(term))
            : rows;
        return sortRows(filtered, sort, 'camp_name');
    }, [rows, search, sort]);

    const toggleSort = (key, numeric) => setSort(prev => nextSort(prev, key, numeric));

    return (
        <div className="flex h-full flex-col px-4 py-3 sm:px-6">
            {(error || notice) && (
                <div className="mb-2 flex-none">
                    {error ? (
                        <div className="rounded-md border border-danger-300 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-400/30 dark:bg-danger-500/10 dark:text-danger-300">
                            {error}
                        </div>
                    ) : (
                        <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200">
                            {notice}
                        </div>
                    )}
                </div>
            )}

            {/* flex-1 rather than the panel's own h-full: a notice above it has to
                take its height out of the table, not push the table off-screen. */}
            <section className={PANEL + ' min-h-0 flex-1'}>
                <div className={PANEL_HEAD}>
                    <div className="flex flex-wrap items-center gap-1.5">
                        {STATUS_FILTERS.map(status => (
                            <button key={status} onClick={() => setFilter(status)} className={chip(filter === status)}>
                                {status}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <IconSearch className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search camp, district, requester"
                                className={INPUT_SM + ' w-52 pl-7'}
                            />
                        </div>
                        <button onClick={loadRequests} disabled={loading} className={BTN}>
                            {loading ? 'Loading...' : 'Refresh'}
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-auto">
                    <table className="w-full min-w-[60rem] text-sm">
                        <thead className="sticky top-0 z-10">
                            <tr>
                                <th scope="col" className={TH + ' w-8'}></th>
                                {COLUMNS.map(column => (
                                    <SortHeader key={column.key} column={column} sort={sort} onSort={toggleSort} />
                                ))}
                                <th scope="col" className={TH + ' text-right'}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRows.map(row => {
                                const isOpen = expanded === row.id;
                                return (
                                    <React.Fragment key={row.id}>
                                        <tr
                                            onClick={() => setExpanded(isOpen ? null : row.id)}
                                            className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                                        >
                                            <td className={TD}>
                                                <IconChevronRight
                                                    className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-150 dark:text-slate-500 ${isOpen ? 'rotate-90' : ''}`}
                                                />
                                            </td>
                                            <td className={TD + ' whitespace-nowrap text-slate-500 dark:text-slate-400'}>
                                                {timestamp(row.created_at)}
                                            </td>
                                            <td className={TD + ' font-medium text-slate-900 dark:text-white'}>{row.camp_name}</td>
                                            <td className={TD + ' text-slate-600 dark:text-slate-300'}>
                                                {row.district || '—'}
                                                {row.village_area && (
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.village_area}</div>
                                                )}
                                            </td>
                                            <td className={TD}>
                                                {row.urgency_level ? (
                                                    <span className={`${PILL} ${URGENCY_STYLES[row.urgency_level] || 'border-slate-300 text-slate-500'}`}>
                                                        {row.urgency_level}
                                                    </span>
                                                ) : <span className="text-slate-400 dark:text-slate-500">—</span>}
                                            </td>
                                            <td className={TD + ' text-right tabular-nums text-slate-700 dark:text-slate-200'}>
                                                {row.estimated_capacity ?? '—'}
                                            </td>
                                            <td className={TD + ' text-slate-600 dark:text-slate-300'}>
                                                {row.requester_name || '—'}
                                                {row.requester_phone && (
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">{row.requester_phone}</div>
                                                )}
                                            </td>
                                            <td className={TD}>
                                                <span className={`${PILL} ${STATUS_STYLES[row.status] || 'border-slate-300 text-slate-500'}`}>
                                                    {row.status}
                                                </span>
                                            </td>
                                            <td className={TD} onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-end gap-1.5">
                                                    {row.status === 'pending' && (
                                                        <>
                                                            <button onClick={() => handleApprove(row)} className={BTN_SOLID + ' px-2 py-1 text-xs'}>
                                                                Approve
                                                            </button>
                                                            <button onClick={() => setRejectModal(row)} className={BTN_DANGER}>Reject</button>
                                                        </>
                                                    )}
                                                    {adminStatus.isAdmin && (row.status === 'pending' || row.status === 'rejected') && (
                                                        <button onClick={() => setDeleteModal(row)} disabled={isDeleting} className={BTN}>
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>

                                        {isOpen && (
                                            <tr className="bg-slate-50 dark:bg-white/[0.02]">
                                                <td colSpan={COLUMNS.length + 2} className="border-t border-slate-200 px-4 py-3 dark:border-white/10">
                                                    <RequestDetail request={row} />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                            {visibleRows.length === 0 && (
                                <tr>
                                    <td colSpan={COLUMNS.length + 2} className={TD + ' py-8 text-center text-slate-500 dark:text-slate-400'}>
                                        {loading
                                            ? 'Loading...'
                                            : `No ${filter !== 'all' ? filter : ''} camp requests${search ? ' match this search' : ''}.`}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className={PANEL_FOOT}>
                    <span>Showing {visibleRows.length} of {rows.length} {rows.length === 1 ? 'request' : 'requests'}</span>
                    <span>Approving opens the registration form with these details prefilled.</span>
                </div>
            </section>

            {rejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-900">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Reject camp request</h3>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            The reason is recorded on the request and shown to whoever raised
                            "<strong className="text-slate-900 dark:text-white">{rejectModal.camp_name}</strong>".
                        </p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Why is this request being rejected?"
                            className="input-field mt-3 h-24 resize-none text-sm"
                            autoFocus
                        />
                        <div className="mt-3 flex gap-2">
                            <button
                                onClick={() => { setRejectModal(null); setRejectionReason(''); }}
                                disabled={rejecting}
                                className="btn-outline flex-1 py-2 text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleReject}
                                disabled={rejecting || !rejectionReason.trim()}
                                className={BTN_SOLID + ' flex-1 py-2'}
                            >
                                {rejecting ? 'Rejecting...' : 'Reject request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <DeleteConfirmModal
                isOpen={!!deleteModal}
                onClose={() => setDeleteModal(null)}
                onConfirm={handleDelete}
                itemName={deleteModal?.camp_name || ''}
                itemType="Camp Request"
                requireReason={true}
                isProcessing={isDeleting}
                warningMessage="This will permanently remove this camp request from the database. The action will be recorded in the audit log."
            />
        </div>
    );
}

/** The prose and lists behind a request, shown under its row when opened. */
function RequestDetail({ request }) {
    const fields = [
        ['Address', request.address],
        ['DS division', request.ds_division],
        ['Nearby landmark', request.nearby_landmark],
        ['Requester email', request.requester_email],
    ].filter(([, value]) => value);

    return (
        <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-3">
                {fields.length > 0 && (
                    <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1 text-xs">
                        {fields.map(([label, value]) => (
                            <React.Fragment key={label}>
                                <dt className="font-semibold text-slate-500 dark:text-slate-400">{label}</dt>
                                <dd className="text-slate-700 dark:text-slate-200">{value}</dd>
                            </React.Fragment>
                        ))}
                    </dl>
                )}

                {request.facilities_needed?.length > 0 && (
                    <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Facilities needed</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                            {request.facilities_needed.map((facility, index) => (
                                <span key={index} className="rounded border border-slate-300 px-1.5 py-0.5 text-xs text-slate-600 dark:border-white/15 dark:text-slate-300">
                                    {facility}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <DetailBlock label="Situation described" body={request.reason} />
                {request.special_needs && (
                    <DetailBlock label="Special needs" body={request.special_needs} tone="warn" />
                )}
                {request.additional_notes && (
                    <DetailBlock label="Additional notes" body={request.additional_notes} />
                )}
                {request.rejection_reason && (
                    <DetailBlock label="Rejection reason" body={request.rejection_reason} tone="danger" />
                )}
            </div>
        </div>
    );
}

function DetailBlock({ label, body, tone = 'neutral' }) {
    const tones = {
        neutral: 'border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200',
        warn: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200',
        danger: 'border-danger-300 bg-danger-50 text-danger-800 dark:border-danger-400/30 dark:bg-danger-500/10 dark:text-danger-200',
    };
    return (
        <div className={`rounded-md border px-3 py-2 ${tones[tone]}`}>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
            <p className="mt-0.5 whitespace-pre-line text-xs">{body || '—'}</p>
        </div>
    );
}

export default AdminReviewRequests;
