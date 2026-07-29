import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { supabase } from '@/lib/supabase';
import {
    fetchAllInventoryLevels,
    recordInventoryTransactionAsAdmin,
    createResourceRequest,
    fetchResourceRequests,
    cancelResourceRequest,
    INVENTORY_CATEGORIES,
    REQUEST_URGENCY_LEVELS,
} from '@/features/inventory/services/inventoryService';
import { IconTent } from '@/components/icons/Icons';

/**
 * Camp Admin Inventory
 * ====================
 * The camp_admin's home screen: add stock, distribute, and request supplies for
 * their one camp. A camp_admin is hard-scoped server-side, so the edge function
 * returns (and accepts) only this camp's data regardless of what the client
 * sends - the campId here is used just for display and to pass along.
 *
 * Requests raised here are the only demand signal the Resource Allocation
 * Engine considers, so this screen is what drives the shipment suggestions an
 * admin sees on the command dashboard.
 */

const CATEGORY_LABELS = {
    food: '🍚 Food', water: '💧 Water', medical: '⚕️ Medical', shelter: '⛺ Shelter',
    clothing: '👕 Clothing', hygiene: '🧼 Hygiene', other: '📦 Other',
};

const URGENCY_STYLES = {
    low: 'bg-slate-500/20 text-slate-300',
    normal: 'bg-primary-500/20 text-primary-300',
    high: 'bg-amber-500/20 text-amber-300',
    critical: 'bg-danger-500/20 text-danger-300',
};

function CampAdminInventory() {
    const { user, role, campId, loading: authLoading, signOut } = useAuth();
    const navigate = useNavigate();

    const [campName, setCampName] = useState('');
    const [levels, setLevels] = useState([]);
    const [thresholds, setThresholds] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [actionItem, setActionItem] = useState(null); // { itemName, category, unit, mode }
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');
    const [newItemName, setNewItemName] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('food');
    const [newItemUnit, setNewItemUnit] = useState('units');
    const [submitting, setSubmitting] = useState(false);

    const [requests, setRequests] = useState([]);
    const [reqForm, setReqForm] = useState({ itemName: '', category: 'food', unit: 'units', quantity: '', urgency: 'normal', notes: '' });
    const [reqSubmitting, setReqSubmitting] = useState(false);

    // Only camp_admins belong here.
    useEffect(() => {
        if (authLoading) return;
        if (!user) navigate('/camp-admin/login');
        else if (role && role !== 'camp_admin') navigate('/admin/dashboard');
    }, [user, role, authLoading, navigate]);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        const [result, requestResult] = await Promise.all([
            fetchAllInventoryLevels(),
            fetchResourceRequests(),
        ]);
        if (result.success) {
            setLevels(result.levels || []);
            setThresholds(result.thresholds || {});
        } else {
            setError(result.error || 'Failed to load inventory');
        }
        if (requestResult.success) setRequests(requestResult.requests || []);
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

    const autofillNewItem = () => {
        setNewItemName('Bottled Water');
        setNewItemCategory('water');
        setNewItemUnit('liters');
        setQuantity('100');
        setNotes('Delivered by relief truck');
    };

    const autofillAction = () => {
        setQuantity('20');
        setNotes('Routine restock');
    };

    const openAction = (item, mode) => {
        setActionItem({ itemName: item.item_name, category: item.category, unit: item.unit, mode });
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
            itemName: actionItem.itemName,
            category: actionItem.category,
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

    const submitNewItem = async (e) => {
        e.preventDefault();
        if (!newItemName.trim() || !quantity || Number(quantity) <= 0) return;
        setSubmitting(true);
        setError('');
        const result = await recordInventoryTransactionAsAdmin(campId, {
            itemName: newItemName.trim(),
            category: newItemCategory,
            unit: newItemUnit.trim() || 'units',
            transactionType: 'received',
            quantity: Number(quantity),
            notes: notes || null,
        });
        setSubmitting(false);
        if (result.success) {
            setNewItemName('');
            setQuantity('');
            setNotes('');
            load();
        } else {
            setError(result.error || 'Failed to add item');
        }
    };

    const requestItem = (item) => {
        setReqForm({
            itemName: item.item_name,
            category: item.category,
            unit: item.unit || 'units',
            quantity: '',
            urgency: isLowStock(item.item_name, item.quantity_on_hand) ? 'high' : 'normal',
            notes: '',
        });
        setError('');
        document.getElementById('request-supplies')?.scrollIntoView({ behavior: 'smooth' });
    };

    const submitRequest = async (e) => {
        e.preventDefault();
        if (!reqForm.itemName.trim() || !reqForm.quantity || Number(reqForm.quantity) <= 0) return;
        setReqSubmitting(true);
        setError('');
        const result = await createResourceRequest({
            campId,
            itemName: reqForm.itemName.trim(),
            category: reqForm.category,
            unit: reqForm.unit.trim() || 'units',
            quantity: Number(reqForm.quantity),
            urgency: reqForm.urgency,
            notes: reqForm.notes || null,
        });
        setReqSubmitting(false);
        if (result.success) {
            setReqForm({ itemName: '', category: 'food', unit: 'units', quantity: '', urgency: 'normal', notes: '' });
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

    const openRequests = requests.filter(r => r.status === 'open');

    const sortedLevels = [...levels].sort((a, b) => {
        const aLow = isLowStock(a.item_name, a.quantity_on_hand);
        const bLow = isLowStock(b.item_name, b.quantity_on_hand);
        if (aLow !== bLow) return aLow ? -1 : 1;
        return a.item_name.localeCompare(b.item_name);
    });

    if (authLoading || !user) {
        return (
            <div className="page-shell flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="page-shell pb-24">
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <header className="relative z-10 sticky top-0 flex items-center justify-between border-b border-white/10 bg-slate-950/90 backdrop-blur-xl px-4 py-4 shadow-lg shadow-black/30">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
                        <IconTent className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-white">{campName} Inventory</h1>
                        <p className="text-xs text-slate-400">Camp Admin</p>
                    </div>
                </div>
                <button onClick={() => { signOut(); navigate('/'); }} className="text-xs text-slate-400 hover:text-slate-900 dark:hover:text-white underline transition-colors">
                    Sign out
                </button>
            </header>

            <div className="relative z-10 p-4 max-w-2xl mx-auto">
                {error && <div className="mb-4 p-3 bg-danger-500/10 border border-danger-400/20 rounded-lg text-danger-300 text-sm">{error}</div>}
                {loading && <p className="text-center text-slate-400">Loading...</p>}

                <div className="space-y-3">
                    {sortedLevels.map((item) => {
                        const low = isLowStock(item.item_name, item.quantity_on_hand);
                        return (
                            <div key={`${item.item_name}-${item.category}-${item.unit}`} className={`rounded-xl border border-white/10 bg-white/[0.05] backdrop-blur-md p-4 border-l-4 ${low ? 'border-l-danger-500' : 'border-l-success-500'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white">{item.item_name}</div>
                                        <div className="text-xs text-slate-400">{CATEGORY_LABELS[item.category] || item.category}</div>
                                    </div>
                                    <div className={`text-2xl font-extrabold ${low ? 'text-danger-400' : 'text-white'}`}>
                                        {item.quantity_on_hand} <span className="text-sm font-normal text-slate-400">{item.unit}</span>
                                    </div>
                                </div>
                                {low && <div className="text-xs text-danger-400 font-semibold mb-2">⚠ Below threshold ({thresholds[item.item_name]})</div>}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openAction(item, 'received')}
                                        className="flex-1 bg-success-500/15 hover:bg-success-500/25 border border-success-400/20 text-success-300 font-bold py-3 rounded-lg"
                                    >
                                        + Add Stock
                                    </button>
                                    <button
                                        onClick={() => openAction(item, 'distributed')}
                                        className="flex-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/20 text-amber-300 font-bold py-3 rounded-lg"
                                    >
                                        − Distribute
                                    </button>
                                    <button
                                        onClick={() => requestItem(item)}
                                        className="flex-1 bg-primary-500/15 hover:bg-primary-500/25 border border-primary-400/20 text-primary-300 font-bold py-3 rounded-lg"
                                    >
                                        ↗ Request
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {!loading && sortedLevels.length === 0 && (
                        <p className="text-center text-slate-400 py-8">No items tracked yet. Add one below.</p>
                    )}
                </div>

                {/* Request supplies - the only demand signal the allocation agent reads */}
                <div id="request-supplies" className="mt-6 rounded-xl border border-white/10 bg-white/[0.05] backdrop-blur-md p-4">
                    <h3 className="font-bold text-slate-900 dark:text-white">Request Supplies</h3>
                    <p className="text-xs text-slate-400 mt-1 mb-3">
                        Relief coordinators only see what you ask for here. Requests are matched against spare stock at nearby camps.
                    </p>

                    {openRequests.length > 0 && (
                        <div className="space-y-2 mb-4">
                            {openRequests.map(request => {
                                const fulfilled = Number(request.quantity_fulfilled);
                                const requested = Number(request.quantity_requested);
                                return (
                                    <div key={request.id} className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-semibold text-slate-900 dark:text-white">{request.item_name}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold capitalize ${URGENCY_STYLES[request.urgency]}`}>
                                                {request.urgency}
                                            </span>
                                        </div>
                                        <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                                            <span>{fulfilled} / {requested} {request.unit} received</span>
                                            <button onClick={() => cancelRequest(request.id)} className="text-danger-300 hover:text-danger-200 underline">
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <form onSubmit={submitRequest} className="space-y-3">
                        <input
                            type="text"
                            placeholder="Item needed (e.g. Rice, Bottled Water)"
                            value={reqForm.itemName}
                            onChange={(e) => setReqForm({ ...reqForm, itemName: e.target.value })}
                            className="input-field"
                        />
                        <div className="flex gap-2">
                            <select
                                value={reqForm.category}
                                onChange={(e) => setReqForm({ ...reqForm, category: e.target.value })}
                                className="input-field flex-1"
                            >
                                {INVENTORY_CATEGORIES.map(c => <option key={c} value={c} className="text-slate-900">{CATEGORY_LABELS[c] || c}</option>)}
                            </select>
                            <input
                                type="text"
                                placeholder="Unit"
                                value={reqForm.unit}
                                onChange={(e) => setReqForm({ ...reqForm, unit: e.target.value })}
                                className="input-field w-28"
                            />
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                placeholder="Quantity needed"
                                value={reqForm.quantity}
                                onChange={(e) => setReqForm({ ...reqForm, quantity: e.target.value })}
                                min="1"
                                className="input-field flex-1"
                            />
                            <select
                                value={reqForm.urgency}
                                onChange={(e) => setReqForm({ ...reqForm, urgency: e.target.value })}
                                className="input-field w-32 capitalize"
                            >
                                {REQUEST_URGENCY_LEVELS.map(u => <option key={u} value={u} className="text-slate-900 capitalize">{u}</option>)}
                            </select>
                        </div>
                        <input
                            type="text"
                            placeholder="Note (optional)"
                            value={reqForm.notes}
                            onChange={(e) => setReqForm({ ...reqForm, notes: e.target.value })}
                            className="input-field text-sm"
                        />
                        <button
                            type="submit"
                            disabled={reqSubmitting}
                            className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:shadow-lg hover:shadow-primary-500/40 disabled:opacity-50 text-white font-bold py-3 rounded-lg shadow-md shadow-primary-500/25"
                        >
                            {reqSubmitting ? 'Sending...' : 'Raise Request'}
                        </button>
                    </form>
                </div>

                {/* Add a new item */}
                <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.05] backdrop-blur-md p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-slate-900 dark:text-white">Add New Item</h3>
                        <button
                            type="button"
                            onClick={autofillNewItem}
                            className="text-xs px-2.5 py-1 rounded-md bg-primary-500/20 text-primary-300 hover:bg-primary-500/30"
                        >
                            Test Fill
                        </button>
                    </div>
                    <form onSubmit={submitNewItem} className="space-y-3">
                        <input
                            type="text"
                            placeholder="Item name (e.g. Rice, Bottled Water)"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className="input-field"
                        />
                        <div className="flex gap-2">
                            <select
                                value={newItemCategory}
                                onChange={(e) => setNewItemCategory(e.target.value)}
                                className="input-field flex-1"
                            >
                                {INVENTORY_CATEGORIES.map(c => <option key={c} value={c} className="text-slate-900">{CATEGORY_LABELS[c] || c}</option>)}
                            </select>
                            <input
                                type="text"
                                placeholder="Unit (kg, liters...)"
                                value={newItemUnit}
                                onChange={(e) => setNewItemUnit(e.target.value)}
                                className="input-field w-28"
                            />
                        </div>
                        <input
                            type="number"
                            placeholder="Quantity received"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            min="1"
                            className="input-field"
                        />
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-gradient-to-r from-primary-600 to-primary-500 hover:shadow-lg hover:shadow-primary-500/40 disabled:opacity-50 text-white font-bold py-3 rounded-lg shadow-md shadow-primary-500/25"
                        >
                            {submitting ? 'Saving...' : 'Add Item'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Quantity modal for existing items */}
            {actionItem && (
                <div className="fixed inset-0 z-20 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
                        <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                {actionItem.mode === 'received' ? 'Add Stock' : 'Distribute'}: {actionItem.itemName}
                            </h3>
                            <button
                                type="button"
                                onClick={autofillAction}
                                className="flex-shrink-0 text-xs px-2 py-1 rounded-md bg-primary-500/20 text-primary-300 hover:bg-primary-500/30"
                            >
                                Test Fill
                            </button>
                        </div>
                        <form onSubmit={submitAction} className="space-y-4 mt-4">
                            <input
                                type="number"
                                autoFocus
                                placeholder="Quantity"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                min="1"
                                className="input-field w-full text-2xl text-center py-4"
                            />
                            <input
                                type="text"
                                placeholder="Note (optional)"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="input-field text-sm"
                            />
                            {error && <p className="text-danger-400 text-sm">{error}</p>}
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setActionItem(null)} className="flex-1 border border-white/20 bg-white/5 hover:bg-white/10 text-slate-900 dark:text-white py-3 rounded-xl font-bold transition-colors">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-1 bg-gradient-to-r from-primary-600 to-primary-500 hover:shadow-lg hover:shadow-primary-500/40 disabled:opacity-50 text-white py-3 rounded-xl font-bold">
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
