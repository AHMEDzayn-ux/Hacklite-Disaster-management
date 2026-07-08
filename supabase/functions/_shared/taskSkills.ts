// Infers which volunteer skill(s) a disaster report's stated needs call for,
// from the boolean needs jsonb already collected on every disaster report
// today ({rescue, medical, shelter, food, water, evacuation}). No new input
// required from reporters - reuses existing data, same philosophy as the
// Damage Index.

export function inferRequiredSkills(needs: Record<string, boolean> | null | undefined): string[] {
    const skills = new Set<string>();
    if (!needs) return [];
    if (needs.rescue || needs.evacuation) skills.add('rescue');
    if (needs.medical) skills.add('medical');
    if (needs.shelter || needs.food || needs.water) skills.add('logistics');
    return Array.from(skills);
}

export function hasMatchingSkill(volunteerSkills: string[] | null | undefined, requiredSkills: string[]): boolean {
    if (requiredSkills.length === 0) return true;
    if (!volunteerSkills || volunteerSkills.length === 0) return false;
    const lowerVolunteerSkills = new Set(volunteerSkills.map(s => s.toLowerCase()));
    return requiredSkills.some(skill => lowerVolunteerSkills.has(skill.toLowerCase()));
}
