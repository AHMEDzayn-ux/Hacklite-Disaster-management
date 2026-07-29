// The 7 fixed resource categories used by inventory_transactions,
// camp_resource_requests and the Resource Allocation Engine.

export type ResourceCategory = 'food' | 'water' | 'medical' | 'shelter' | 'clothing' | 'hygiene' | 'other';

export const RESOURCE_CATEGORIES: ResourceCategory[] = ['food', 'water', 'medical', 'shelter', 'clothing', 'hygiene', 'other'];

export function isResourceCategory(value: unknown): value is ResourceCategory {
    return typeof value === 'string' && (RESOURCE_CATEGORIES as string[]).includes(value);
}

// Units per occupant a camp is assumed to need on hand for its OWN people.
// Used as the floor of the source-camp reserve in the Resource Allocation
// Engine, so a camp that never configured inventory_thresholds still can't be
// stripped bare to fill someone else's request.
//
// These are explicit planning assumptions, not measurements - deliberately
// stated here as tunable constants rather than buried in the solver. They only
// ever make the agent MORE conservative about shipping stock away.
export const PER_OCCUPANT_MINIMUM: Record<ResourceCategory, number> = {
    food: 3,      // ~1 day of rations
    water: 5,     // ~litres for 1 day
    medical: 0.5,
    shelter: 1,   // a mat/blanket per person
    clothing: 1,
    hygiene: 1,
    other: 0.2,
};
