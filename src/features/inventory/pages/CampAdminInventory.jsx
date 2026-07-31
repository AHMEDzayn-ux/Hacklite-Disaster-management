import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { supabase } from '@/lib/supabase';
import {
    fetchAllInventoryLevels,
    fetchInventoryTransactions,
    saveInventoryCount,
    recordInventoryTransactionAsAdmin,
    createResourceRequest,
    fetchResourceRequests,
    cancelResourceRequest,
    fetchResourceItems,
    REQUEST_URGENCY_LEVELS,
    CATEGORY_NAMES,
    TRANSACTION_TYPES,
    STOCK_COUNT_INTERVAL_HOURS,
} from '@/features/inventory/services/inventoryService';
import {
    PANEL, PANEL_HEAD, TH, TD, CELL_INPUT, BTN, BTN_SOLID, SELECT_SM,
} from '@/components/ui/tableStyles';
import {
    URGENCY_STYLES, REQUEST_STATUS_STYLES,
    hoursSince, relativeTime, timestamp, formatQty, reviewState,
} from '@/features/inventory/inventoryView';
import ItemSelect from '@/features/inventory/components/ItemSelect';
import { IconTent } from '@/components/icons/Icons';

/**
 * Camp Admin Inventory
 * ====================
 * The camp_admin's working screen for their one camp, as three views over the
 * same ledger: the stock sheet, the requests raised off it, and the history
 * behind every figure. A camp_admin is hard-scoped server-side, so the edge
 * function returns (and accepts) only this camp's data regardless of what the
 * client sends - the campId here is used just for display and to pass along.
 *
 * The page is sized to the viewport and each table scrolls inside its own
 * panel, so the header, the tabs and the entry controls never scroll away from
 * someone working down a long stock sheet.
 *
 * Stock is meant to be counted twice a day, so every row shows when it was last
 * counted and rows past the interval are flagged. Saving the sheet never edits
 * a past row - the ledger is append-only, which is what makes the history tab a
 * complete account of how each figure was reached, remarks included.
 *
 * Requests raised here are the only demand signal the Resource Allocation
 * Engine considers, so this screen is what drives the shipment suggestions an
 * admin sees on the command dashboard.
 */

const TABS = [
    { key: 'stock', label: 'Stock' },
    { key: 'requests', label: 'Requests' },
    { key: 'history', label: 'History' },
];

function CampAdminInventory() {
    const { user, role, campId, loading: authLoading, signOut } = useAuth();
    const navigate = useNavigate();

    const [tab, setTab] = useState('stock');
    const [campName, setCampName] = useState('');
    const [levels, setLevels] = useState([]);
    const [thresholds, setThresholds] = useState({});
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    // Stock-sheet edit mode. `draft` holds the counted figure per item_id as
    // typed, so an in-progress edit is never coerced or rounded mid-keystroke.
    // `newRows` are items the camp isn't tracking yet, added with the + button.
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState({});
    const [newRows, setNewRows] = useState([]);
    const [countNote, setCountNote] = useState('');
    const [savingCount, setSavingCount] = useState(false);

    const [actionItem, setActionItem] = useState(null); // { itemId, itemName, unit, mode }
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [catalog, setCatalog] = useState([]);
    const [requests, setRequests] = useState([]);
    const [reqForm, setReqForm] = useState({ itemId: '', quantity: '', urgency: 'normal', notes: '' });
    const [reqSubmitting, setReqSubmitting] = useState(false);

    const [historyItem, setHistoryItem] = useState('all');
    const [historyType, setHistoryType] = useState('all');

    // Only camp_admins belong here.
    useEffect(() => {
        if (authLoading) return;
        if (!user) navigate('/admin/login');
        else if (role && role !== 'camp_admin') navigate('/admin/dashboard');
    }, [user, role, authLoading, navigate]);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        const [result, requestResult, catalogResult, historyResult] = await Promise.all([
            fetchAllInventoryLevels(),
            fetchResourceRequests(),
            fetchResourceItems(),
            fetchInventoryTransactions(),
        ]);
        if (result.success) {
            setLevels(result.levels || []);
            setThresholds(result.thresholds || {});
        } else {
            setError(result.error || 'Failed to load inventory');
        }
        if (requestResult.success) setRequests(requestResult.requests || []);
        if (catalogResult.success) setCatalog(catalogResult.items || []);
        if (historyResult.success) setHistory(historyResult.transactions || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (user && role === 'camp_admin') load();
    }, [user, role, load]);

    useEffect(() => {
        if (!campId) return;
        supabase.from('camps').select('name').eq('id', campId).single()
            .then(({ data }) => setCampName(data?.name || 'Your Camp'));
    }, [campId]);

    const isLowStock = (itemName, qty) => {
        const t = thresholds[itemName];
        return t != null && qty < t;
    };

    // Whatever is short comes first - that is what a camp admin acts on - then
    // alphabetically so a row keeps its place between counts.
    const sortedLevels = [...levels].sort((a, b) => {
        const aLow = isLowStock(a.item_name, a.quantity_on_hand);
        const bLow = isLowStock(b.item_name, b.quantity_on_hand);
        if (aLow !== bLow) return aLow ? -1 : 1;
        return a.item_name.localeCompare(b.item_name);
    });

    const overdueCount = sortedLevels.filter(
        item => hoursSince(item.last_movement_at) > STOCK_COUNT_INTERVAL_HOURS
    ).length;

    const lastCountedAt = sortedLevels.reduce((latest, item) => {
        const at = item.last_movement_at;
        return at && (!latest || new Date(at) > new Date(latest)) ? at : latest;
    }, null);

    // ----- Stock sheet editing -------------------------------------------

    const startEditing = () => {
        setDraft(Object.fromEntries(
            sortedLevels
                .filter(item => item.item_id)
                .map(item => [item.item_id, formatQty(item.quantity_on_hand)])
        ));
        setNewRows([]);
        setCountNote('');
        setError('');
        setNotice('');
        setEditing(true);
    };

    const cancelEditing = () => {
        setEditing(false);
        setDraft({});
        setNewRows([]);
        setCountNote('');
    };

    // The + button. Outside edit mode it opens the sheet for editing first, so
    // one click is enough to start typing a row that isn't tracked yet.
    const addRow = () => {
        if (!editing) startEditing();
        setNewRows(rows => [...rows, { key: `row-${Date.now()}-${rows.length}`, itemId: '', quantity: '' }]);
    };

    const updateNewRow = (key, patch) =>
        setNewRows(rows => rows.map(row => (row.key === key ? { ...row, ...patch } : row)));

    const removeNewRow = (key) => setNewRows(rows => rows.filter(row => row.key !== key));

    // A new row may only pick an item the sheet doesn't already hold, and not
    // one another new row has taken - the same item twice in one count has no
    // single correct answer, and the server rejects it outright.
    const trackedItemIds = new Set(levels.map(l => l.item_id).filter(Boolean));
    const catalogFor = (rowKey) => {
        const takenElsewhere = new Set(
            newRows.filter(row => row.key !== rowKey && row.itemId).map(row => row.itemId)
        );
        return catalog.filter(item => !trackedItemIds.has(item.id) && !takenElsewhere.has(item.id));
    };

    const changedRows = sortedLevels.filter(item => {
        const typed = draft[item.item_id];
        if (typed === undefined || typed === '') return false;
        return Number(typed) !== Number(item.quantity_on_hand);
    });
    const pendingNewRows = newRows.filter(row => row.itemId || row.quantity !== '');
    const changeCount = changedRows.length + pendingNewRows.length;

    const saveCount = async () => {
        const blank = sortedLevels.find(item => item.item_id && (draft[item.item_id] === undefined || draft[item.item_id] === ''));
        if (blank) {
            setError(`Enter a counted figure for ${blank.item_name} (use 0 if there is none left).`);
            return;
        }
        if (Object.values(draft).some(value => !Number.isFinite(Number(value)) || Number(value) < 0)) {
            setError('Counted figures must be zero or more.');
            return;
        }
        const incomplete = pendingNewRows.find(row => !row.itemId || row.quantity === '' || !Number.isFinite(Number(row.quantity)) || Number(row.quantity) < 0);
        if (incomplete) {
            setError('Every new row needs an item and a quantity of zero or more.');
            return;
        }

        setSavingCount(true);
        setError('');
        const counts = [
            ...sortedLevels
                .filter(item => item.item_id)
                .map(item => ({ itemId: item.item_id, unit: item.unit, quantity: Number(draft[item.item_id]) })),
            ...pendingNewRows.map(row => ({ itemId: row.itemId, quantity: Number(row.quantity) })),
        ];

        const result = await saveInventoryCount(campId, counts, countNote);
        setSavingCount(false);
        if (result.success) {
            setEditing(false);
            setDraft({});
            setNewRows([]);
            setCountNote('');
            setNotice(
                result.corrected > 0
                    ? `Count saved - ${result.corrected} of ${result.counted} figures changed.`
                    : `Count saved - all ${result.counted} figures confirmed unchanged.`
            );
            load();
        } else {
            setError(result.error || 'Failed to save the stock count');
        }
    };

    // ----- Movements ------------------------------------------------------

    const openAction = (item, mode) => {
        setActionItem({ itemId: item.item_id, itemName: item.item_name, unit: item.unit, mode });
        setQuantity('');
        setNotes('');
        setError('');
    };

    const submitAction = async (e) => {
        e.preventDefault();
        if (!actionItem || !quantity || Number(quantity) <= 0) return;
        setSubmitting(true);
        setError('');
        const result = await recordInventoryTransactionAsAdmin(campId, {
            itemId: actionItem.itemId,
            itemName: actionItem.itemName,
            unit: actionItem.unit,
            transactionType: actionItem.mode,
            quantity: Number(quantity),
            notes: notes || null,
        });
        setSubmitting(false);
        if (result.success) {
            setActionItem(null);
            load();
        } else {
            setError(result.error || 'Failed to record movement');
        }
    };

    // ----- Requests -------------------------------------------------------

    const requestItem = (item) => {
        setReqForm({
            itemId: item.item_id || '',
            quantity: '',
            urgency: isLowStock(item.item_name, item.quantity_on_hand) ? 'high' : 'normal',
            notes: '',
        });
        setError('');
        setTab('requests');
    };

    const submitRequest = async (e) => {
        e.preventDefault();
        if (!reqForm.itemId || !reqForm.quantity || Number(reqForm.quantity) <= 0) return;
        setReqSubmitting(true);
        setError('');
        const result = await createResourceRequest({
            campId,
            itemId: reqForm.itemId,
            quantity: Number(reqForm.quantity),
            urgency: reqForm.urgency,
            notes: reqForm.notes || null,
        });
        setReqSubmitting(false);
        if (result.success) {
            setReqForm({ itemId: '', quantity: '', urgency: 'normal', notes: '' });
            load();
        } else {
            setError(result.error || 'Failed to raise request');
        }
    };

    const cancelRequest = async (requestId) => {
        const result = await cancelResourceRequest(requestId);
        if (result.success) load();
        else setError(result.error || 'Failed to cancel request');
    };

    const openRequestCount = requests.filter(r => r.status === 'open').length;

    // ----- History --------------------------------------------------------

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
        <div className="page-shell flex h-dvh flex-col overflow-hidden">
            <header className="flex flex-none items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-slate-950">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        <IconTent className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-base font-semibold text-slate-900 dark:text-white">{campName} Inventory</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Camp Admin</p>
                    </div>
                </div>
                <button onClick={() => { signOut(); navigate('/'); }} className="text-xs text-slate-500 underline transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                    Sign out
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

            {(error || notice) && (
                <div className="flex-none px-4 pt-3 sm:px-6">
                    <div className="mx-auto max-w-6xl">
                        {error && (
                            <div className="rounded-md border border-danger-300 bg-danger-50 px-3 py-2 text-sm text-danger-700 dark:border-danger-400/30 dark:bg-danger-500/10 dark:text-danger-300">
                                {error}
                            </div>
                        )}
                        {notice && !error && (
                            <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200">
                                {notice}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <main className="min-h-0 flex-1 px-4 py-3 sm:px-6 sm:py-4">
                <div className="mx-auto h-full max-w-6xl">

                    {/* ---------------- Stock ---------------- */}
                    {tab === 'stock' && (
                        <section className={PANEL}>
                            <div className={PANEL_HEAD}>
                                <div>
                                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">Stock on hand</h2>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                        Count twice daily, every {STOCK_COUNT_INTERVAL_HOURS} hours.
                                        {' '}Last counted {lastCountedAt ? relativeTime(lastCountedAt).toLowerCase() : 'never'}.
                                        {overdueCount > 0 && (
                                            <span className="text-danger-700 dark:text-danger-300">
                                                {' '}{overdueCount} {overdueCount === 1 ? 'item is' : 'items are'} overdue.
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={addRow}
                                        disabled={loading || savingCount}
                                        title="Add a row for an item this camp isn't tracking yet"
                                        className={BTN + ' px-2.5 py-1.5 text-sm'}
                                    >
                                        + Row
                                    </button>
                                    {!editing ? (
                                        <button
                                            onClick={startEditing}
                                            disabled={loading || sortedLevels.length === 0}
                                            className={BTN + ' px-3 py-1.5 text-sm'}
                                        >
                                            Edit table
                                        </button>
                                    ) : (
                                        <>
                                            <button onClick={cancelEditing} disabled={savingCount} className={BTN + ' px-3 py-1.5 text-sm'}>
                                                Cancel
                                            </button>
                                            <button onClick={saveCount} disabled={savingCount} className={BTN_SOLID}>
                                                {savingCount ? 'Saving...' : `Save count${changeCount ? ` (${changeCount})` : ''}`}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {editing && (
                                <div className="flex-none border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.02]">
                                    <p className="text-xs text-slate-600 dark:text-slate-300">
                                        Saving records the whole table as counted. Figures you change are logged as
                                        corrections, new rows as stock received, and the rest as confirmed unchanged.
                                        Nothing already in the history is overwritten.
                                    </p>
                                    <input
                                        type="text"
                                        value={countNote}
                                        onChange={(e) => setCountNote(e.target.value)}
                                        placeholder="Remark for this count (optional) - e.g. evening count, 2 sacks water damaged"
                                        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-white/20 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500"
                                    />
                                </div>
                            )}

                            <div className="min-h-0 flex-1 overflow-auto">
                                <table className="w-full min-w-[48rem] text-sm">
                                    <thead className="sticky top-0 z-10">
                                        <tr>
                                            <th className={TH}>Item</th>
                                            <th className={TH}>Category</th>
                                            <th className={TH + ' text-right'}>Available</th>
                                            <th className={TH}>Unit</th>
                                            <th className={TH + ' text-right'}>Threshold</th>
                                            <th className={TH}>Last counted</th>
                                            <th className={TH + ' text-right'}>{editing ? '' : 'Actions'}</th>
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
                                                        {editing && item.item_id ? (
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="any"
                                                                value={draft[item.item_id] ?? ''}
                                                                onChange={(e) => setDraft({ ...draft, [item.item_id]: e.target.value })}
                                                                className={CELL_INPUT}
                                                            />
                                                        ) : (
                                                            <span className={`font-semibold tabular-nums ${low ? 'text-danger-700 dark:text-danger-300' : 'text-slate-900 dark:text-white'}`}>
                                                                {formatQty(item.quantity_on_hand)}
                                                            </span>
                                                        )}
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
                                                    <td className={TD}>
                                                        {!editing && (
                                                            <div className="flex justify-end gap-1.5">
                                                                <button onClick={() => openAction(item, 'received')} className={BTN}>Add</button>
                                                                <button onClick={() => openAction(item, 'distributed')} className={BTN}>Distribute</button>
                                                                <button onClick={() => requestItem(item)} className={BTN}>Request</button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {/* Rows typed in with the + button - items the camp isn't tracking yet. */}
                                        {newRows.map((row) => {
                                            const picked = catalog.find(item => item.id === row.itemId);
                                            return (
                                                <tr key={row.key} className="bg-slate-50/60 dark:bg-white/[0.02]">
                                                    <td className={TD}>
                                                        <ItemSelect
                                                            catalog={catalogFor(row.key)}
                                                            value={row.itemId}
                                                            onChange={(itemId) => updateNewRow(row.key, { itemId })}
                                                            placeholder="Pick a new item..."
                                                            className="w-full max-w-[16rem] rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-slate-500 focus:outline-none dark:border-white/20 dark:bg-white/5 dark:text-white"
                                                        />
                                                    </td>
                                                    <td className={TD + ' text-slate-600 dark:text-slate-300'}>
                                                        {picked ? (CATEGORY_NAMES[picked.category] || picked.category) : '—'}
                                                    </td>
                                                    <td className={TD + ' text-right'}>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="any"
                                                            value={row.quantity}
                                                            onChange={(e) => updateNewRow(row.key, { quantity: e.target.value })}
                                                            placeholder="0"
                                                            className={CELL_INPUT}
                                                        />
                                                    </td>
                                                    <td className={TD + ' text-slate-500 dark:text-slate-400'}>{picked?.default_unit || '—'}</td>
                                                    <td className={TD + ' text-right text-slate-400 dark:text-slate-500'}>—</td>
                                                    <td className={TD + ' text-slate-400 dark:text-slate-500'}>New row</td>
                                                    <td className={TD}>
                                                        <div className="flex justify-end">
                                                            <button onClick={() => removeNewRow(row.key)} className={BTN}>Remove</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {!loading && sortedLevels.length === 0 && newRows.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className={TD + ' text-center text-slate-500 dark:text-slate-400'}>
                                                    Nothing tracked yet. Use <span className="font-medium">+ Row</span> to add the first item.
                                                </td>
                                            </tr>
                                        )}
                                        {loading && (
                                            <tr>
                                                <td colSpan={7} className={TD + ' text-center text-slate-500 dark:text-slate-400'}>
                                                    Loading...
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
                                        Relief coordinators only see what you ask for here. Every request you have
                                        raised is listed with what the coordinators did about it.
                                    </p>
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 overflow-auto">
                                <table className="w-full min-w-[58rem] text-sm">
                                    <thead className="sticky top-0 z-10">
                                        <tr>
                                            <th className={TH}>Raised</th>
                                            <th className={TH}>Item</th>
                                            <th className={TH + ' text-right'}>Asked for</th>
                                            <th className={TH}>Urgency</th>
                                            <th className={TH}>Status</th>
                                            <th className={TH}>Coordinator response</th>
                                            <th className={TH}>Your remark</th>
                                            <th className={TH + ' text-right'}></th>
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
                                                    <td className={TD + ' text-right'}>
                                                        {request.status === 'open' && (
                                                            <button onClick={() => cancelRequest(request.id)} className={BTN}>Withdraw</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {requests.length === 0 && (
                                            <tr>
                                                <td colSpan={8} className={TD + ' text-center text-slate-500 dark:text-slate-400'}>
                                                    {loading ? 'Loading...' : 'No requests raised yet.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <form onSubmit={submitRequest} className="grid flex-none grid-cols-1 gap-2 border-t border-slate-200 bg-slate-50 p-3 sm:grid-cols-12 dark:border-white/10 dark:bg-white/[0.02]">
                                <div className="sm:col-span-4">
                                    <ItemSelect
                                        catalog={catalog}
                                        value={reqForm.itemId}
                                        onChange={(itemId) => setReqForm({ ...reqForm, itemId })}
                                    />
                                </div>
                                <input
                                    type="number"
                                    placeholder="Quantity needed"
                                    value={reqForm.quantity}
                                    onChange={(e) => setReqForm({ ...reqForm, quantity: e.target.value })}
                                    min="1"
                                    className="input-field sm:col-span-2"
                                />
                                <select
                                    value={reqForm.urgency}
                                    onChange={(e) => setReqForm({ ...reqForm, urgency: e.target.value })}
                                    className="input-field capitalize sm:col-span-2"
                                >
                                    {REQUEST_URGENCY_LEVELS.map(u => <option key={u} value={u} className="capitalize text-slate-900">{u}</option>)}
                                </select>
                                <input
                                    type="text"
                                    placeholder="Remark for the coordinator (optional)"
                                    value={reqForm.notes}
                                    onChange={(e) => setReqForm({ ...reqForm, notes: e.target.value })}
                                    className="input-field text-sm sm:col-span-3"
                                />
                                <button type="submit" disabled={reqSubmitting} className={BTN_SOLID + ' sm:col-span-1'}>
                                    {reqSubmitting ? '...' : 'Raise'}
                                </button>
                            </form>
                        </section>
                    )}

                    {/* ---------------- History ---------------- */}
                    {tab === 'history' && (
                        <section className={PANEL}>
                            <div className={PANEL_HEAD}>
                                <div>
                                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">Movement history</h2>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                        Every change to the stock table, with the remark recorded at the time.
                                        Entries are never edited or removed.
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

            {/* Quantity dialog for a movement on an existing row */}
            {actionItem && (
                <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 p-4 sm:items-center">
                    <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-slate-900">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                            {actionItem.mode === 'received' ? 'Add stock' : 'Distribute'}: {actionItem.itemName}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Recorded as a new history entry in {actionItem.unit}.
                        </p>
                        <form onSubmit={submitAction} className="mt-4 space-y-3">
                            <input
                                type="number"
                                autoFocus
                                placeholder={`Quantity in ${actionItem.unit}`}
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                min="1"
                                className="input-field"
                            />
                            <input
                                type="text"
                                placeholder="Remark (optional) - shown in the history"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="input-field text-sm"
                            />
                            {error && <p className="text-sm text-danger-700 dark:text-danger-300">{error}</p>}
                            <div className="flex gap-2 pt-1">
                                <button type="button" onClick={() => setActionItem(null)} className="btn-outline flex-1 py-2">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting} className={BTN_SOLID + ' flex-1 py-2'}>
                                    {submitting ? 'Saving...' : 'Confirm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CampAdminInventory;
