import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import {
    fetchAllInventoryLevels,
    recordInventoryTransactionAsAdmin,
    INVENTORY_CATEGORIES,
} from '../services/inventoryService';

/**
 * Camp Admin Inventory
 * ====================
 * The camp_admin's home screen: add stock and distribute for their one camp.
 * A camp_admin is hard-scoped server-side, so the edge function returns (and
 * accepts) only this camp's data regardless of what the client sends - the
 * campId here is used just for display and to pass along.
 */

const CATEGORY_LABELS = {
    food: '🍚 Food', water: '💧 Water', medical: '⚕️ Medical', shelter: '⛺ Shelter',
    clothing: '👕 Clothing', hygiene: '🧼 Hygiene', other: '📦 Other',
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

    // Only camp_admins belong here.
    useEffect(() => {
        if (authLoading) return;
        if (!user) navigate('/camp-admin/login');
        else if (role && role !== 'camp_admin') navigate('/admin/dashboard');
    }, [user, role, authLoading, navigate]);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        const result = await fetchAllInventoryLevels();
        if (result.success) {
            setLevels(result.levels || []);
            setThresholds(result.thresholds || {});
        } else {
            setError(result.error || 'Failed to load inventory');
        }
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

    const sortedLevels = [...levels].sort((a, b) => {
        const aLow = isLowStock(a.item_name, a.quantity_on_hand);
        const bLow = isLowStock(b.item_name, b.quantity_on_hand);
        if (aLow !== bLow) return aLow ? -1 : 1;
        return a.item_name.localeCompare(b.item_name);
    });

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-blue-950 pb-24">
            <header className="bg-primary-700 text-white px-4 py-4 sticky top-0 z-10 shadow-md flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold">📦 {campName} Inventory</h1>
                    <p className="text-xs text-primary-100">Camp Admin</p>
                </div>
                <button onClick={() => { signOut(); navigate('/'); }} className="text-xs text-primary-100 underline">
                    Sign out
                </button>
            </header>

            <div className="p-4 max-w-2xl mx-auto">
                {error && <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">{error}</div>}
                {loading && <p className="text-center text-gray-500">Loading...</p>}

                <div className="space-y-3">
                    {sortedLevels.map((item) => {
                        const low = isLowStock(item.item_name, item.quantity_on_hand);
                        return (
                            <div key={`${item.item_name}-${item.category}-${item.unit}`} className={`bg-white rounded-xl shadow p-4 border-l-4 ${low ? 'border-danger-500' : 'border-success-500'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <div className="font-bold text-gray-800">{item.item_name}</div>
                                        <div className="text-xs text-gray-500">{CATEGORY_LABELS[item.category] || item.category}</div>
                                    </div>
                                    <div className={`text-2xl font-extrabold ${low ? 'text-danger-600' : 'text-gray-800'}`}>
                                        {item.quantity_on_hand} <span className="text-sm font-normal">{item.unit}</span>
                                    </div>
                                </div>
                                {low && <div className="text-xs text-danger-600 font-semibold mb-2">⚠ Below threshold ({thresholds[item.item_name]})</div>}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openAction(item, 'received')}
                                        className="flex-1 bg-success-100 hover:bg-success-200 text-success-800 font-bold py-3 rounded-lg"
                                    >
                                        + Add Stock
                                    </button>
                                    <button
                                        onClick={() => openAction(item, 'distributed')}
                                        className="flex-1 bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold py-3 rounded-lg"
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

                {/* Add a new item */}
                <div className="mt-6 bg-white rounded-xl shadow p-4">
                    <h3 className="font-bold text-gray-800 mb-3">➕ Add New Item</h3>
                    <form onSubmit={submitNewItem} className="space-y-3">
                        <input
                            type="text"
                            placeholder="Item name (e.g. Rice, Bottled Water)"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
                        />
                        <div className="flex gap-2">
                            <select
                                value={newItemCategory}
                                onChange={(e) => setNewItemCategory(e.target.value)}
                                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg"
                            >
                                {INVENTORY_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
                            </select>
                            <input
                                type="text"
                                placeholder="Unit (kg, liters...)"
                                value={newItemUnit}
                                onChange={(e) => setNewItemUnit(e.target.value)}
                                className="w-28 px-4 py-3 border-2 border-gray-300 rounded-lg"
                            />
                        </div>
                        <input
                            type="number"
                            placeholder="Quantity received"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            min="1"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"
                        />
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-primary-700 hover:bg-primary-800 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg"
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
                            {error && <p className="text-danger-600 text-sm">{error}</p>}
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setActionItem(null)} className="flex-1 bg-gray-200 py-3 rounded-xl font-bold">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-1 bg-primary-700 text-white py-3 rounded-xl font-bold disabled:bg-gray-300">
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
