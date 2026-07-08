// Bridges the two resource vocabularies already in the codebase:
//  - camps.needs is a TEXT[] of free-text tags from NEEDS_OPTIONS
//    (src/services/campManagementService.js) - the pre-existing, coarse signal.
//  - inventory_transactions.category is one of 7 fixed categories - the new,
//    precise signal from the ledger.
// The Resource Allocation Engine prefers real ledger data (via
// camp_inventory_levels) and only falls back to the legacy tag heuristic for
// camps that haven't started using the inventory system yet - documented
// explicitly as an interim measure, not a permanent design.

export type ResourceCategory = 'food' | 'water' | 'medical' | 'shelter' | 'clothing' | 'hygiene' | 'other';

export const RESOURCE_CATEGORIES: ResourceCategory[] = ['food', 'water', 'medical', 'shelter', 'clothing', 'hygiene', 'other'];

const NEEDS_TAG_TO_CATEGORY: Record<string, ResourceCategory> = {
    'Food': 'food',
    'Drinking Water': 'water',
    'Medical Supplies': 'medical',
    'Medicines': 'medical',
    'First Aid Kits': 'medical',
    'Blankets': 'shelter',
    'Tents': 'shelter',
    'Mattresses': 'shelter',
    'Clothing': 'clothing',
    'Hygiene Items': 'hygiene',
    'Baby Products': 'hygiene',
    'Wheelchairs': 'other',
    'Generators': 'other',
    // 'Volunteers' intentionally omitted - not a shippable resource category.
};

/** Maps a camp's legacy needs tag array to the set of resource categories it implies. */
export function legacyNeedsToCategories(needs: string[] | null | undefined): Set<ResourceCategory> {
    const categories = new Set<ResourceCategory>();
    for (const tag of needs ?? []) {
        const category = NEEDS_TAG_TO_CATEGORY[tag];
        if (category) categories.add(category);
    }
    return categories;
}
