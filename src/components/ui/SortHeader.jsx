import React from 'react';
import { TH } from '@/components/ui/tableStyles';

/**
 * A sortable column header, driven by the `sort` state and `nextSort` helper in
 * tableStyles. A column is `{ key, label, className?, numeric? }`; `numeric`
 * only decides which direction the column starts in when first clicked.
 *
 * The arrow is rendered on every sortable column and merely hidden when
 * inactive, so clicking through columns doesn't shift the header text sideways.
 */
export default function SortHeader({ column, sort, onSort }) {
    const active = sort.key === column.key;
    return (
        <th
            scope="col"
            className={`${TH} ${column.className || ''}`}
            aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
        >
            <button
                type="button"
                onClick={() => onSort(column.key, column.numeric)}
                className="inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-slate-900 dark:hover:text-white"
            >
                {column.label}
                <span aria-hidden="true" className={active ? '' : 'invisible'}>
                    {sort.dir === 'asc' ? '▲' : '▼'}
                </span>
            </button>
        </th>
    );
}
