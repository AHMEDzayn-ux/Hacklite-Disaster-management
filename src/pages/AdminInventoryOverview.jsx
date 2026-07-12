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
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans">
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
                {/* Header */}
                <div className="mb-6 flex items-center gap-4">
                    <Link to="/admin/dashboard" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
                        ← Dashboard
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white text-2xl shadow-lg shadow-primary-500/30">
                            📦
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white md:text-4xl">Inventory Overview</h1>
                            <p className="mt-1 text-slate-300 text-sm">Stock levels across all relief camps</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30' : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'}`}
                        >
                            All Items ({levels.length})
                        </button>
                        <button
                            onClick={() => setFilter('low')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'low' ? 'bg-danger-600 text-white shadow-md shadow-danger-500/30' : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'}`}
                        >
                            ⚠ Low Stock ({levels.filter(l => isLowStock(l)).length})
                        </button>
                    </div>
                    <button onClick={load} className="px-4 py-2 bg-white/5 border border-white/10 text-slate-200 rounded-lg text-sm hover:bg-white/10 transition-colors">🔄 Refresh</button>
                </div>

                {error && <div className="bg-danger-500/10 border border-danger-400/20 text-danger-300 px-4 py-3 rounded-lg mb-4">{error}</div>}

                <div className="card p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs uppercase tracking-wide text-slate-400 border-b border-white/10 text-left">
                                    <th className="px-4 py-3 font-semibold">Camp</th>
                                    <th className="px-4 py-3 font-semibold">District</th>
                                    <th className="px-4 py-3 font-semibold">Item</th>
                                    <th className="px-4 py-3 font-semibold">Category</th>
                                    <th className="px-4 py-3 font-semibold text-right">Stock</th>
                                    <th className="px-4 py-3 font-semibold">Last Movement</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
                                ) : visibleRows.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No inventory records yet.</td></tr>
                                ) : visibleRows.map((row) => (
                                    <tr key={`${row.camp_id}-${row.item_name}`} className={`border-b border-white/5 hover:bg-white/5 ${row.low ? 'bg-danger-500/10' : ''}`}>
                                        <td className="px-4 py-3 font-medium text-white">{row.camp?.name || row.camp_id.slice(0, 8)}</td>
                                        <td className="px-4 py-3 text-slate-400">{row.camp?.district || '-'}</td>
                                        <td className="px-4 py-3 text-slate-200">{row.item_name}</td>
                                        <td className="px-4 py-3 capitalize text-slate-400">{row.category}</td>
                                        <td className={`px-4 py-3 text-right font-bold ${row.low ? 'text-danger-400' : 'text-white'}`}>
                                            {row.quantity_on_hand} {row.unit}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 text-xs">
                                            {row.last_movement_at ? new Date(row.last_movement_at).toLocaleString() : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminInventoryOverview;
