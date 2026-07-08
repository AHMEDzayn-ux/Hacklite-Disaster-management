// Explainable scoring formulas shared by the Situation Awareness and Incident
// Prioritization agents. Every score is a documented weighted sum of named
// components - never a black-box model output - so an admin (or a judge) can
// see exactly why a number is what it is.

export type Severity = 'low' | 'moderate' | 'high' | 'critical';
export type PeopleAffectedBucket = '0' | '1-10' | '11-50' | '51-100' | '100+';
export type CasualtiesBucket = 'none' | 'minor' | 'serious' | 'fatalities';

const SEVERITY_WEIGHT: Record<Severity, number> = { low: 1, moderate: 2, high: 3, critical: 4 };
const PEOPLE_AFFECTED_WEIGHT: Record<PeopleAffectedBucket, number> = {
    '0': 0, '1-10': 1, '11-50': 2, '51-100': 3, '100+': 4
};
const CASUALTIES_WEIGHT: Record<CasualtiesBucket, number> = {
    none: 0, minor: 1, serious: 2, fatalities: 4
};

function normalize(value: number, max: number): number {
    if (max <= 0) return 0;
    return Math.min(Math.max(value / max, 0), 1);
}

/**
 * Damage Index (0-100): reactive measure of "how bad is this report right now".
 * Composite of severity, people affected, and casualties - all fields already
 * collected on every disaster report today, so this requires no new input
 * from reporters.
 */
export function computeDamageIndex(params: {
    severity?: Severity | null;
    peopleAffected?: PeopleAffectedBucket | null;
    casualties?: CasualtiesBucket | null;
}): { damageIndex: number; components: Record<string, number> } {
    const severityComponent = normalize(SEVERITY_WEIGHT[params.severity ?? 'moderate'] ?? 2, 4);
    const peopleComponent = normalize(PEOPLE_AFFECTED_WEIGHT[params.peopleAffected ?? '0'] ?? 0, 4);
    const casualtiesComponent = normalize(CASUALTIES_WEIGHT[params.casualties ?? 'none'] ?? 0, 4);

    const WEIGHTS = { severity: 0.5, peopleAffected: 0.25, casualties: 0.25 };
    const damageIndex = 100 * (
        WEIGHTS.severity * severityComponent +
        WEIGHTS.peopleAffected * peopleComponent +
        WEIGHTS.casualties * casualtiesComponent
    );

    return {
        damageIndex: Math.round(damageIndex * 100) / 100,
        components: { severityComponent, peopleComponent, casualtiesComponent, weights: WEIGHTS as any }
    };
}

/**
 * Risk Score (0-100): predictive measure of "is this district's situation
 * escalating", distinct from damage index's reactive snapshot. Driven by the
 * *velocity* of new active reports (a rising rate is an early-warning signal,
 * same principle real disaster/epidemic surveillance systems use) and by
 * shrinking camp-capacity headroom. A district can have a flat damage index
 * but a rising risk score if reports are accelerating.
 */
export function computeRiskScore(params: {
    reportsLast1h: number;
    reportsLast6h: number;
    reportsLast24h: number;
    campOccupancyPct: number | null; // 0-100+, null if no camps in district
}): { riskScore: number; riskTrend: 'rising' | 'stable' | 'falling'; components: Record<string, number> } {
    // Velocity component: compare the most recent 1h rate to the trailing
    // 24h average hourly rate. > 1 means accelerating.
    const avgHourlyRate24h = params.reportsLast24h / 24;
    const recentHourlyRate = params.reportsLast1h;
    const velocityRatio = avgHourlyRate24h > 0 ? recentHourlyRate / avgHourlyRate24h : (recentHourlyRate > 0 ? 2 : 0);
    const velocityComponent = normalize(velocityRatio, 2); // cap at 2x average = fully saturated

    // Short-window pressure: raw count of very recent reports, capped.
    const shortWindowComponent = normalize(params.reportsLast6h, 10);

    // Capacity headroom: less headroom = more risk. No camps = no data, treat
    // as neutral (0.5) rather than falsely reading as "no risk".
    const occupancyComponent = params.campOccupancyPct == null
        ? 0.5
        : normalize(params.campOccupancyPct, 100);

    const WEIGHTS = { velocity: 0.45, shortWindow: 0.30, occupancy: 0.25 };
    const riskScore = 100 * (
        WEIGHTS.velocity * velocityComponent +
        WEIGHTS.shortWindow * shortWindowComponent +
        WEIGHTS.occupancy * occupancyComponent
    );

    const riskTrend: 'rising' | 'stable' | 'falling' =
        velocityRatio > 1.2 ? 'rising' : velocityRatio < 0.8 ? 'falling' : 'stable';

    return {
        riskScore: Math.round(riskScore * 100) / 100,
        riskTrend,
        components: { velocityComponent, shortWindowComponent, occupancyComponent, velocityRatio, weights: WEIGHTS as any }
    };
}

/**
 * Incident Priority Score (0-100): EMD-style (Emergency Medical Dispatch)
 * triage ranking for the active-report queue. The aging component is
 * deliberate: without it, an old unaddressed report silently sinks below
 * newer, more dramatic-sounding ones - a real failure mode in triage systems
 * that queueing-theory-aware dispatch protocols explicitly correct for.
 */
export function computePriorityScore(params: {
    severity?: Severity | null;
    casualties?: CasualtiesBucket | null;
    peopleAffected?: PeopleAffectedBucket | null;
    hoursSinceReport: number;
    nearestCampAvailabilityPct: number | null; // 0-100, headroom % at nearest camp; null if none nearby
}): { priorityScore: number; components: Record<string, number> } {
    const severityComponent = normalize(SEVERITY_WEIGHT[params.severity ?? 'moderate'] ?? 2, 4);
    const casualtiesComponent = normalize(CASUALTIES_WEIGHT[params.casualties ?? 'none'] ?? 0, 4);
    const peopleAffectedComponent = normalize(PEOPLE_AFFECTED_WEIGHT[params.peopleAffected ?? '0'] ?? 0, 4);
    // Aging factor saturates at 24h - beyond a day unaddressed, it's already
    // at maximum urgency contribution from age alone.
    const agingComponent = normalize(params.hoursSinceReport, 24);
    // Capacity pressure: low headroom nearby = higher priority to act now,
    // before the nearest resource is exhausted. No nearby camp = neutral.
    const capacityPressureComponent = params.nearestCampAvailabilityPct == null
        ? 0.5
        : 1 - normalize(params.nearestCampAvailabilityPct, 100);

    const WEIGHTS = {
        severity: 0.30, casualties: 0.25, peopleAffected: 0.15, aging: 0.15, capacityPressure: 0.15
    };
    const priorityScore = 100 * (
        WEIGHTS.severity * severityComponent +
        WEIGHTS.casualties * casualtiesComponent +
        WEIGHTS.peopleAffected * peopleAffectedComponent +
        WEIGHTS.aging * agingComponent +
        WEIGHTS.capacityPressure * capacityPressureComponent
    );

    return {
        priorityScore: Math.round(priorityScore * 100) / 100,
        components: {
            severityComponent, casualtiesComponent, peopleAffectedComponent,
            agingComponent, capacityPressureComponent, weights: WEIGHTS as any
        }
    };
}

/**
 * Camp/district shortage score (0-100) for the Resource Allocation Engine's
 * demand-side ranking (which locations need attention most) - separate from
 * the LP solve itself, which decides *how much of what* moves *where*.
 */
export function computeShortageScore(params: {
    occupancyRatio: number; // current_occupancy / capacity, unclamped
    needsCount: number; // camps.needs.length
    maxNeedsCategories: number; // 14, from NEEDS_OPTIONS
    nearbySeverityWeightSum: number; // sum of SEVERITY_WEIGHT for active disasters in district
}): { shortageScore: number; severityLevel: 'ok' | 'warning' | 'critical'; components: Record<string, number> } {
    const occupancyComponent = normalize(params.occupancyRatio, 1);
    const needsComponent = normalize(params.needsCount, params.maxNeedsCategories);
    const severityComponent = normalize(params.nearbySeverityWeightSum, 40);

    const WEIGHTS = { occupancy: 0.5, needs: 0.3, severity: 0.2 };
    const shortageScore = 100 * (
        WEIGHTS.occupancy * occupancyComponent +
        WEIGHTS.needs * needsComponent +
        WEIGHTS.severity * severityComponent
    );

    const severityLevel: 'ok' | 'warning' | 'critical' =
        shortageScore >= 70 ? 'critical' : shortageScore >= 40 ? 'warning' : 'ok';

    return {
        shortageScore: Math.round(shortageScore * 100) / 100,
        severityLevel,
        components: { occupancyComponent, needsComponent, severityComponent, weights: WEIGHTS as any }
    };
}
