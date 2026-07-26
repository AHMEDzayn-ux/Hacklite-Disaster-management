/**
 * Sri Lanka administrative geography
 * ==================================
 * Source of truth for the 9 provinces / 25 districts. `mapConfig.allDistricts`
 * re-exports from here so the two lists cannot drift apart.
 *
 * Camp districts are free text in the DB, so never index this map directly with
 * a raw `camp.district` - go through `resolveProvince()`, which normalizes case
 * and whitespace and falls back to UNKNOWN_PROVINCE instead of dropping the row.
 */

export const PROVINCES = [
    { name: 'Western Province', districts: ['Colombo', 'Gampaha', 'Kalutara'] },
    { name: 'Central Province', districts: ['Kandy', 'Matale', 'Nuwara Eliya'] },
    { name: 'Southern Province', districts: ['Galle', 'Matara', 'Hambantota'] },
    { name: 'Northern Province', districts: ['Jaffna', 'Kilinochchi', 'Mannar', 'Mullaitivu', 'Vavuniya'] },
    { name: 'Eastern Province', districts: ['Batticaloa', 'Ampara', 'Trincomalee'] },
    { name: 'North Western Province', districts: ['Kurunegala', 'Puttalam'] },
    { name: 'North Central Province', districts: ['Anuradhapura', 'Polonnaruwa'] },
    { name: 'Uva Province', districts: ['Badulla', 'Monaragala'] },
    { name: 'Sabaragamuwa Province', districts: ['Ratnapura', 'Kegalle'] },
];

/** Bucket for camps whose district is null, misspelled, or not a real district. */
export const UNKNOWN_PROVINCE = 'Unknown / Unassigned';

/** Flat district -> province lookup, derived so it can never fall out of sync. */
export const districtToProvince = Object.fromEntries(
    PROVINCES.flatMap(p => p.districts.map(d => [d, p.name]))
);

export const ALL_DISTRICTS = PROVINCES.flatMap(p => p.districts);

// Normalized ("ratnapura" -> "Ratnapura") so free-text DB values still match.
const canonicalDistrict = Object.fromEntries(
    ALL_DISTRICTS.map(d => [d.toLowerCase().replace(/\s+/g, ' ').trim(), d])
);

/**
 * Map a raw DB district string to its canonical name, or null if unrecognized.
 */
export const resolveDistrict = (raw) => {
    if (!raw || typeof raw !== 'string') return null;
    return canonicalDistrict[raw.toLowerCase().replace(/\s+/g, ' ').trim()] ?? null;
};

/**
 * Map a raw DB district string to its province, or UNKNOWN_PROVINCE if it does
 * not resolve. Never returns undefined - an unmatched camp must still surface.
 */
export const resolveProvince = (raw) => {
    const district = resolveDistrict(raw);
    return district ? districtToProvince[district] : UNKNOWN_PROVINCE;
};
