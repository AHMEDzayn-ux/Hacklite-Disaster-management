import React from 'react';
import { CATEGORY_LABELS } from '@/features/inventory/services/inventoryService';

/**
 * Canonical item picker, grouped by category.
 *
 * Item names are deliberately NOT free text anywhere in the inventory system:
 * the allocation agent matches supply to requests on item_id, so a camp that
 * invented its own spelling ("Rice Bags" vs "Rice") would make its stock
 * invisible to every other camp's request. Picking from the shared catalog is
 * what guarantees two camps referring to the same thing actually match.
 */
function ItemSelect({ catalog, value, onChange, className, placeholder = 'Select an item...' }) {
    const byCategory = catalog.reduce((groups, item) => {
        (groups[item.category] = groups[item.category] || []).push(item);
        return groups;
    }, {});

    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={className || 'input-field'}
        >
            <option value="" className="text-slate-900">{placeholder}</option>
            {Object.entries(byCategory).map(([category, items]) => (
                <optgroup key={category} label={CATEGORY_LABELS[category] || category}>
                    {items.map(item => (
                        <option key={item.id} value={item.id} className="text-slate-900">
                            {item.name} ({item.default_unit})
                        </option>
                    ))}
                </optgroup>
            ))}
        </select>
    );
}

export default ItemSelect;
