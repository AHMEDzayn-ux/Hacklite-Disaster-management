import React, { useState, useEffect, useCallback } from 'react';
import { fetchCampInventoryLevels, recordInventoryTransaction, INVENTORY_CATEGORIES } from '../services/inventoryService';
import { supabase } from '../config/supabase';

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
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6">
                    <h1 className="text-2xl font-bold text-gray-800 mb-1 text-center">📦 Camp Inventory</h1>
                    <p className="text-sm text-gray-500 text-center mb-6">Enter the camp ID and access code given by your coordinator.</p>
                    <form onSubmit={handleUnlock} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Camp ID"
                            value={campId}
                            onChange={(e) => setCampId(e.target.value)}
                            className="w-full text-lg px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none"
                        />
                        <input
                            type="text"
                            placeholder="Access Code"
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                            className="w-full text-lg tracking-widest px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none uppercase"
                            maxLength={6}
                        />
                        {error && <p className="text-red-600 text-sm text-center">{error}</p>}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold text-lg py-4 rounded-xl transition-colors"
                        >
                            {loading ? 'Checking...' : 'Unlock'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <header className="bg-blue-600 text-white px-4 py-4 sticky top-0 z-10 shadow-md">
                <h1 className="text-lg font-bold">📦 {unlocked.campName} Inventory</h1>
                <button onClick={() => setUnlocked(null)} className="text-xs text-blue-100 underline">Switch camp</button>
            </header>

            <div className="p-4">
                <input
                    type="text"
                    placeholder="Your name (optional)"
                    value={recordedByName}
                    onChange={(e) => setRecordedByName(e.target.value)}
                    className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg text-sm"
                />

                {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
                {loading && <p className="text-center text-gray-500">Loading...</p>}

                <div className="space-y-3">
                    {sortedLevels.map((item) => {
                        const low = isLowStock(item.item_name, item.quantity_on_hand);
                        return (
                            <div key={`${item.item_name}-${item.category}`} className={`bg-white rounded-xl shadow p-4 border-l-4 ${low ? 'border-red-500' : 'border-green-500'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <div className="font-bold text-gray-800">{item.item_name}</div>
                                        <div className="text-xs text-gray-500">{CATEGORY_LABELS[item.category] || item.category}</div>
                                    </div>
                                    <div className={`text-2xl font-extrabold ${low ? 'text-red-600' : 'text-gray-800'}`}>
                                        {item.quantity_on_hand} <span className="text-sm font-normal">{item.unit}</span>
                                    </div>
                                </div>
                                {low && <div className="text-xs text-red-600 font-semibold mb-2">⚠ Below threshold ({thresholds[item.item_name]})</div>}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openAction(item.item_name, item.category, 'received')}
                                        className="flex-1 bg-green-100 hover:bg-green-200 text-green-800 font-bold py-3 rounded-lg text-lg"
                                    >
                                        + Add Stock
                                    </button>
                                    <button
                                        onClick={() => openAction(item.item_name, item.category, 'distributed')}
                                        className="flex-1 bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold py-3 rounded-lg text-lg"
                                    >
                                        − Distribute
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {!loading && sortedLevels.length === 0 && (
                        <p className="text-center text-gray-500 py-8">No items tracked yet. Add one below.</p>
                    )}
                </div>

                {/* Add a new item type */}
                <div className="mt-6 bg-white rounded-xl shadow p-4">
                    <h3 className="font-bold text-gray-800 mb-3">➕ Add New Item</h3>
                    <form onSubmit={submitNewItem} className="space-y-3">
                        <input
                            type="text"
                            placeholder="Item name (e.g. Rice, Bottled Water)"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg"
                        />
                        <select
                            value={newItemCategory}
                            onChange={(e) => setNewItemCategory(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg"
                        >
                            {INVENTORY_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
                        </select>
                        <input
                            type="number"
                            placeholder="Quantity received"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            min="1"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg"
                        />
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg"
                        >
                            {submitting ? 'Saving...' : 'Add Item'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Quantity modal for existing items */}
            {actionItem && (
                <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-20 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                        <h3 className="text-xl font-bold mb-1">
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
                                className="w-full text-2xl text-center px-4 py-4 border-2 border-gray-300 rounded-xl"
                            />
                            <input
                                type="text"
                                placeholder="Note (optional)"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setActionItem(null)} className="flex-1 bg-gray-200 py-3 rounded-xl font-bold">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold disabled:bg-gray-300">
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
