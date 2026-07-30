import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { supabase } from '@/lib/supabase';
import { checkIsAdmin } from '@/features/admin/services/adminService';
import {
    PANEL, PANEL_HEAD, PANEL_FOOT, TH, TD, BTN, BTN_SOLID, BTN_DANGER, INPUT_SM,
    PILL, chip, sortRows, nextSort,
} from '@/components/ui/tableStyles';
import SortHeader from '@/components/ui/SortHeader';
import { IconSearch } from '@/components/icons/Icons';

/**
 * Admin Manage Camps
 * ==================
 * Every registered camp on one sheet. Admins can edit a camp and mark it closed;
 * nothing here deletes, because a camp that sheltered people stays on the record
 * even after it shuts - closing is a status, not a removal.
 *
 * A table rather than a page of cards: an operator is comparing camps against
 * each other - which are full, which have no contact number, which closed - and
 * that is a column-by-column read, not a card-by-card one.
 */

const STATUS_FILTERS = ['all', 'active', 'inactive', 'closed'];

const COLUMNS = [
    { key: 'name', label: 'Camp' },
    { key: 'district', label: 'District' },
    { key: 'status', label: 'Status' },
    { key: 'occupancyRatio', label: 'Occupancy', className: 'text-right', numeric: true },
    { key: 'contact', label: 'Contact' },
    { key: 'createdMs', label: 'Registered', numeric: true },
];

const STATUS_STYLES = {
    active: 'border-success-500/60 text-success-700 dark:border-success-400/30 dark:text-success-300',
    approved: 'border-success-500/60 text-success-700 dark:border-success-400/30 dark:text-success-300',
    inactive: 'border-slate-300 text-slate-500 dark:border-white/15 dark:text-slate-400',
    closed: 'border-danger-400/60 text-danger-700 dark:border-danger-400/30 dark:text-danger-300',
};

const shortDate = (iso) => (iso
    ? new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    : '—');

function AdminManageCamps() {
    const { user } = useAuth();
    const [camps, setCamps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState({ key: 'name', dir: 'asc' });

    const [adminStatus, setAdminStatus] = useState({ isAdmin: false, role: null });
    const [closeTarget, setCloseTarget] = useState(null);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (user) checkIsAdmin().then(setAdminStatus);
    }, [user]);

    // Every camp is fetched once and filtered on the client: the status counts in
    // the header have to be totals, and re-querying per filter would make them
    // count only whatever is on screen.
    const loadCamps = useCallback(async () => {
        setLoading(true);
        setError('');
        const { data, error: fetchError } = await supabase
            .from('camps')
            .select('id, name, type, district, address, status, capacity, current_occupancy, contact_person, contact_number, created_at')
            .order('created_at', { ascending: false });
        if (fetchError) setError(fetchError.message || 'Failed to load camps');
        setCamps(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { if (user) loadCamps(); }, [user, loadCamps]);

    const handleCloseCamp = async () => {
        if (!closeTarget) return;
        setIsClosing(true);
        const { error: updateError } = await supabase
            .from('camps')
            .update({ status: 'Closed', updated_at: new Date().toISOString() })
            .eq('id', closeTarget.id);
        setIsClosing(false);
        if (updateError) {
            setError(`Failed to close ${closeTarget.name}: ${updateError.message}`);
            return;
        }
        setCloseTarget(null);
        loadCamps();
    };

    const rows = useMemo(() => camps.map(camp => {
        const capacity = Number(camp.capacity) || 0;
        const occupancy = Number(camp.current_occupancy) || 0;
        return {
            ...camp,
            name: camp.name || '(unnamed camp)',
            statusKey: (camp.status || '').toLowerCase(),
            capacity,
            occupancy,
            // Sorting on how full a camp is, not on how big it is - a camp with no
            // capacity recorded can't be ranked, so it sorts to the end.
            occupancyRatio: capacity > 0 ? occupancy / capacity : null,
            contact: camp.contact_person || camp.contact_number || '',
            createdMs: camp.created_at ? new Date(camp.created_at).getTime() : null,
        };
    }), [camps]);

    const counts = useMemo(() => ({
        all: rows.length,
        active: rows.filter(r => r.statusKey === 'active' || r.statusKey === 'approved').length,
        inactive: rows.filter(r => r.statusKey === 'inactive').length,
        closed: rows.filter(r => r.statusKey === 'closed').length,
    }), [rows]);

    const visibleRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        const filtered = rows.filter(row => {
            if (filter === 'active' && !(row.statusKey === 'active' || row.statusKey === 'approved')) return false;
            if (filter !== 'all' && filter !== 'active' && row.statusKey !== filter) return false;
            if (term && !`${row.name} ${row.district} ${row.address} ${row.contact}`.toLowerCase().includes(term)) return false;
            return true;
        });
        return sortRows(filtered, sort, 'name');
    }, [rows, filter, search, sort]);

    const toggleSort = (key, numeric) => setSort(prev => nextSort(prev, key, numeric));

    return (
        <div className="flex h-full flex-col px-4 py-3 sm:px-6">
            {error && (
                <div className="mb-2 flex-none rounded-md border border-danger-300 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-400/30 dark:bg-danger-500/10 dark:text-danger-300">
                    {error}
                </div>
            )}

            {/* flex-1 rather than the panel's own h-full: a notice above it has to
                take its height out of the table, not push the table off-screen. */}
            <section className={PANEL + ' min-h-0 flex-1'}>
                <div className={PANEL_HEAD}>
                    <div className="flex flex-wrap items-center gap-1.5">
                        {STATUS_FILTERS.map(status => (
                            <button key={status} onClick={() => setFilter(status)} className={chip(filter === status)}>
                                {status} ({counts[status]})
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
                                placeholder="Search name, district, contact"
                                className={INPUT_SM + ' w-52 pl-7'}
                            />
                        </div>
                        <button onClick={loadCamps} disabled={loading} className={BTN}>
                            {loading ? 'Loading...' : 'Refresh'}
                        </button>
                        <Link to="/admin/register-camp" className={BTN_SOLID}>Register camp</Link>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-auto">
                    <table className="w-full min-w-[56rem] text-sm">
                        <thead className="sticky top-0 z-10">
                            <tr>
                                {COLUMNS.map(column => (
                                    <SortHeader key={column.key} column={column} sort={sort} onSort={toggleSort} />
                                ))}
                                <th scope="col" className={TH + ' text-right'}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRows.map(row => (
                                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                                    <td className={TD}>
                                        <Link to={`/camps/${row.id}`} className="font-medium text-slate-900 hover:underline dark:text-white">
                                            {row.name}
                                        </Link>
                                        {row.type && (
                                            <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">{row.type}</span>
                                        )}
                                        {row.address && (
                                            <div className="max-w-[22rem] truncate text-xs text-slate-500 dark:text-slate-400" title={row.address}>
                                                {row.address}
                                            </div>
                                        )}
                                    </td>
                                    <td className={TD + ' text-slate-600 dark:text-slate-300'}>{row.district || '—'}</td>
                                    <td className={TD}>
                                        <span className={`${PILL} ${STATUS_STYLES[row.statusKey] || 'border-slate-300 text-slate-500 dark:border-white/15 dark:text-slate-400'}`}>
                                            {row.status || 'unknown'}
                                        </span>
                                    </td>
                                    <td className={TD + ' text-right'}>
                                        <span className="tabular-nums text-slate-700 dark:text-slate-200">
                                            {row.occupancy}{row.capacity > 0 ? ` / ${row.capacity}` : ''}
                                        </span>
                                        {row.occupancyRatio == null ? (
                                            <div className="text-xs text-slate-400 dark:text-slate-500">no capacity set</div>
                                        ) : (
                                            <div className={`text-xs tabular-nums ${row.occupancyRatio >= 1
                                                ? 'text-danger-700 dark:text-danger-300'
                                                : 'text-slate-400 dark:text-slate-500'}`}>
                                                {Math.round(row.occupancyRatio * 100)}% full
                                            </div>
                                        )}
                                    </td>
                                    <td className={TD + ' text-slate-600 dark:text-slate-300'}>
                                        {row.contact_person || '—'}
                                        {row.contact_number && (
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{row.contact_number}</div>
                                        )}
                                    </td>
                                    <td className={TD + ' whitespace-nowrap text-slate-500 dark:text-slate-400'}>
                                        {shortDate(row.created_at)}
                                    </td>
                                    <td className={TD}>
                                        <div className="flex justify-end gap-1.5">
                                            <Link to={`/admin/inventory/${row.id}`} className={BTN} title="Stock and movement history">
                                                Stock
                                            </Link>
                                            {adminStatus.isAdmin && (
                                                <Link to={`/admin/edit-camp/${row.id}`} className={BTN}>Edit</Link>
                                            )}
                                            {adminStatus.isAdmin && row.statusKey !== 'closed' && (
                                                <button onClick={() => setCloseTarget(row)} className={BTN_DANGER}>Close</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {visibleRows.length === 0 && (
                                <tr>
                                    <td colSpan={COLUMNS.length + 1} className={TD + ' py-8 text-center text-slate-500 dark:text-slate-400'}>
                                        {loading
                                            ? 'Loading...'
                                            : rows.length === 0
                                                ? 'No camps registered yet.'
                                                : 'No camps match these filters.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className={PANEL_FOOT}>
                    <span>
                        Showing {visibleRows.length} of {rows.length} {rows.length === 1 ? 'camp' : 'camps'}
                    </span>
                    <span>Camps are closed, never deleted - the record is kept for historical tracking.</span>
                </div>
            </section>

            {closeTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-900">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">Mark camp as closed</h3>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                            Close <strong className="text-slate-900 dark:text-white">{closeTarget.name}</strong>?
                            It stops appearing as an open camp, and its records stay for historical tracking.
                        </p>
                        <div className="mt-4 flex gap-2">
                            <button
                                onClick={() => setCloseTarget(null)}
                                disabled={isClosing}
                                className="btn-outline flex-1 py-2 text-sm"
                            >
                                Cancel
                            </button>
                            <button onClick={handleCloseCamp} disabled={isClosing} className={BTN_SOLID + ' flex-1 py-2'}>
                                {isClosing ? 'Closing...' : 'Mark as closed'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminManageCamps;
