// Shared Sri Lanka district list, mirrored from src/services/campManagementService.js
// (SRI_LANKA_DISTRICTS) so the agent edge functions and the frontend never drift
// apart. Kept as a plain, dependency-free module so it works identically under
// Deno (edge functions) and Node (local unit tests).

export const SRI_LANKA_DISTRICTS = [
    'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
    'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
    'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
    'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
    'Monaragala', 'Ratnapura', 'Kegalle'
];

export const UNCLASSIFIED_DISTRICT = 'Unclassified';

/**
 * Best-effort district match from a free-text address string.
 * Case-insensitive substring match against the known district list.
 * Returns UNCLASSIFIED_DISTRICT rather than null so callers always have a
 * groupable bucket - unmatched rows are surfaced, never silently dropped.
 */
export function matchDistrict(address: string | null | undefined): string {
    if (!address || typeof address !== 'string') return UNCLASSIFIED_DISTRICT;
    const lower = address.toLowerCase();
    for (const district of SRI_LANKA_DISTRICTS) {
        if (lower.includes(district.toLowerCase())) return district;
    }
    return UNCLASSIFIED_DISTRICT;
}
