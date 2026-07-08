// Multi-stop route optimization for the Route Optimization agent: nearest-
// neighbor construction followed by 2-opt local search improvement - the
// standard textbook combinatorial-optimization approach to the Traveling
// Salesman Problem. Operates on a precomputed distance/duration matrix (in
// production, from OSRM's /table service over real road-network distances,
// not straight-line Haversine) so the algorithm itself has no dependency on
// how the matrix was built.
//
// Modeled as a closed tour (the relief vehicle returns to its starting camp),
// which matches the real scenario of a truck returning to a depot/warehouse
// to reload.

export interface TspResult {
    /** Visiting order as indices into the original matrix, starting and ending at startIndex */
    order: number[];
    totalDistance: number;
    method: 'nearest_neighbor' | 'nearest_neighbor_2opt';
}

function tourDistance(order: number[], matrix: number[][]): number {
    let total = 0;
    for (let i = 0; i < order.length - 1; i++) {
        total += matrix[order[i]][order[i + 1]];
    }
    return total;
}

function nearestNeighborTour(matrix: number[][], startIndex: number): number[] {
    const n = matrix.length;
    const visited = new Array(n).fill(false);
    const order = [startIndex];
    visited[startIndex] = true;

    let current = startIndex;
    for (let step = 1; step < n; step++) {
        let best = -1;
        let bestDist = Infinity;
        for (let j = 0; j < n; j++) {
            if (!visited[j] && matrix[current][j] < bestDist) {
                bestDist = matrix[current][j];
                best = j;
            }
        }
        order.push(best);
        visited[best] = true;
        current = best;
    }
    order.push(startIndex); // close the tour
    return order;
}

/**
 * 2-opt improvement: repeatedly reverse a segment of the tour if doing so
 * shortens total distance, until no single reversal helps (a local optimum).
 * Reliably improves nearest-neighbor tours by roughly 5-15% in practice.
 */
function twoOptImprove(order: number[], matrix: number[][], maxIterations = 1000): number[] {
    const n = order.length;
    let improved = true;
    let iterations = 0;

    while (improved && iterations < maxIterations) {
        improved = false;
        iterations++;
        // i, j range over the interior (positions 1..n-2) so the fixed
        // start/end point (position 0 and n-1, both startIndex) is untouched.
        for (let i = 1; i < n - 2; i++) {
            for (let j = i + 1; j < n - 1; j++) {
                const a = order[i - 1], b = order[i];
                const c = order[j], d = order[j + 1];
                const currentCost = matrix[a][b] + matrix[c][d];
                const swappedCost = matrix[a][c] + matrix[b][d];
                if (swappedCost < currentCost - 1e-9) {
                    // Reverse the segment between i and j (inclusive)
                    let left = i, right = j;
                    while (left < right) {
                        const tmp = order[left];
                        order[left] = order[right];
                        order[right] = tmp;
                        left++;
                        right--;
                    }
                    improved = true;
                }
            }
        }
    }
    return order;
}

export function solveTSP(matrix: number[][], startIndex = 0): TspResult {
    const n = matrix.length;
    if (n <= 1) return { order: matrix.length === 1 ? [0, 0] : [], totalDistance: 0, method: 'nearest_neighbor' };
    if (n === 2) {
        return { order: [startIndex, 1 - startIndex, startIndex], totalDistance: 2 * matrix[0][1], method: 'nearest_neighbor' };
    }

    const nnTour = nearestNeighborTour(matrix, startIndex);
    const nnDistance = tourDistance(nnTour, matrix);

    const improvedTour = twoOptImprove([...nnTour], matrix);
    const improvedDistance = tourDistance(improvedTour, matrix);

    if (improvedDistance < nnDistance) {
        return { order: improvedTour, totalDistance: improvedDistance, method: 'nearest_neighbor_2opt' };
    }
    return { order: nnTour, totalDistance: nnDistance, method: 'nearest_neighbor' };
}
