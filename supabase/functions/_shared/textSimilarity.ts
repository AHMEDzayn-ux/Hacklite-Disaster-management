// Cheap, deterministic text-similarity pre-filter for the Duplicate Report
// Detection module. Jaccard similarity over word tokens - no ML/embedding
// dependency needed for the clear-cut cases; only the ambiguous middle band
// escalates to a Gemini yes/no+confidence check (see incident-prioritization
// -agent), keeping API usage low.

export function tokenize(text: string | null | undefined): Set<string> {
    if (!text) return new Set();
    const matches = text.toLowerCase().match(/[a-z0-9]+/g);
    return new Set(matches ?? []);
}

export function jaccardSimilarity(a: string | null | undefined, b: string | null | undefined): number {
    const setA = tokenize(a);
    const setB = tokenize(b);
    if (setA.size === 0 && setB.size === 0) return 0;
    let intersection = 0;
    for (const token of setA) if (setB.has(token)) intersection++;
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
}
