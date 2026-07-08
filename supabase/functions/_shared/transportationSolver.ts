// Transportation-problem solver for the AI Resource Allocation Engine, using
// Vogel's Approximation Method (VAM) - a standard Operations Research
// technique for the supply/demand allocation problem: minimize total
// distance-weighted transport of a resource from surplus locations to
// shortage locations, subject to supply and demand constraints.
//
// VAM produces a strong feasible solution (frequently optimal, always a good
// approximation) without requiring a general-purpose LP solver dependency -
// deliberately chosen so this runs with zero external packages inside a Deno
// edge function. It does not run a stepping-stone/MODI optimality pass on
// top, so it is an approximation method, not a certified-optimal simplex
// solve - documented here rather than overclaimed.

export interface TransportationResult {
    /** allocation[i][j] = quantity shipped from supply node i to demand node j (excludes any dummy node) */
    allocation: number[][];
    totalCost: number;
    /** true if a dummy supply/demand node was added because totals didn't balance */
    wasUnbalanced: boolean;
    /** total demand left unmet because total supply was insufficient (0 if supply covered demand) */
    unmetDemand: number;
}

/**
 * Solves min-cost transportation: given supply quantities, demand quantities,
 * and a cost[i][j] matrix (e.g. distance in km from supply i to demand j),
 * find how much to ship from each supply node to each demand node.
 *
 * If totals don't balance, a zero-cost dummy node absorbs the surplus (a
 * dummy demand node if supply > demand: representing unused surplus, or a
 * dummy supply node if demand > supply: representing real unmet demand,
 * reported separately via `unmetDemand` rather than silently hidden in the
 * allocation matrix).
 */
export function solveTransportationProblem(
    supply: number[],
    demand: number[],
    cost: number[][]
): TransportationResult {
    const supplyTotal = supply.reduce((a, b) => a + b, 0);
    const demandTotal = demand.reduce((a, b) => a + b, 0);

    const remSupply = [...supply];
    const remDemand = [...demand];
    let costMatrix = cost.map(row => [...row]);
    let wasUnbalanced = false;
    let unmetDemand = 0;

    if (supplyTotal < demandTotal) {
        wasUnbalanced = true;
        unmetDemand = demandTotal - supplyTotal;
        remSupply.push(unmetDemand);
        costMatrix.push(new Array(demand.length).fill(0));
    } else if (demandTotal < supplyTotal) {
        wasUnbalanced = true;
        remDemand.push(supplyTotal - demandTotal);
        for (const row of costMatrix) row.push(0);
    }

    const rows = remSupply.length;
    const cols = remDemand.length;
    const allocation: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
    const rowActive = new Array(rows).fill(true);
    const colActive = new Array(cols).fill(true);

    const remainingCells = () => remSupply.filter((s, i) => rowActive[i] && s > 1e-9).length +
        remDemand.filter((d, j) => colActive[j] && d > 1e-9).length;

    let safety = rows * cols + 10;
    while (safety-- > 0) {
        const activeRows = [...Array(rows).keys()].filter(i => rowActive[i] && remSupply[i] > 1e-9);
        const activeCols = [...Array(cols).keys()].filter(j => colActive[j] && remDemand[j] > 1e-9);
        if (activeRows.length === 0 || activeCols.length === 0) break;

        // Compute penalties: for each active row/column, the gap between the
        // two cheapest available cells - the core VAM heuristic (the row/col
        // with the biggest "cost of not choosing the cheapest option" is
        // served first, since delaying it is riskiest).
        let bestPenalty = -1;
        let bestIsRow = true;
        let bestIndex = -1;

        for (const i of activeRows) {
            const costs = activeCols.map(j => costMatrix[i][j]).sort((a, b) => a - b);
            const penalty = costs.length >= 2 ? costs[1] - costs[0] : costs[0];
            if (penalty > bestPenalty) { bestPenalty = penalty; bestIsRow = true; bestIndex = i; }
        }
        for (const j of activeCols) {
            const costs = activeRows.map(i => costMatrix[i][j]).sort((a, b) => a - b);
            const penalty = costs.length >= 2 ? costs[1] - costs[0] : costs[0];
            if (penalty > bestPenalty) { bestPenalty = penalty; bestIsRow = false; bestIndex = j; }
        }

        // Within the selected row/column, allocate to the cheapest available cell.
        let selI = -1, selJ = -1, selCost = Infinity;
        if (bestIsRow) {
            const i = bestIndex;
            for (const j of activeCols) {
                if (costMatrix[i][j] < selCost) { selCost = costMatrix[i][j]; selI = i; selJ = j; }
            }
        } else {
            const j = bestIndex;
            for (const i of activeRows) {
                if (costMatrix[i][j] < selCost) { selCost = costMatrix[i][j]; selI = i; selJ = j; }
            }
        }

        const qty = Math.min(remSupply[selI], remDemand[selJ]);
        allocation[selI][selJ] += qty;
        remSupply[selI] -= qty;
        remDemand[selJ] -= qty;

        if (remSupply[selI] <= 1e-9) rowActive[selI] = false;
        if (remDemand[selJ] <= 1e-9) colActive[selJ] = false;

        if (remainingCells() === 0) break;
    }

    // Strip the dummy row/column back out of the returned allocation matrix -
    // callers only care about real supply-to-demand shipments.
    const realRows = supply.length;
    const realCols = demand.length;
    const realAllocation = allocation.slice(0, realRows).map(row => row.slice(0, realCols));

    let totalCost = 0;
    for (let i = 0; i < realRows; i++) {
        for (let j = 0; j < realCols; j++) {
            totalCost += realAllocation[i][j] * cost[i][j];
        }
    }

    return { allocation: realAllocation, totalCost, wasUnbalanced, unmetDemand };
}
