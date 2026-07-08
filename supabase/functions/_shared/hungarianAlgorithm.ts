// Hungarian algorithm (Kuhn-Munkres), O(n^3), for the Volunteer Assignment
// Optimization module: a genuine bipartite assignment-problem solve, not a
// greedy nearest-match heuristic. Standard potential-based implementation
// (the well-known competitive-programming formulation), rectangular matrices
// are padded to square with zero-cost dummy rows/columns which are filtered
// out of the result.

// Sentinel for "this pairing is not allowed" (e.g. volunteer lacks a required
// skill) - a large finite number rather than Infinity, since the algorithm's
// potential updates subtract costs from each other and Infinity - Infinity
// would produce NaN and corrupt the solve.
export const FORBIDDEN_PAIRING_COST = 1e9;

export interface AssignmentResult {
    /** assignment[row] = column index assigned to that row, or -1 if unassigned (padding or forbidden) */
    assignment: number[];
    totalCost: number;
}

/**
 * Solves the assignment problem: given an n x m cost matrix, find the
 * minimum-total-cost one-to-one matching between rows and columns (every row
 * matched to at most one column and vice versa).
 */
export function solveAssignmentProblem(costMatrix: number[][]): AssignmentResult {
    const rows = costMatrix.length;
    if (rows === 0) return { assignment: [], totalCost: 0 };
    const cols = costMatrix[0].length;
    const size = Math.max(rows, cols);

    // Pad to a square matrix with zero-cost dummy entries so the classic
    // square-matrix formulation applies; dummy assignments are stripped out
    // of the final result since they don't correspond to a real row/column.
    const padded: number[][] = [];
    for (let i = 0; i < size; i++) {
        const row: number[] = [];
        for (let j = 0; j < size; j++) {
            row.push(i < rows && j < cols ? costMatrix[i][j] : 0);
        }
        padded.push(row);
    }

    const n = size;
    const INF = Number.POSITIVE_INFINITY;
    const u = new Array(n + 1).fill(0);
    const v = new Array(n + 1).fill(0);
    const p = new Array(n + 1).fill(0); // p[j] = 1-indexed row currently assigned to column j
    const way = new Array(n + 1).fill(0);

    for (let i = 1; i <= n; i++) {
        p[0] = i;
        let j0 = 0;
        const minv = new Array(n + 1).fill(INF);
        const used = new Array(n + 1).fill(false);

        do {
            used[j0] = true;
            const i0 = p[j0];
            let delta = INF;
            let j1 = -1;
            for (let j = 1; j <= n; j++) {
                if (!used[j]) {
                    const cur = padded[i0 - 1][j - 1] - u[i0] - v[j];
                    if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
                    if (minv[j] < delta) { delta = minv[j]; j1 = j; }
                }
            }
            for (let j = 0; j <= n; j++) {
                if (used[j]) { u[p[j]] += delta; v[j] -= delta; }
                else { minv[j] -= delta; }
            }
            j0 = j1;
        } while (p[j0] !== 0);

        do {
            const j1 = way[j0];
            p[j0] = p[j1];
            j0 = j1;
        } while (j0 !== 0);
    }

    const assignment = new Array(rows).fill(-1);
    for (let j = 1; j <= n; j++) {
        const row1Indexed = p[j];
        const row = row1Indexed - 1;
        const col = j - 1;
        if (row < rows && col < cols) {
            // Exclude pairings that only "won" because they were cheaper than
            // a forbidden pairing but are still effectively disallowed.
            if (costMatrix[row][col] < FORBIDDEN_PAIRING_COST) {
                assignment[row] = col;
            }
        }
    }

    let totalCost = 0;
    for (let i = 0; i < rows; i++) {
        if (assignment[i] >= 0) totalCost += costMatrix[i][assignment[i]];
    }

    return { assignment, totalCost };
}
