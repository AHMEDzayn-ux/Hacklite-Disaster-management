import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchAllInventoryLevels } from '../services/inventoryService';
import { supabase } from '../config/supabase';

function AdminInventoryOverview() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [levels, setLevels] = useState([]);
    const [camps, setCamps] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all'); // 'all' | 'low'

    useEffect(() => {
        if (!authLoading && !user) navigate('/admin/login');
    }, [user, authLoading, navigate]);

    const load = useCallback(async () => {
        setLoading(true);
        const [levelsResult, campsResult] = await Promise.all([
            fetchAllInventoryLevels(),
            supabase.from('camps').select('id, name, district, inventory_thresholds'),
        ]);
        if (levelsResult.success) setLevels(levelsResult.levels || []);
        else setError(levelsResult.error || 'Failed to load inventory');

        const campMap = {};
        for (const c of campsResult.data || []) campMap[c.id] = c;
        setCamps(campMap);
        setLoading(false);
    }, []);

    useEffect(() => { if (user) load(); }, [user, load]);

    const isLowStock = (row) => {
        const camp = camps[row.camp_id];
        const threshold = camp?.inventory_thresholds?.[row.item_name];
        return threshold != null && row.quantity_on_hand < threshold;
    };

    const visibleRows = levels
        .map(row => ({ ...row, camp: camps[row.camp_id], low: isLowStock(row) }))
        .filter(row => filter === 'all' || row.low)
        .sort((a, b) => {
            if (a.low !== b.low) return a.low ? -1 : 1;
            return (a.camp?.name || '').localeCompare(b.camp?.name || '');
        });

    if (authLoading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-gray-800 text-white shadow-lg">
                <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
                    <Link to="/admin/dashboard" className="text-gray-400 hover:text-white transition-colors">← Dashboard</Link>
                    <h1 className="text-xl font-bold">📦 Inventory Overview</h1>
                </div>
            </header>

            <main className="w-full px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 border'}`}
                        >
                            All Items ({levels.length})
                        </button>
                        <button
                            onClick={() => setFilter('low')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'low' ? 'bg-danger-600 text-white' : 'bg-white text-gray-700 border'}`}
                        >
                            ⚠ Low Stock ({levels.filter(l => isLowStock(l)).length})
                        </button>
                    </div>
                    <button onClick={load} className="px-4 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50">🔄 Refresh</button>
                </div>

                {error && <div className="bg-danger-50 border border-danger-300 text-danger-700 px-4 py-3 rounded-lg mb-4">{error}</div>}

                <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-gray-600">
                            <tr>
                                <th className="px-4 py-3">Camp</th>
                                <th className="px-4 py-3">District</th>
                                <th className="px-4 py-3">Item</th>
                                <th className="px-4 py-3">Category</th>
                                <th className="px-4 py-3 text-right">Stock</th>
                                <th className="px-4 py-3">Last Movement</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
                            ) : visibleRows.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No inventory records yet.</td></tr>
                            ) : visibleRows.map((row) => (
                                <tr key={`${row.camp_id}-${row.item_name}`} className={row.low ? 'bg-red-50' : ''}>
                                    <td className="px-4 py-3 font-medium">{row.camp?.name || row.camp_id.slice(0, 8)}</td>
                                    <td className="px-4 py-3 text-gray-600">{row.camp?.district || '-'}</td>
                                    <td className="px-4 py-3">{row.item_name}</td>
                                    <td className="px-4 py-3 capitalize text-gray-600">{row.category}</td>
                                    <td className={`px-4 py-3 text-right font-bold ${row.low ? 'text-red-600' : 'text-gray-800'}`}>
                                        {row.quantity_on_hand} {row.unit}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">
                                        {row.last_movement_at ? new Date(row.last_movement_at).toLocaleString() : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}

export default AdminInventoryOverview;
