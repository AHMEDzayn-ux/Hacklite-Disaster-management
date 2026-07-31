/**
 * Admin Table Kit
 * ===============
 * The chrome every admin data table is built from - panel, sticky header cells,
 * row cells, the small controls that sit in a panel header - plus the sorting
 * behaviour those headers need. The clickable column header that drives that
 * sorting is a component, so it lives next door in SortHeader.jsx.
 *
 * Kept in one place because these screens are read side by side: an operator
 * moving from the camp list to the inventory rollup should be reading the same
 * table with different columns, not two tables that happen to resemble each
 * other. Anything domain-specific (badge colours for a status, how a quantity
 * formats) belongs with its feature, not here.
 *
 * The panel is a fixed-height flex column whose body scrolls: put it inside a
 * viewport-sized parent and the filters and column headers stay put while the
 * rows move, instead of the whole page scrolling away from the controls.
 */

export const PANEL = 'flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]';
export const PANEL_HEAD = 'flex flex-none flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-2.5 dark:border-white/10';
export const PANEL_FOOT = 'flex flex-none flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400';
export const TH = 'bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400';
export const TD = 'px-3 py-2 align-middle border-t border-slate-200 dark:border-white/10';
export const CELL_INPUT = 'w-24 rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:border-white/20 dark:bg-white/5 dark:text-white';
export const BTN = 'rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10';
export const BTN_SOLID = 'rounded-md border border-slate-900 bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-50 dark:border-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200';
export const BTN_DANGER = 'rounded-md border border-danger-300 px-2 py-1 text-xs font-medium text-danger-700 transition-colors hover:bg-danger-50 disabled:opacity-40 dark:border-danger-400/30 dark:text-danger-300 dark:hover:bg-danger-500/10';
export const SELECT_SM = 'rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-slate-500 focus:outline-none dark:border-white/20 dark:bg-white/5 dark:text-slate-200';
export const INPUT_SM = 'rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none dark:border-white/20 dark:bg-white/5 dark:text-slate-200 dark:placeholder:text-slate-500';

/** Neutral pill for a count or a label sitting next to a heading. */
export const PILL = 'rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide';

/**
 * A filter chip row - the segmented "all / active / closed" control. Active
 * reads as selected rather than as a call to action, so the primary button in
 * the same header stays the only thing competing for a click.
 */
export const chip = (active) => (active
    ? 'rounded-md border border-slate-900 bg-slate-900 px-2.5 py-1 text-xs font-semibold capitalize text-white dark:border-white dark:bg-white dark:text-slate-900'
    : 'rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium capitalize text-slate-600 transition-colors hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10');

/**
 * Compare two cell values of any sortable type. Missing values sort lowest
 * rather than unranked, so a camp that has never been counted lands at one end
 * of the column instead of wherever the sort happens to leave it.
 */
const compareValues = (a, b) => {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b));
};

/**
 * Sort rows by the active column. Dates should be pre-flattened to a numeric
 * field on the row - a column sorts by whatever `sort.key` names, and comparing
 * date strings would order them alphabetically.
 *
 * `tiebreakKey` settles equal values so a row keeps its place across reloads
 * and re-sorts; without it, ties shuffle on every render.
 */
export const sortRows = (rows, sort, tiebreakKey) => [...rows].sort((a, b) => {
    const result = compareValues(a[sort.key], b[sort.key]);
    if (result !== 0) return sort.dir === 'asc' ? result : -result;
    return tiebreakKey ? compareValues(a[tiebreakKey], b[tiebreakKey]) : 0;
});

/**
 * Next state for a clicked column header: same column flips direction, a new
 * column starts in the direction that column reads best - text A-Z, counts and
 * dates largest/newest first, since that is the end worth looking at.
 */
export const nextSort = (prev, key, numeric) => (prev.key === key
    ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
    : { key, dir: numeric ? 'desc' : 'asc' });
