import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { fetchAllInventoryLevels } from '@/features/inventory/services/inventoryService';
import { supabase } from '@/lib/supabase';
import { PROVINCES, UNKNOWN_PROVINCE, resolveDistrict } from '@/data/sriLankaRegions';
import { IconChevronRight } from '@/components/icons/Icons';

/**
 * Admin Inventory Overview
 * ========================
 * Stock across every camp, clustered Province > District > Camp. The tree is
 * built by walking the province/district constant and attaching camps into it -
 * not by grouping the data - so districts with no camps still render as empty
 * coverage gaps rather than silently disappearing.
 */

function AdminInventoryOverview() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [levels, setLevels] = useState([]);
    const [camps, setCamps] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all'); // 'all' | 'low'
    // null = follow the low-stock default below; a Set = the user has taken over.
    const [override, setOverride] = useState(null);

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

    const isLowStock = useCallback((row) => {
        const threshold = camps[row.camp_id]?.inventory_thresholds?.[row.item_name];
        return threshold != null && row.quantity_on_hand < threshold;
    }, [camps]);

    const lowStockCount = useMemo(
        () => levels.filter(isLowStock).length,
        [levels, isLowStock]
    );

    /**
     * Province > District > Camp > items.
     *
     * In 'low' mode the tree is pruned bottom-up (camps with no low items go,
     * then districts left with no camps, then provinces left with no districts)
     * - otherwise the filter would render ~21 empty district headers wrapping a
     * dozen rows.
     */
    const tree = useMemo(() => {
        // camp_id -> items, keeping only what the active filter cares about.
        const itemsByCamp = new Map();
        for (const row of levels) {
            const low = isLowStock(row);
            if (filter === 'low' && !low) continue;
            if (!itemsByCamp.has(row.camp_id)) itemsByCamp.set(row.camp_id, []);
            itemsByCamp.get(row.camp_id).push({ ...row, low });
        }

        // Canonical district name -> camps sitting in it. Camps whose district
        // doesn't resolve are collected separately so they can't vanish.
        const campsByDistrict = new Map();
        const unresolvedCamps = [];
        for (const camp of Object.values(camps)) {
            const items = (itemsByCamp.get(camp.id) || [])
                .sort((a, b) => (b.low - a.low) || a.item_name.localeCompare(b.item_name));
            const node = { ...camp, items, lowCount: items.filter(i => i.low).length };

            const district = resolveDistrict(camp.district);
            if (!district) {
                unresolvedCamps.push(node);
                continue;
            }
            if (!campsByDistrict.has(district)) campsByDistrict.set(district, []);
            campsByDistrict.get(district).push(node);
        }

        const buildDistrict = (name, districtCamps) => {
            const visible = filter === 'low'
                ? districtCamps.filter(c => c.lowCount > 0)
                : districtCamps;
            visible.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            return {
                name,
                camps: visible,
                campCount: visible.length,
                itemCount: visible.reduce((n, c) => n + c.items.length, 0),
                lowCount: visible.reduce((n, c) => n + c.lowCount, 0),
            };
        };

        const rollUp = (name, districts) => ({
            name,
            districts,
            campCount: districts.reduce((n, d) => n + d.campCount, 0),
            itemCount: districts.reduce((n, d) => n + d.itemCount, 0),
            lowCount: districts.reduce((n, d) => n + d.lowCount, 0),
        });

        const provinces = PROVINCES.map(p => {
            const districts = p.districts
                .map(d => buildDistrict(d, campsByDistrict.get(d) || []))
                // Empty districts are the point in 'all' view; noise in 'low' view.
                .filter(d => filter === 'all' || d.campCount > 0);
            return rollUp(p.name, districts);
        }).filter(p => filter === 'all' || p.districts.length > 0);

        // Bad/missing district data surfaces at the bottom instead of being dropped.
        const strays = filter === 'low'
            ? unresolvedCamps.filter(c => c.lowCount > 0)
            : unresolvedCamps;
        if (strays.length > 0) {
            const district = buildDistrict('No district set', strays);
            provinces.push(rollUp(UNKNOWN_PROVINCE, [district]));
        }

        return provinces;
    }, [levels, camps, filter, isLowStock]);

    // Open the page on the problems: anything holding low stock starts expanded.
    // Derived rather than seeded into state, so it costs no extra render and
    // re-targets itself when the filter changes - until the user takes over,
    // at which point `override` wins and we stop second-guessing them.
    const defaultExpanded = useMemo(() => {
        const keys = new Set();
        for (const province of tree) {
            if (province.lowCount === 0) continue;
            keys.add(province.name);
            for (const district of province.districts) {
                if (district.lowCount > 0) keys.add(`${province.name}/${district.name}`);
            }
        }
        return keys;
    }, [tree]);

    const expanded = override ?? defaultExpanded;

    const toggle = (key) => setOverride(prev => {
        const next = new Set(prev ?? defaultExpanded);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
    });

    const setAll = (open) => {
        if (!open) return setOverride(new Set());
        const all = new Set();
        for (const province of tree) {
            all.add(province.name);
            for (const district of province.districts) all.add(`${province.name}/${district.name}`);
        }
        setOverride(all);
    };

    if (authLoading || !user) {
        return (
            <div className="page-shell flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="page-shell">
            <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }}
            ></div>

            <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-4 sm:px-6">
                {/* Header */}
                <div className="mb-3 flex items-center gap-3">
                    <Link to="/admin/dashboard" className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-sm font-medium">
                        ← Dashboard
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-500 text-white text-2xl shadow-lg shadow-primary-500/30">
                            📦
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 dark:text-white md:text-2xl">Inventory Overview</h1>
                            <p className="mt-0.5 text-slate-300 text-xs">Stock levels across all relief camps</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'all'? 'bg-primary-500 text-white shadow-md shadow-primary-500/30' : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'}`}
                        >
                            All Items ({levels.length})
                        </button>
                        <button
                            onClick={() => setFilter('low')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'low'? 'bg-danger-600 text-white shadow-md shadow-danger-500/30' : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'}`}
                        >
                            ⚠ Low Stock ({lowStockCount})
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setAll(true)} className="px-3 py-2 bg-white/5 border border-white/10 text-slate-200 rounded-lg text-sm hover:bg-white/10">Expand all</button>
                        <button onClick={() => setAll(false)} className="px-3 py-2 bg-white/5 border border-white/10 text-slate-200 rounded-lg text-sm hover:bg-white/10">Collapse all</button>
                        <button onClick={load} className="px-4 py-2 bg-white/5 border border-white/10 text-slate-200 rounded-lg text-sm hover:bg-white/10">🔄 Refresh</button>
                    </div>
                </div>

                {error && <div className="bg-danger-500/10 border border-danger-400/20 text-danger-300 px-4 py-3 rounded-lg mb-4">{error}</div>}

                {loading ? (
                    <div className="rounded-xl border border-white/10 bg-white/[0.05] backdrop-blur-md px-4 py-12 text-center text-slate-400">Loading...</div>
                ) : tree.length === 0 ? (
                    <div className="rounded-xl border border-white/10 bg-white/[0.05] backdrop-blur-md px-4 py-12 text-center text-slate-400">
                        {filter === 'low' ? 'No items are below their reorder threshold.' : 'No inventory records yet.'}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tree.map(province => (
                            <ProvinceSection
                                key={province.name}
                                province={province}
                                expanded={expanded}
                                onToggle={toggle}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function ProvinceSection({ province, expanded, onToggle }) {
    const isOpen = expanded.has(province.name);
    const isEmpty = province.campCount === 0;

    return (
        <section className="rounded-xl border border-white/10 bg-white/[0.05] backdrop-blur-md overflow-hidden">
            <button
                onClick={() => onToggle(province.name)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 ${isEmpty ? 'text-slate-500' : ''}`}
            >
                <IconChevronRight className={`h-3.5 w-3.5 flex-shrink-0 text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                <h2 className={`font-bold ${isEmpty ? 'text-slate-500' : 'text-slate-900 dark:text-white'}`}>{province.name}</h2>
                <span className="ml-auto flex items-center gap-3 text-xs">
                    {province.lowCount > 0 && (
                        <span className="px-2 py-1 rounded-full bg-danger-500/15 text-danger-300 font-semibold">
                            ⚠ {province.lowCount} low
                        </span>
                    )}
                    <span className="text-slate-400">
                        {province.campCount} {province.campCount === 1 ? 'camp' : 'camps'} · {province.itemCount} items
                    </span>
                </span>
            </button>

            {isOpen && (
                <div className="border-t border-white/10 divide-y divide-white/5">
                    {province.districts.map(district => (
                        <DistrictSection
                            key={district.name}
                            province={province.name}
                            district={district}
                            expanded={expanded}
                            onToggle={onToggle}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function DistrictSection({ province, district, expanded, onToggle }) {
    const key = `${province}/${district.name}`;
    const isOpen = expanded.has(key);
    const isEmpty = district.campCount === 0;

    return (
        <div className={isEmpty ? 'bg-white/[0.02]' : ''}>
            <button
                onClick={() => !isEmpty && onToggle(key)}
                disabled={isEmpty}
                className={`w-full flex items-center gap-3 pl-8 pr-4 py-2.5 text-left ${isEmpty ? 'cursor-default' : 'hover:bg-white/5'}`}
            >
                {isEmpty ? (
                    <span className="w-3.5 flex-shrink-0" />
                ) : (
                    <IconChevronRight className={`h-3 w-3 flex-shrink-0 text-slate-500 ${isOpen ? 'rotate-90' : ''}`} />
                )}
                <h3 className={`text-sm font-semibold ${isEmpty ? 'text-slate-500' : 'text-slate-900 dark:text-white'}`}>{district.name}</h3>
                <span className="ml-auto flex items-center gap-3 text-xs">
                    {district.lowCount > 0 && (
                        <span className="text-danger-400 font-semibold">⚠ {district.lowCount} low</span>
                    )}
                    <span className={isEmpty ? 'text-slate-500' : 'text-slate-400'}>
                        {isEmpty ? 'No camps' : `${district.campCount} ${district.campCount === 1 ? 'camp' : 'camps'} · ${district.itemCount} items`}
                    </span>
                </span>
            </button>

            {isOpen && !isEmpty && (
                <div className="pl-8 pr-4 pb-4 space-y-4">
                    {district.camps.map(camp => <CampBlock key={camp.id} camp={camp} />)}
                </div>
            )}
        </div>
    );
}

function CampBlock({ camp }) {
    return (
        <div className="rounded-lg border border-white/10 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border-b border-white/10">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{camp.name || camp.id.slice(0, 8)}</span>
                {camp.lowCount > 0 && (
                    <span className="text-xs text-danger-400 font-semibold">⚠ {camp.lowCount} low</span>
                )}
                <span className="ml-auto text-xs text-slate-400">{camp.items.length} items</span>
            </div>

            {camp.items.length === 0 ? (
                <p className="px-4 py-3 text-xs text-slate-500">No inventory recorded for this camp yet.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-slate-500 text-xs">
                            <tr>
                                <th className="px-4 py-2 font-medium">Item</th>
                                <th className="px-4 py-2 font-medium">Category</th>
                                <th className="px-4 py-2 font-medium text-right">Stock</th>
                                <th className="px-4 py-2 font-medium">Last Movement</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {camp.items.map(item => (
                                <tr key={`${item.item_name}-${item.category}-${item.unit}`} className={item.low ? 'bg-danger-500/10' : ''}>
                                    <td className="px-4 py-2 text-slate-200">{item.item_name}</td>
                                    <td className="px-4 py-2 capitalize text-slate-400">{item.category}</td>
                                    <td className={`px-4 py-2 text-right font-bold ${item.low ? 'text-danger-400' : 'text-white'}`}>
                                        {item.quantity_on_hand} {item.unit}
                                    </td>
                                    <td className="px-4 py-2 text-slate-500 text-xs">
                                        {item.last_movement_at ? new Date(item.last_movement_at).toLocaleString() : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default AdminInventoryOverview;
