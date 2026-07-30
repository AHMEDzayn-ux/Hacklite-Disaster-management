/**
 * Inventory View Kit
 * ==================
 * How inventory values read on screen - badge colours, quantities, relative
 * times, and what a request's plans add up to - shared by every inventory
 * screen, so a camp admin working their own sheet and an admin reading that
 * same camp from the rollup see the same figures phrased the same way.
 *
 * The table chrome itself lives in @/components/ui/tableStyles, shared with the
 * camp admin tables; only what's specific to stock and requests is here.
 */

export const URGENCY_STYLES = {
    low: 'border-slate-300 text-slate-500 dark:border-white/15 dark:text-slate-400',
    normal: 'border-slate-300 text-slate-600 dark:border-white/15 dark:text-slate-300',
    high: 'border-amber-400/60 text-amber-700 dark:border-amber-400/30 dark:text-amber-300',
    critical: 'border-danger-400/60 text-danger-700 dark:border-danger-400/30 dark:text-danger-300',
};

export const REQUEST_STATUS_STYLES = {
    open: 'border-slate-400 text-slate-700 dark:border-white/25 dark:text-slate-200',
    fulfilled: 'border-success-500/60 text-success-700 dark:border-success-400/30 dark:text-success-300',
    cancelled: 'border-slate-300 text-slate-400 dark:border-white/10 dark:text-slate-500',
};

export const hoursSince = (iso) => (iso ? (Date.now() - new Date(iso).getTime()) / 3600000 : Infinity);

export const relativeTime = (iso) => {
    if (!iso) return 'Never';
    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
};

export const timestamp = (iso) => new Date(iso).toLocaleString(undefined, {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
});

/** Stock is held as NUMERIC(10,2) - drop the decimals when there aren't any. */
export const formatQty = (value) => {
    const number = Number(value);
    return Number.isInteger(number) ? String(number) : number.toFixed(2);
};

/**
 * A shipment's stage in the order a camp waiting on it cares about. Kept in
 * lifecycle order so the summary reads back the same way the plan progresses
 * (see allocation_plans.status: pending -> approved -> dispatched -> delivered,
 * with rejected terminal from pending).
 */
const PLAN_STAGES = [
    { status: 'delivered', label: 'delivered' },
    { status: 'dispatched', label: 'on the way' },
    { status: 'approved', label: 'approved' },
    { status: 'pending', label: 'awaiting approval' },
    { status: 'rejected', label: 'declined' },
];

/**
 * What a coordinator has actually done about a request. A request row alone
 * only records the asking; the allocation plans raised against it are what say
 * whether anyone approved it and how far the goods have got, so read the answer
 * off those.
 */
export const reviewState = (request) => {
    const plans = request.plans || [];
    if (plans.length === 0) {
        if (request.status === 'cancelled') return { label: 'Withdrawn before review', detail: '' };
        return { label: 'Awaiting coordinator review', detail: '' };
    }

    const summary = PLAN_STAGES
        .filter(stage => plans.some(p => p.status === stage.status))
        .map(stage => {
            const count = plans.filter(p => p.status === stage.status).length;
            return `${count} ${stage.label}`;
        });

    // Anything a coordinator has committed to is worth naming its source and
    // any note left on delivery; a declined or unreviewed plan has neither.
    const detail = plans
        .filter(p => p.status !== 'pending' && p.status !== 'rejected')
        .map(p => {
            const source = `${formatQty(p.quantity)} ${p.unit} from ${p.from_camp?.name || 'central stores'}`;
            const remark = p.delivery_notes || (p.received_by_name ? `received by ${p.received_by_name}` : '');
            return remark ? `${source} (${remark})` : source;
        })
        .join('; ');

    return { label: summary.join(' · '), detail };
};
