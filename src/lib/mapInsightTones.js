// Shared tone classes so every map-view insight panel's lines look identical.
//
// These sit on a near-white page in light mode, so the fill must be a solid
// -50 tint (a /15 alpha wash of a -500 leaves almost no colour) and the text
// a -800/-900 ink. The old pairing put -300/-700 text on an alpha wash, which
// fell well under 4.5:1 in light mode. A hairline -200 border keeps each line
// legible as its own block without relying on the fill alone.
export const INSIGHT_TONE = {
    info: 'border border-primary-200 bg-primary-50 text-primary-900 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-primary-200',
    warn: 'border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
    danger: 'border border-danger-200 bg-danger-50 text-danger-900 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-200',
    ok: 'border border-success-200 bg-success-50 text-success-900 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-200',
};
