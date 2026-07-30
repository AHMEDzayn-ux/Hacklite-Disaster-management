import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { fetchAllInventoryLevels, STOCK_COUNT_INTERVAL_HOURS } from '@/features/inventory/services/inventoryService';
import { PANEL, PANEL_HEAD, TH, TD, BTN, SELECT_SM, INPUT_SM, sortRows, nextSort } from '@/components/ui/tableStyles';
import SortHeader from '@/components/ui/SortHeader';
import { hoursSince, relativeTime } from '@/features/inventory/inventoryView';
import { supabase } from '@/lib/supabase';
import { PROVINCES, UNKNOWN_PROVINCE, resolveDistrict, resolveProvince } from '@/data/sriLankaRegions';
import { IconChevronRight } from '@/components/icons/Icons';

/**
 * Admin Inventory Overview
 * ========================
 * Every camp on one flat, sortable sheet - one row per camp, holding the figures
 * an admin triages on: how much it tracks, how much of that is short, and when
 * it was last counted. Province and district are columns rather than a nested
 * tree, so the whole country is scannable and sortable in a single pass instead
 * of behind a dozen disclosure arrows.
 *
 * A row opens that camp's own inventory screen (read-only). Adding stock and
 * raising requests stay with the camp admin who can actually see the store, so
 * nothing here writes.
 */

const COLUMNS = [
    { key: 'name', label: 'Camp' },
    { key: 'district', label: 'District' },
    { key: 'province', label: 'Province' },
    { key: 'itemCount', label: 'Items', className: 'text-right', numeric: true },
    { key: 'lowCount', label: 'Low stock', className: 'text-right', numeric: true },
    { key: 'lastCountedMs', label: 'Last counted', numeric: true },
];

function AdminInventoryOverview() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [levels, setLevels] = useState([]);
    const [camps, setCamps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [province, setProvince] = useState('all');
    const [lowOnly, setLowOnly] = useState(false);
    // Shortages first by default - that is what an admin opens this page for.
    const [sort, setSort] = useState({ key: 'lowCount', dir: 'desc' });

    useEffect(() => {
        if (!authLoading && !user) navigate('/admin/login');
    }, [user, authLoading, navigate]);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        const [levelsResult, campsResult] = await Promise.all([
            fetchAllInventoryLevels(),
            supabase.from('camps').select('id, name, district, inventory_thresholds'),
        ]);
        if (levelsResult.success) setLevels(levelsResult.levels || []);
        else setError(levelsResult.error || 'Failed to load inventory');
        setCamps(campsResult.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { if (user) load(); }, [user, load]);

    /**
     * One row per camp, whether or not it holds stock: a camp tracking nothing
     * is a coverage gap worth seeing, not a row to drop.
     */
    const rows = useMemo(() => {
        const byCamp = new Map();
        for (const level of levels) {
            if (!byCamp.has(level.camp_id)) byCamp.set(level.camp_id, []);
            byCamp.get(level.camp_id).push(level);
        }

        return camps.map(camp => {
            const items = byCamp.get(camp.id) || [];
            const thresholds = camp.inventory_thresholds || {};

            let lowCount = 0;
            let overdueCount = 0;
            let lastCountedAt = null;
            for (const item of items) {
                const threshold = thresholds[item.item_name];
                if (threshold != null && Number(item.quantity_on_hand) < threshold) lowCount++;
                if (hoursSince(item.last_movement_at) > STOCK_COUNT_INTERVAL_HOURS) overdueCount++;
                if (item.last_movement_at && (!lastCountedAt || new Date(item.last_movement_at) > new Date(lastCountedAt))) {
                    lastCountedAt = item.last_movement_at;
                }
            }

            return {
                id: camp.id,
                name: camp.name || camp.id.slice(0, 8),
                // Show the camp's own spelling when it doesn't match a known
                // district - silently canonicalising it would hide bad data.
                district: resolveDistrict(camp.district) || camp.district || '—',
                province: resolveProvince(camp.district),
                itemCount: items.length,
                lowCount,
                overdueCount,
                lastCountedAt,
                // Sorting compares numbers, not date strings.
                lastCountedMs: lastCountedAt ? new Date(lastCountedAt).getTime() : null,
            };
        });
    }, [levels, camps]);

    const visibleRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        const filtered = rows.filter(row => {
            if (lowOnly && row.lowCount === 0) return false;
            if (province !== 'all' && row.province !== province) return false;
            if (term && !`${row.name} ${row.district}`.toLowerCase().includes(term)) return false;
            return true;
        });
        return sortRows(filtered, sort, 'name');
    }, [rows, search, province, lowOnly, sort]);

    const toggleSort = (key, numeric) => setSort(prev => nextSort(prev, key, numeric));

    const totals = useMemo(() => ({
        camps: rows.length,
        stocked: rows.filter(r => r.itemCount > 0).length,
        low: rows.reduce((n, r) => n + r.lowCount, 0),
        campsLow: rows.filter(r => r.lowCount > 0).length,
        overdue: rows.filter(r => r.overdueCount > 0).length,
    }), [rows]);

    if (authLoading || !user) {
        return (
            <div className="page-shell flex items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-400 border-t-transparent"></div>
            </div>
        );
    }

    return (
        // 3rem is the admin nav bar (h-12); the sheet scrolls inside what's left.
        <div className="page-shell flex h-[calc(100dvh-3rem)] flex-col overflow-hidden">
            <header className="flex flex-none items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2 dark:border-white/10 dark:bg-slate-950">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    {totals.camps} {totals.camps === 1 ? 'camp' : 'camps'} · {levels.length} tracked items
                    {totals.low > 0 && (
                        <span className="text-danger-700 dark:text-danger-300">
                            {' · '}{totals.low} low across {totals.campsLow} {totals.campsLow === 1 ? 'camp' : 'camps'}
                        </span>
                    )}
                    {totals.overdue > 0 && ` · ${totals.overdue} overdue a count`}
                </p>
                <button onClick={load} disabled={loading} className={BTN + ' px-3 py-1.5 text-sm'}>
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
            </header>

            {error && (
                <div className="flex-none px-4 pt-3 sm:px-6">
                    <div className="mx-auto max-w-6xl rounded-md border border-danger-300 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-400/30 dark:bg-danger-500/10 dark:text-danger-300">
                        {error}
                    </div>
                </div>
            )}

            <main className="min-h-0 flex-1 px-4 py-3 sm:px-6 sm:py-4">
                <div className="mx-auto h-full max-w-6xl">
                    <section className={PANEL}>
                        <div className={PANEL_HEAD}>
                            <div>
                                <h2 className="text-base font-semibold text-slate-900 dark:text-white">All camps</h2>
                                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                    Open a camp to read its stock sheet and movement history.
                                    Stock entry and requests belong to that camp's admin.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search camp or district"
                                    className={INPUT_SM + ' w-44'}
                                />
                                <select value={province} onChange={(e) => setProvince(e.target.value)} className={SELECT_SM}>
                                    <option value="all">All provinces</option>
                                    {PROVINCES.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                                    <option value={UNKNOWN_PROVINCE}>{UNKNOWN_PROVINCE}</option>
                                </select>
                                <button
                                    onClick={() => setLowOnly(v => !v)}
                                    aria-pressed={lowOnly}
                                    className={lowOnly
                                        ? 'rounded-md border border-danger-400/70 bg-danger-50 px-2 py-1 text-xs font-semibold text-danger-700 dark:border-danger-400/40 dark:bg-danger-500/10 dark:text-danger-300'
                                        : BTN}
                                >
                                    Low stock only ({totals.campsLow})
                                </button>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-auto">
                            <table className="w-full min-w-[52rem] text-sm">
                                <thead className="sticky top-0 z-10">
                                    <tr>
                                        {COLUMNS.map(column => (
                                            <SortHeader key={column.key} column={column} sort={sort} onSort={toggleSort} />
                                        ))}
                                        <th className={TH + ' w-8'}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleRows.map(row => {
                                        const empty = row.itemCount === 0;
                                        return (
                                            <tr
                                                key={row.id}
                                                onClick={() => navigate(`/admin/inventory/${row.id}`)}
                                                className="cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                                            >
                                                <td className={TD}>
                                                    <Link
                                                        to={`/admin/inventory/${row.id}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="font-medium text-slate-900 hover:underline dark:text-white"
                                                    >
                                                        {row.name}
                                                    </Link>
                                                </td>
                                                <td className={TD + ' text-slate-600 dark:text-slate-300'}>{row.district}</td>
                                                <td className={TD + ' text-slate-500 dark:text-slate-400'}>{row.province}</td>
                                                <td className={TD + ' text-right tabular-nums ' + (empty ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200')}>
                                                    {row.itemCount}
                                                </td>
                                                <td className={TD + ' text-right'}>
                                                    {row.lowCount > 0 ? (
                                                        <span className="rounded border border-danger-400/60 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-danger-700 dark:border-danger-400/30 dark:text-danger-300">
                                                            {row.lowCount}
                                                        </span>
                                                    ) : (
                                                        <span className="tabular-nums text-slate-400 dark:text-slate-500">0</span>
                                                    )}
                                                </td>
                                                <td className={TD}>
                                                    <span className={row.overdueCount > 0 ? 'text-danger-700 dark:text-danger-300' : 'text-slate-500 dark:text-slate-400'}>
                                                        {empty ? 'Nothing tracked' : relativeTime(row.lastCountedAt)}
                                                    </span>
                                                    {row.overdueCount > 0 && (
                                                        <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-danger-700 dark:text-danger-300">
                                                            {row.overdueCount} due
                                                        </span>
                                                    )}
                                                </td>
                                                <td className={TD + ' text-right'}>
                                                    <IconChevronRight className="ml-auto h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {visibleRows.length === 0 && (
                                        <tr>
                                            <td colSpan={COLUMNS.length + 1} className={TD + ' text-center text-slate-500 dark:text-slate-400'}>
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
                    </section>
                </div>
            </main>
        </div>
    );
}

export default AdminInventoryOverview;
