// Infers which volunteer skill(s) a task calls for, and whether the task is
// hazardous enough that only volunteers with a hazard-capable skill may be
// paired with it. Shared by the volunteer-assignment-agent (coordinator-run
// optimizer) and the volunteer-self-service suggestion endpoint (volunteer
// pull) so the same safety guarantee applies regardless of which path
// created the assignment: a volunteer who only selected e.g. counseling or
// house_clearing must never be paired with a hazardous case, even if some
// other required-skill check would otherwise allow it.

export const VOLUNTEER_SKILL_TAGS = [
    'rescue', 'medical', 'logistics', 'driving', 'first_aid',
    'construction', 'counseling', 'missing_person_search',
    'house_clearing', 'boat_service',
] as const;

// Skills trusted for physically hazardous frontline work (flood/fire rescue,
// dangerous-animal handling, searching hazardous terrain). Deliberately
// narrow - a volunteer needs one of these specifically, not just any skill
// overlap, before a hazardous task is ever shown or auto-proposed to them.
const HAZARD_CAPABLE_SKILLS = new Set(['rescue', 'medical', 'boat_service']);

const RISK_KEYWORDS = [
    'flood', 'river', 'forest', 'jungle', 'cliff', 'landslide', 'storm',
    'cyclone', 'night', 'mountain', 'ocean', 'sea', 'rapids', 'collapsed',
    'debris', 'fire', 'submerg',
];

function ownedSkills(volunteerSkills: string[] | null | undefined): Set<string> {
    return new Set((volunteerSkills || []).map(s => String(s).toLowerCase()));
}

export function hasMatchingSkill(volunteerSkills: string[] | null | undefined, requiredSkills: string[]): boolean {
    if (requiredSkills.length === 0) return true;
    if (!volunteerSkills || volunteerSkills.length === 0) return false;
    const owned = ownedSkills(volunteerSkills);
    return requiredSkills.some(skill => owned.has(skill.toLowerCase()));
}

export function hasHazardCapableSkill(volunteerSkills: string[] | null | undefined): boolean {
    const owned = ownedSkills(volunteerSkills);
    for (const s of HAZARD_CAPABLE_SKILLS) if (owned.has(s)) return true;
    return false;
}

/**
 * The single safety gate every assignment path must pass through: the
 * volunteer needs a relevant skill AND, if the task is hazardous, a
 * hazard-capable one - checked independently so loosening the required-skill
 * list later can never silently let an unqualified volunteer into hazardous
 * work.
 */
export function isSafeToAssign(volunteerSkills: string[] | null | undefined, requiredSkills: string[], hazardous: boolean): boolean {
    if (!hasMatchingSkill(volunteerSkills, requiredSkills)) return false;
    if (hazardous && !hasHazardCapableSkill(volunteerSkills)) return false;
    return true;
}

// ---- Disasters (needs jsonb already collected on every report: {rescue,
// medical, shelter, food, water, evacuation}) ----

export function inferDisasterRequiredSkills(needs: Record<string, boolean> | null | undefined): string[] {
    const skills = new Set<string>();
    if (!needs) return [];
    if (needs.rescue || needs.evacuation) { skills.add('rescue'); skills.add('boat_service'); }
    if (needs.medical) skills.add('medical');
    if (needs.shelter || needs.food || needs.water) { skills.add('logistics'); skills.add('house_clearing'); }
    return Array.from(skills);
}

export function isDisasterHazardous(disaster: { severity?: string | null; needs?: Record<string, boolean> | null }): boolean {
    const sev = String(disaster.severity || '').toLowerCase();
    if (sev === 'critical' || sev === 'high') return true;
    if (disaster.needs && (disaster.needs.rescue || disaster.needs.evacuation)) return true;
    return false;
}

// Back-compat alias for the existing volunteer-assignment-agent import name.
export const inferRequiredSkills = inferDisasterRequiredSkills;

// ---- Missing persons (no dedicated hazard flag - infer from free text
// using the same keyword-scan convention used elsewhere in this codebase) ----

function missingPersonText(person: { description?: string | null; additional_info?: string | null }): string {
    return `${person.description || ''} ${person.additional_info || ''}`.toLowerCase();
}

export function isMissingPersonHazardous(person: { description?: string | null; additional_info?: string | null }): boolean {
    const text = missingPersonText(person);
    return RISK_KEYWORDS.some(k => text.includes(k));
}

export function inferMissingPersonRequiredSkills(person: { description?: string | null; additional_info?: string | null }): string[] {
    return isMissingPersonHazardous(person) ? ['rescue'] : ['missing_person_search', 'rescue'];
}

// ---- Animal rescues (is_dangerous is an explicit reporter-set flag - the
// most reliable hazard signal we have, so it always wins) ----

export function isAnimalRescueHazardous(animal: { is_dangerous?: boolean | null; condition?: string | null }): boolean {
    if (animal.is_dangerous) return true;
    const cond = String(animal.condition || '').toLowerCase();
    return cond.includes('aggress') || cond.includes('critical');
}

export function inferAnimalRescueRequiredSkills(): string[] {
    return ['rescue'];
}
