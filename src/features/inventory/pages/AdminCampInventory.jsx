import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { supabase } from '@/lib/supabase';
import {
    fetchCampInventoryLevelsAsAdmin,
    fetchInventoryTransactions,
    fetchResourceRequests,
    CATEGORY_NAMES,
    TRANSACTION_TYPES,
    STOCK_COUNT_INTERVAL_HOURS,
} from '@/features/inventory/services/inventoryService';
import { PANEL, PANEL_HEAD, TH, TD, BTN, SELECT_SM } from '@/components/ui/tableStyles';
import {
    URGENCY_STYLES, REQUEST_STATUS_STYLES,
    hoursSince, relativeTime, timestamp, formatQty, reviewState,
} from '@/features/inventory/inventoryView';
import { IconTent } from '@/components/icons/Icons';

/**
 * Admin view of one camp's inventory
 * ==================================
 * What the camp's own admin sees - the stock sheet, the requests raised off it,
 * and the audit history behind every figure - as a read-only drill-down from the
 * all-camps overview.
 *
 * Deliberately has no write controls. Only someone standing in the store can
 * honestly say what is on the shelf or what the camp needs, so counting stock
 * and raising requests stay with the camp admin; an admin reading from a
 * district office would be guessing. The edge function is scoped by role rather
 * than by screen, so this is a UI decision layered on top of a server that would
 * accept the write - the restriction is the product rule, not the security
 * boundary.
 */

const TABS = [
    { key: 'stock', label: 'Availability' },
    { key: 'requests', label: 'Requests' },
    { key: 'history', label: 'Audit history' },
];

function AdminCampInventory() {
    const { campId } = useParams();
    const { user, role, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [tab, setTab] = useState('stock');
    const [camp, setCamp] = useState(null);
    const [levels, setLevels] = useState([]);
    const [thresholds, setThresholds] = useState({});
    const [requests, setRequests] = useState([]);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [historyItem, setHistoryItem] = useState('all');
    const [historyType, setHistoryType] = useState('all');

    // A camp_admin is pinned to its own camp server-side, so reading another
    // camp's id here would silently show them their own sheet under the wrong
    // name - send them to the screen that is actually theirs.
    useEffect(() => {
        if (authLoading) return;
        if (!user) navigate('/admin/login');
        else if (role === 'camp_admin') navigate('/camp-admin/inventory', { replace: true });
    }, [user, role, authLoading, navigate]);

    const load = useCallback(async () => {
        if (!campId) return;
        setLoading(true);
        setError('');
        const [levelsResult, requestResult, historyResult, campResult] = await Promise.all([
            fetchCampInventoryLevelsAsAdmin(campId),
            fetchResourceRequests(campId),
            fetchInventoryTransactions(campId),
            supabase.from('camps').select('id, name, district').eq('id', campId).maybeSingle(),
        ]);

        if (levelsResult.success) {
            setLevels(levelsResult.levels || []);
            setThresholds(levelsResult.thresholds || {});
        } else {
            setError(levelsResult.error || 'Failed to load this camp\'s inventory');
        }
        if (requestResult.success) setRequests(requestResult.requests || []);
        if (historyResult.success) setHistory(historyResult.transactions || []);
        setCamp(campResult.data || null);
        setLoading(false);
    }, [campId]);

    useEffect(() => {
        if (user && role !== 'camp_admin') load();
    }, [user, role, load]);

    const isLowStock = (itemName, qty) => {
        const threshold = thresholds[itemName];
        return threshold != null && qty < threshold;
    };

    // Same order as the camp admin's own sheet: whatever is short first, then
    // alphabetically, so the two screens read the same way row for row.
    const sortedLevels = [...levels].sort((a, b) => {
        const aLow = isLowStock(a.item_name, a.quantity_on_hand);
        const bLow = isLowStock(b.item_name, b.quantity_on_hand);
        if (aLow !== bLow) return aLow ? -1 : 1;
        return a.item_name.localeCompare(b.item_name);
    });

    const lowCount = sortedLevels.filter(item => isLowStock(item.item_name, item.quantity_on_hand)).length;

    const overdueCount = sortedLevels.filter(
        item => hoursSince(item.last_movement_at) > STOCK_COUNT_INTERVAL_HOURS
    ).length;

    const lastCountedAt = sortedLevels.reduce((latest, item) => {
        const at = item.last_movement_at;
        return at && (!latest || new Date(at) > new Date(latest)) ? at : latest;
    }, null);

    const openRequestCount = requests.filter(r => r.status === 'open').length;

    const historyItemNames = [...new Set(history.map(row => row.item_name))]
        .sort((a, b) => a.localeCompare(b));

    const visibleHistory = history.filter(row =>
        (historyItem === 'all' || row.item_name === historyItem) &&
        (historyType === 'all' || row.transaction_type === historyType)
    );

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
                <div className="flex items-center gap-3">
                    {/* The nav bar highlights Inventory; this returns to the list
                        this camp was drilled into from. */}
                    <Link to="/admin/inventory" className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                        ← All camps
                    </Link>
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        <IconTent className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-base font-semibold text-slate-900 dark:text-white">
                            {camp?.name || (loading ? 'Loading...' : 'Camp')} Inventory
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {camp?.district ? `${camp.district} · ` : ''}Read-only
                            {lowCount > 0 && (
                                <span className="text-danger-700 dark:text-danger-300"> · {lowCount} low</span>
                            )}
                        </p>
                    </div>
                </div>
                <button onClick={load} disabled={loading} className={BTN + ' px-3 py-1.5 text-sm'}>
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
            </header>

            <nav className="flex-none border-b border-slate-200 bg-white px-4 dark:border-white/10 dark:bg-slate-950">
                <div className="mx-auto flex max-w-6xl gap-1">
                    {TABS.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                                tab === key
                                    ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                            }`}
                        >
                            {label}
                            {key === 'requests' && openRequestCount > 0 && (
                                <span className="ml-1.5 rounded bg-slate-200 px-1.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-white/15 dark:text-slate-200">
                                    {openRequestCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </nav>

            {error && (
                <div className="flex-none px-4 pt-3 sm:px-6">
                    <div className="mx-auto max-w-6xl rounded-md border border-danger-300 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-400/30 dark:bg-danger-500/10 dark:text-danger-300">
                        {error}
                    </div>
                </div>
            )}

            <main className="min-h-0 flex-1 px-4 py-3 sm:px-6 sm:py-4">
                <div className="mx-auto h-full max-w-6xl">

                    {/* ---------------- Availability ---------------- */}
                    {tab === 'stock' && (
                        <section className={PANEL}>
                            <div className={PANEL_HEAD}>
                                <div>
                                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">Stock on hand</h2>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                        Counted twice daily by the camp admin, every {STOCK_COUNT_INTERVAL_HOURS} hours.
                                        {' '}Last counted {lastCountedAt ? relativeTime(lastCountedAt).toLowerCase() : 'never'}.
                                        {overdueCount > 0 && (
                                            <span className="text-danger-700 dark:text-danger-300">
                                                {' '}{overdueCount} {overdueCount === 1 ? 'item is' : 'items are'} overdue.
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 overflow-auto">
                                <table className="w-full min-w-[42rem] text-sm">
                                    <thead className="sticky top-0 z-10">
                                        <tr>
                                            <th className={TH}>Item</th>
                                            <th className={TH}>Category</th>
                                            <th className={TH + ' text-right'}>Available</th>
                                            <th className={TH}>Unit</th>
                                            <th className={TH + ' text-right'}>Threshold</th>
                                            <th className={TH}>Last counted</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedLevels.map((item) => {
                                            const low = isLowStock(item.item_name, item.quantity_on_hand);
                                            const overdue = hoursSince(item.last_movement_at) > STOCK_COUNT_INTERVAL_HOURS;
                                            return (
                                                <tr key={`${item.item_name}-${item.category}-${item.unit}`} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                                                    <td className={TD}>
                                                        <span className="font-medium text-slate-900 dark:text-white">{item.item_name}</span>
                                                        {low && (
                                                            <span className="ml-2 rounded border border-danger-400/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-danger-700 dark:border-danger-400/30 dark:text-danger-300">
                                                                Low
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className={TD + ' text-slate-600 dark:text-slate-300'}>
                                                        {CATEGORY_NAMES[item.category] || item.category}
                                                    </td>
                                                    <td className={TD + ' text-right'}>
                                                        <span className={`font-semibold tabular-nums ${low ? 'text-danger-700 dark:text-danger-300' : 'text-slate-900 dark:text-white'}`}>
                                                            {formatQty(item.quantity_on_hand)}
                                                        </span>
                                                    </td>
                                                    <td className={TD + ' text-slate-500 dark:text-slate-400'}>{item.unit}</td>
                                                    <td className={TD + ' text-right tabular-nums text-slate-500 dark:text-slate-400'}>
                                                        {thresholds[item.item_name] ?? '—'}
                                                    </td>
                                                    <td className={TD}>
                                                        <span className={overdue ? 'text-danger-700 dark:text-danger-300' : 'text-slate-500 dark:text-slate-400'}>
                                                            {relativeTime(item.last_movement_at)}
                                                        </span>
                                                        {overdue && (
                                                            <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-danger-700 dark:text-danger-300">
                                                                Due
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {sortedLevels.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className={TD + ' text-center text-slate-500 dark:text-slate-400'}>
                                                    {loading ? 'Loading...' : 'This camp is not tracking any items yet.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* ---------------- Requests ---------------- */}
                    {tab === 'requests' && (
                        <section className={PANEL}>
                            <div className={PANEL_HEAD}>
                                <div>
                                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">Supply requests</h2>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                        What this camp has asked for, and what coordinators did about it.
                                        Only the camp's own admin can raise or withdraw a request.
                                    </p>
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 overflow-auto">
                                <table className="w-full min-w-[56rem] text-sm">
                                    <thead className="sticky top-0 z-10">
                                        <tr>
                                            <th className={TH}>Raised</th>
                                            <th className={TH}>Item</th>
                                            <th className={TH + ' text-right'}>Asked for</th>
                                            <th className={TH}>Urgency</th>
                                            <th className={TH}>Status</th>
                                            <th className={TH}>Coordinator response</th>
                                            <th className={TH}>Camp remark</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {requests.map((request) => {
                                            const review = reviewState(request);
                                            const fulfilled = Number(request.quantity_fulfilled);
                                            return (
                                                <tr key={request.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                                                    <td className={TD + ' whitespace-nowrap text-slate-500 dark:text-slate-400'}>
                                                        {timestamp(request.created_at)}
                                                    </td>
                                                    <td className={TD + ' font-medium text-slate-900 dark:text-white'}>{request.item_name}</td>
                                                    <td className={TD + ' text-right tabular-nums text-slate-700 dark:text-slate-200'}>
                                                        {formatQty(request.quantity_requested)} {request.unit}
                                                    </td>
                                                    <td className={TD}>
                                                        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${URGENCY_STYLES[request.urgency]}`}>
                                                            {request.urgency}
                                                        </span>
                                                    </td>
                                                    <td className={TD}>
                                                        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${REQUEST_STATUS_STYLES[request.status]}`}>
                                                            {request.status}
                                                        </span>
                                                        <div className="mt-1 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                                                            {formatQty(fulfilled)} of {formatQty(request.quantity_requested)} received
                                                        </div>
                                                    </td>
                                                    <td className={TD + ' text-slate-600 dark:text-slate-300'}>
                                                        {review.label}
                                                        {review.detail && (
                                                            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{review.detail}</div>
                                                        )}
                                                    </td>
                                                    <td className={TD + ' text-slate-600 dark:text-slate-300'}>{request.notes || '—'}</td>
                                                </tr>
                                            );
                                        })}
                                        {requests.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className={TD + ' text-center text-slate-500 dark:text-slate-400'}>
                                                    {loading ? 'Loading...' : 'This camp has not raised any requests.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* ---------------- Audit history ---------------- */}
                    {tab === 'history' && (
                        <section className={PANEL}>
                            <div className={PANEL_HEAD}>
                                <div>
                                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">Movement history</h2>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                        Every change to this camp's stock table, with the remark recorded at the
                                        time. Entries are never edited or removed.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <select value={historyItem} onChange={(e) => setHistoryItem(e.target.value)} className={SELECT_SM}>
                                        <option value="all">All items</option>
                                        {historyItemNames.map(name => <option key={name} value={name}>{name}</option>)}
                                    </select>
                                    <select value={historyType} onChange={(e) => setHistoryType(e.target.value)} className={SELECT_SM}>
                                        <option value="all">All entries</option>
                                        {Object.entries(TRANSACTION_TYPES).map(([key, meta]) => (
                                            <option key={key} value={key}>{meta.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 overflow-auto">
                                <table className="w-full min-w-[48rem] text-sm">
                                    <thead className="sticky top-0 z-10">
                                        <tr>
                                            <th className={TH}>When</th>
                                            <th className={TH}>Item</th>
                                            <th className={TH}>Entry</th>
                                            <th className={TH + ' text-right'}>Change</th>
                                            <th className={TH}>By</th>
                                            <th className={TH}>Remark</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleHistory.map((row) => {
                                            const meta = TRANSACTION_TYPES[row.transaction_type] || { label: row.transaction_type, sign: 1 };
                                            const change = meta.sign * Number(row.quantity);
                                            return (
                                                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                                                    <td className={TD + ' whitespace-nowrap text-slate-500 dark:text-slate-400'}>{timestamp(row.recorded_at)}</td>
                                                    <td className={TD + ' text-slate-900 dark:text-white'}>{row.item_name}</td>
                                                    <td className={TD + ' text-slate-600 dark:text-slate-300'}>{meta.label}</td>
                                                    <td className={TD + ' text-right tabular-nums'}>
                                                        {change === 0 ? (
                                                            <span className="text-slate-400 dark:text-slate-500">no change</span>
                                                        ) : (
                                                            <span className={change > 0 ? 'text-slate-900 dark:text-white' : 'text-danger-700 dark:text-danger-300'}>
                                                                {change > 0 ? '+' : '−'}{formatQty(Math.abs(change))} {row.unit}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className={TD + ' text-slate-500 dark:text-slate-400'}>{row.recorded_by_name || '—'}</td>
                                                    <td className={TD + ' text-slate-600 dark:text-slate-300'}>{row.notes || '—'}</td>
                                                </tr>
                                            );
                                        })}
                                        {visibleHistory.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className={TD + ' text-center text-slate-500 dark:text-slate-400'}>
                                                    {loading ? 'Loading...' : 'No entries to show.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </div>
            </main>
        </div>
    );
}

export default AdminCampInventory;
