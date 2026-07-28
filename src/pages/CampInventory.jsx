import React, { useState, useEffect, useCallback } from 'react';
import { fetchCampInventoryLevels, recordInventoryTransaction, INVENTORY_CATEGORIES } from '../services/inventoryService';
import { supabase } from '../config/supabase';
import { IconGrid } from '../components/icons/Icons';

/**
 * Camp Inventory (public, code-gated)
 * ====================================
 * Built for a volunteer on a phone in the field, not a desktop admin - no
 * login, just a short code shared by the camp coordinator. Large tap targets,
 * one-field quantity entry, low-stock items pinned to the top in red.
 */

const CATEGORY_LABELS = {
    food: '🍚 Food', water: '💧 Water', medical: '⚕️ Medical', shelter: '⛺ Shelter',
    clothing: '👕 Clothing', hygiene: '🧼 Hygiene', other: '📦 Other'
};

function CampInventory() {
    const [campId, setCampId] = useState('');
    const [accessCode, setAccessCode] = useState('');
    const [unlocked, setUnlocked] = useState(null); // { campId, accessCode, campName }
    const [levels, setLevels] = useState([]);
    const [thresholds, setThresholds] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [actionItem, setActionItem] = useState(null); // { itemName, category, mode }
    const [quantity, setQuantity] = useState('');
    const [newItemName, setNewItemName] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('food');
    const [notes, setNotes] = useState('');
    const [recordedByName, setRecordedByName] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const loadLevels = useCallback(async (cid, code) => {
        setLoading(true);
        const result = await fetchCampInventoryLevels(cid, code);
        if (result.success) {
            setLevels(result.levels || []);
            setThresholds(result.thresholds || {});
        } else {
            setError(result.error || 'Failed to load inventory');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (unlocked) loadLevels(unlocked.campId, unlocked.accessCode);
    }, [unlocked, loadLevels]);

    const handleUnlock = async (e) => {
        e.preventDefault();
        setError('');
        if (!campId.trim() || !accessCode.trim()) {
            setError('Enter both the camp and the access code.');
            return;
        }
        setLoading(true);
        const { data: camp } = await supabase.from('camps').select('id, name').eq('id', campId.trim()).single();
        const result = await fetchCampInventoryLevels(campId.trim(), accessCode.trim().toUpperCase());
        setLoading(false);
        if (!result.success) {
            setError('Invalid camp or access code.');
            return;
        }
        setUnlocked({ campId: campId.trim(), accessCode: accessCode.trim().toUpperCase(), campName: camp?.name || 'Camp' });
    };

    const openAction = (itemName, category, mode) => {
        setActionItem({ itemName, category, mode });
        setQuantity('');
        setNotes('');
    };

    const submitAction = async (e) => {
        e.preventDefault();
        if (!actionItem || !quantity || Number(quantity) <= 0) return;
        setSubmitting(true);
        const result = await recordInventoryTransaction(unlocked.campId, unlocked.accessCode, {
            itemName: actionItem.itemName,
            category: actionItem.category,
            transactionType: actionItem.mode,
            quantity: Number(quantity),
            recordedByName: recordedByName || 'Volunteer',
            notes: notes || null,
        });
        setSubmitting(false);
        if (result.success) {
            setActionItem(null);
            loadLevels(unlocked.campId, unlocked.accessCode);
        } else {
            setError(result.error || 'Failed to record transaction');
        }
    };

    const submitNewItem = async (e) => {
        e.preventDefault();
        if (!newItemName.trim() || !quantity || Number(quantity) <= 0) return;
        setSubmitting(true);
        const result = await recordInventoryTransaction(unlocked.campId, unlocked.accessCode, {
            itemName: newItemName.trim(),
            category: newItemCategory,
            transactionType: 'received',
            quantity: Number(quantity),
            recordedByName: recordedByName || 'Volunteer',
            notes: notes || null,
        });
        setSubmitting(false);
        if (result.success) {
            setNewItemName('');
            setQuantity('');
            setNotes('');
            loadLevels(unlocked.campId, unlocked.accessCode);
        } else {
            setError(result.error || 'Failed to add item');
        }
    };

    const isLowStock = (itemName, quantityOnHand) => {
        const threshold = thresholds[itemName];
        return threshold != null && quantityOnHand < threshold;
    };

    const sortedLevels = [...levels].sort((a, b) => {
        const aLow = isLowStock(a.item_name, a.quantity_on_hand);
        const bLow = isLowStock(b.item_name, b.quantity_on_hand);
        if (aLow !== bLow) return aLow ? -1 : 1;
        return a.item_name.localeCompare(b.item_name);
    });

    if (!unlocked) {
        return (
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans flex items-center justify-center px-4">
                <div
                    className="absolute inset-0 pointer-events-none opacity-10"
                    style={{
                        backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                    }}
                ></div>
                <div className="relative z-10 w-full max-w-sm card">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500/20 text-primary-300">
                        <IconGrid className="h-6 w-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1 text-center">Camp Inventory</h1>
                    <p className="text-sm text-slate-400 text-center mb-6">Enter the camp ID and access code given by your coordinator.</p>
                    <form onSubmit={handleUnlock} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Camp ID"
                            value={campId}
                            onChange={(e) => setCampId(e.target.value)}
                            className="input-field text-lg py-3"
                        />
                        <input
                            type="text"
                            placeholder="Access Code"
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                            className="input-field text-lg py-3 tracking-widest uppercase"
                            maxLength={6}
                        />
                        {error && <p className="text-danger-400 text-sm text-center">{error}</p>}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary text-lg py-3 disabled:opacity-50"
                        >
                            {loading ? 'Checking...' : 'Unlock'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans pb-24">
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <header className="relative z-10 bg-slate-900/80 border-b border-white/10 backdrop-blur-md text-white px-4 py-4 sticky top-0 shadow-md">
                <h1 className="text-lg font-bold flex items-center gap-2">
                    <IconGrid className="h-5 w-5 text-primary-300" />
                    {unlocked.campName} Inventory
                </h1>
                <button onClick={() => setUnlocked(null)} className="text-xs text-primary-300 hover:text-primary-200 underline">Switch camp</button>
            </header>

            <div className="relative z-10 mx-auto max-w-2xl p-4">
                <input
                    type="text"
                    placeholder="Your name (optional)"
                    value={recordedByName}
                    onChange={(e) => setRecordedByName(e.target.value)}
                    className="input-field mb-4 text-sm"
                />

                {error && <div className="mb-4 p-3 bg-danger-500/10 border border-danger-400/20 rounded-lg text-danger-300 text-sm">{error}</div>}
                {loading && <p className="text-center text-slate-400">Loading...</p>}

                <div className="space-y-3">
                    {sortedLevels.map((item) => {
                        const low = isLowStock(item.item_name, item.quantity_on_hand);
                        return (
                            <div key={`${item.item_name}-${item.category}`} className={`card p-4 border-l-4 ${low ? 'border-l-danger-500' : 'border-l-success-500'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <div className="font-bold text-white">{item.item_name}</div>
                                        <div className="text-xs text-slate-400">{CATEGORY_LABELS[item.category] || item.category}</div>
                                    </div>
                                    <div className={`text-2xl font-extrabold ${low ? 'text-danger-400' : 'text-white'}`}>
                                        {item.quantity_on_hand} <span className="text-sm font-normal text-slate-400">{item.unit}</span>
                                    </div>
                                </div>
                                {low && <div className="text-xs text-danger-400 font-semibold mb-2">⚠ Below threshold ({thresholds[item.item_name]})</div>}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openAction(item.item_name, item.category, 'received')}
                                        className="flex-1 bg-success-500/15 hover:bg-success-500/25 text-success-300 font-bold py-3 rounded-lg text-lg transition-colors"
                                    >
                                        + Add Stock
                                    </button>
                                    <button
                                        onClick={() => openAction(item.item_name, item.category, 'distributed')}
                                        className="flex-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold py-3 rounded-lg text-lg transition-colors"
                                    >
                                        − Distribute
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {!loading && sortedLevels.length === 0 && (
                        <p className="text-center text-slate-400 py-8">No items tracked yet. Add one below.</p>
                    )}
                </div>

                {/* Add a new item type */}
                <div className="mt-6 card p-4">
                    <h3 className="font-bold text-white mb-3">➕ Add New Item</h3>
                    <form onSubmit={submitNewItem} className="space-y-3">
                        <input
                            type="text"
                            placeholder="Item name (e.g. Rice, Bottled Water)"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className="input-field text-lg py-3"
                        />
                        <select
                            value={newItemCategory}
                            onChange={(e) => setNewItemCategory(e.target.value)}
                            className="input-field text-lg py-3"
                        >
                            {INVENTORY_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
                        </select>
                        <input
                            type="number"
                            placeholder="Quantity received"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            min="1"
                            className="input-field text-lg py-3"
                        />
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full btn-primary py-3 disabled:opacity-50"
                        >
                            {submitting ? 'Saving...' : 'Add Item'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Quantity modal for existing items */}
            {actionItem && (
                <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-20 p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-1">
                            {actionItem.mode === 'received' ? 'Add Stock' : 'Distribute'}: {actionItem.itemName}
                        </h3>
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
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setActionItem(null)} className="flex-1 border border-white/20 bg-white/5 text-white hover:bg-white/10 py-3 rounded-xl font-bold transition-colors">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-1 btn-primary rounded-xl disabled:opacity-50">
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

export default CampInventory;
