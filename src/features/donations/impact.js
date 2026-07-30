/**
 * Donation impact model.
 *
 * Donors give more when they can see what a specific amount actually buys, so
 * every amount on the form resolves to one concrete statement rather than a
 * generic "thank you". Tiers are expressed in LKR because that is the fund's
 * settlement currency and the only one the form currently offers.
 *
 * These statements describe what the relief fund procures at each level. They
 * are deliberately concrete but not audited financial claims — keep them that
 * way. Do not add percentage breakdowns ("40% to food") unless the programme
 * office publishes them; an invented allocation on a government appeal page
 * would be a fabricated financial claim.
 */

/**
 * Current appeal target, in LKR. Displayed as the denominator of the progress
 * bar on the donations page. Operational setting — change it per appeal.
 */
export const APPEAL_TARGET_LKR = 5_000_000;

/**
 * Indicative conversion used only to pick an impact statement when a donor
 * gives in a non-LKR currency. Display-only: it never touches the amount that
 * is charged, which Stripe processes in the selected currency.
 */
const INDICATIVE_LKR_PER_UNIT = { LKR: 1, USD: 300, EUR: 325, GBP: 380 };

export const toIndicativeLkr = (amount, currency = 'LKR') =>
    (Number(amount) || 0) * (INDICATIVE_LKR_PER_UNIT[currency] ?? 1);

/** Ordered low to high. `resolveImpact` picks the highest tier an amount clears. */
export const IMPACT_TIERS = [
    { min: 500, headline: 'Clean drinking water for a family for three days', unit: 'Water' },
    { min: 1_000, headline: 'Two days of dry rations for a family of four', unit: 'Food' },
    { min: 2_500, headline: 'A full week of dry rations for a family of four', unit: 'Food' },
    { min: 5_000, headline: 'A hygiene and bedding kit for one family in a relief camp', unit: 'Shelter' },
    { min: 10_000, headline: 'A day of medicine and first-aid resupply for a camp clinic', unit: 'Medical' },
    { min: 25_000, headline: 'Tarpaulin and shelter materials for one displaced family', unit: 'Shelter' },
    { min: 50_000, headline: 'A week of hot meals for a 40-person relief camp', unit: 'Food' },
];

/**
 * The single best-matching impact statement for an amount, or null below the
 * lowest tier. One strong statement reads as more credible than a stack of
 * ticks, and it survives translation to a button label.
 */
export function resolveImpact(amount, currency = 'LKR') {
    const lkr = toIndicativeLkr(amount, currency);
    let match = null;
    for (const tier of IMPACT_TIERS) {
        if (lkr >= tier.min) match = tier;
    }
    return match;
}

/**
 * The relief designations a donor can choose on the form. Mirrors the
 * `DONATION_PURPOSES` values so the "where your donation goes" panel describes
 * real fund designations rather than invented ones.
 */
export const FUND_DESIGNATIONS = [
    { label: 'Food & water supplies', detail: 'Dry rations, drinking water and hot meals for displaced families.' },
    { label: 'Medical supplies', detail: 'First-aid stock and medicine for camp clinics and mobile teams.' },
    { label: 'Temporary shelter', detail: 'Tarpaulin, bedding and setup costs for emergency shelter.' },
    { label: 'Relief camp support', detail: 'Sanitation, power and day-to-day running of active camps.' },
];
