/**
 * Created Nov. 2022 by @clarkok, converted to JS by ChatGPT
 *
 * Finding the minimum weighted rampart locations for the game Screeps, with the altered Edmonds–Karp algorithm.
 *
 * Other implementations typically find the min-cut on the edges between tiles, and then find the tiles around those
 * edges to form the final result. This is guaranteed to give a cut between safe spots and the exits, but there can be
 * edge cases where the non-optimal results can be returned.
 *
 * This implementation, on the other hand, converts the problem to find the cut on the tiles themselves, so it is
 * guaranteed to return the optimal result. And during the problem-conversion, there is a opportunity to support the
 * features to allow tiles have different weights, which is useful to model the construction cost.
 *
 * So how do we convert the tile-cut problem to a edge-cut one?
 *
 * The idea is for each tile, we split it into a s-node and a d-node, and connect them with an edge whose initial
 * capacity is the weight of that tile. And for each edge connecting two tiles A and B, we add an edge from A's d-node
 * to B's s-node, and A's s-node to B's d-node, with initial capacities of both being infinity.
 *
 * Then we run the traditional min-cut algorithm on the graph, and the cut will always select the edges connecting
 * the s-node and d-node of the same tile. After we get the edge-cut solution, we can go find those tiles whose
 * internal edges are all selected, and those are the tiles we want.
 *
 * In the implementation, we are operating on a graph of course, however we don't have a clear node representation.
 * Instead, we are using a 13-bit integer to represent a node, and using the `capacityMap` below to describe the
 * connections between nodes.
 *
 * The 13-bit integer is composed of 12-bit index and 1-bit flag, where the lower 12 bits encodes the location of the
 * tile, and the highest bit indicates whether it is a s-node or a d-node. Note that the so-called s-node and d-node
 * are just names, they are regular nodes in the graph, and makes no difference to the min-cut algorithm itself. We
 * are differentiating them only because we want to find the cut on the tiles, and not on the edges.
 *
 * The capacityMap, on the other hand, records the current capacity of all the edges in the graph. The key of the map
 * is a 17-bit integer, encoding the source of the edge and the direction. The destination of the edge can be then
 * calculated. The lower 13-bit of the integer is the source node id as described above, and the highest 4-bit is the
 * direction. 0-7 are the 8 directions to the 8 surrounding tiles, and 8 is the direction from a s-node to its
 * corresponding d-node or vice versa.
 *
 * The capacity of an edge is the amount of flow that can be pushed through it. The capacity of an edge is always
 * non-negative. When the capacity of an edge is 0, it means the edge is saturated, and no more flow can be pushed
 * through it, so the bfs from the sources to the sinks will not traverse it.
 *
 * Besides the capacityMap, we also maintain a last[] array during the bfs rounds. The key being a node id, the value
 * being the last node id on the path from the source to the node, and the direction from the last node to the node.
 * This is used to trace back the path from the sink to the source, and find the edges on the path. -2 in the array
 * means the node is not yet visited, and -1 means the node is one of the sources.
 *
 * So the overall algorithm is simple:
 *
 * Let maxFlow = 0
 * Repeat:
 *   Run a bfs in the graph to find a path from the sources to the sinks.
 *   If non-path can be found, break the loop.
 *   Otherwise, find the minimum capacity C in the path, and for each edge in the path:
 *     Reduce the capacity of the edge by C
 *     Increase the capacity of the reverse edge by C
 *   maxFlow += C
 * // Now the maxFlow has been calculated, and the capacityMap altered
 * Run a tile-based bfs on the costMap from the sources, and find all the tiles where the capacity from s-node to
 * d-node is 0, and those are the tiles we want.
 *
 * We also introduced some optimization to reuse bfs result, especially the last[] array to reduce the work of
 * each round of bfs. See the comments in the code for details.
 */



class Int32Queue {
    constructor(capacity) {
        this.q = new Int32Array(capacity);
        this.h = this.t = 0;
    }

    reset(arr) {
        this.q.set(arr);
        this.h = 0;
        this.t = arr.length;
    }

    push(v) {
        this.q[this.t] = v;
        this.t = (this.t + 1) % this.q.length;
    }

    shift() {
        const v = this.q[this.h];
        this.h = (this.h + 1) % this.q.length;
        return v;
    }

    get length() {
        return (this.t - this.h + this.q.length) % this.q.length;
    }

    clear() {
        this.t = this.h = 0;
    }
}

const EIGHT_DELTA = [
    { x: 0, y: -1 },
    { x: 1, y: -1 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
    { x: -1, y: 1 },
    { x: -1, y: 0 },
    { x: -1, y: -1 },
];

function calcIdx(x, y) {
    return (y << 6) | x;
}

function calcPt(v) {
    return { x: v & 0x3f, y: v >> 6 };
}

function isPointInRoom(p) {
    return p.x >= 0 && p.x <= 49 && p.y >= 0 && p.y <= 49;
}

function pointAdd(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
}

function surroundingPoints(p) {
    return EIGHT_DELTA.map(d => pointAdd(p, d)).filter(isPointInRoom);
}

const MAX_PT = 1 << 12;
const PT_MASK = MAX_PT - 1;
const D_NODE = 1 << 12;
const MAX_NODE = 1 << 13;
const REV_EDGE = 1 << 16;
const DIR_SHIFT = 13;

function _minCutToExit(sources, costMap) {
    const exit = new Uint8Array(MAX_PT);
    for (let i = 0; i < 49; ++i) {
        for (const [x, y] of [
            [i, 0],
            [49, i],
            [49 - i, 49],
            [0, 49 - i],
        ]) {
            if (costMap.get(x, y) == 255) {
                continue;
            }
            exit[calcIdx(x, y)] = 1;
            for (const p of surroundingPoints({ x, y })) {
                exit[calcIdx(p.x, p.y)] = 1;
            }
        }
    }

    for (const s of sources) {
        if (exit[calcIdx(s.x, s.y)]) {
     //       throw new Error(`Invalid source ${s.x},${s.y}`);
        }
    }

    const capacityMap = new Int32Array(1 << 17);
    capacityMap.fill(0);
    for (let y = 0; y < 50; ++y) {
        for (let x = 0; x < 50; ++x) {
            if (costMap.get(x, y) == 255) {
                continue;
            }

            const idx = calcIdx(x, y);

            capacityMap[idx | REV_EDGE] = costMap.get(x, y);

            for (let dir = 0; dir < EIGHT_DELTA.length; ++dir) {
                const np = pointAdd({ x, y }, EIGHT_DELTA[dir]);
                if (!isPointInRoom(np)) {
                    continue;
                }

                if (costMap.get(np.x, np.y) == 255) {
                    continue;
                }

                capacityMap[idx | D_NODE | (dir << DIR_SHIFT)] = 10000;
            }
        }
    }

    const last = new Int32Array(MAX_NODE);
    last.fill(-2);

    const added = new Uint8Array(MAX_NODE);
    added.fill(0);

    const bfsQ = new Int32Queue(MAX_NODE);

    for (const p of sources) {
        const pidx = calcIdx(p.x, p.y);
        last[pidx] = -1;
        added[pidx] = 1;
        bfsQ.push(pidx);
    }

    const bfs = () => {
        while (bfsQ.length) {
            const opidx = bfsQ.shift();
            added[opidx] = 0;

            if (last[opidx] == -2) {
                continue;
            }

            if (capacityMap[opidx | REV_EDGE]) {
                const onpidx = opidx ^ D_NODE;
                if (last[onpidx] == -2) {
                    last[onpidx] = (8 << 16) | opidx;
                    added[onpidx] = 1;
                    bfsQ.push(onpidx);
                }
            }

            const pidx = opidx & PT_MASK;
            const p = calcPt(pidx);
            const npCounterpartFlag = (opidx ^ D_NODE) & D_NODE;
            for (let dir = 0; dir < EIGHT_DELTA.length; ++dir) {
                if (capacityMap[opidx | (dir << DIR_SHIFT)] == 0) {
                    continue;
                }

                const np = pointAdd(p, EIGHT_DELTA[dir]);
                const npidx = calcIdx(np.x, np.y);

                const onpidx = npidx | npCounterpartFlag;

                if (exit[npidx]) {
                    last[onpidx] = (dir << 16) | opidx;
                    return np;
                }

                if (last[onpidx] != -2) {
                    continue;
                }

                last[onpidx] = (dir << 16) | opidx;
                added[onpidx] = 1;
                bfsQ.push(onpidx);
            }
        }

        return null;
    };

    const revEdge = (opidx, dir) => {
        if (dir == 8) {
            return [opidx ^ D_NODE, 8];
        }

        const pidx = opidx & PT_MASK;
        const p = calcPt(pidx);
        const np = pointAdd(p, EIGHT_DELTA[dir]);
        const onpidx = calcIdx(np.x, np.y) | ((opidx ^ D_NODE) & D_NODE);
        return [onpidx, (dir + 4) % 8];
    };

    const looseQ = new Int32Queue(MAX_NODE);
    const readdQ = new Int32Queue(MAX_NODE);

    const loosen = (p) => {
        let minCapacity = Infinity;
        let highestPt = -1;
        for (let res = last[calcIdx(p.x, p.y)]; res != -1; ) {
            const l = res & 0xffff;
            const d = res >> 16;
            const capacity = capacityMap[l | (d << DIR_SHIFT)];
            if (capacity <= minCapacity) {
                minCapacity = capacity;
                highestPt = l;
            }
            res = last[l];
        }

        for (let res = last[calcIdx(p.x, p.y)]; res != -1; ) {
            const l = res & 0xffff;
            const d = res >> 16;
            capacityMap[l | (d << DIR_SHIFT)] -= minCapacity;

            const [rl, rd] = revEdge(l, d);
            capacityMap[rl | (rd << DIR_SHIFT)] += minCapacity;

            res = last[l];
        }

        looseQ.push(highestPt);
        while (looseQ.length) {
            const opidx = looseQ.shift();

            {
                const onpidx = opidx ^ D_NODE;
                if (last[onpidx] == (opidx | (8 << 16))) {
                    last[onpidx] = -2;
                    looseQ.push(onpidx);
                    readdQ.push(onpidx);
                }
            }

            const pidx = opidx & PT_MASK;
            const _p = calcPt(pidx);
            const npCounterpartFlag = (opidx ^ D_NODE) & D_NODE;

            for (let dir = 0; dir < EIGHT_DELTA.length; ++dir) {
                const np = pointAdd(_p, EIGHT_DELTA[dir]);
                const onpidx = calcIdx(np.x, np.y) | npCounterpartFlag;

                if (last[onpidx] == (opidx | (dir << 16))) {
                    last[onpidx] = -2;
                    looseQ.push(onpidx);
                    readdQ.push(onpidx);
                }
            }
        }

        while (readdQ.length) {
            const opidx = readdQ.shift();
            for (let dir = 0; dir < EIGHT_DELTA.length + 1; ++dir) {
                const [onpidx, rd] = revEdge(opidx, dir);
                const pidx = onpidx & PT_MASK;
                if (last[onpidx] != -2 && !exit[pidx] && !added[onpidx] && capacityMap[onpidx | (rd << DIR_SHIFT)]) {
                    added[onpidx] = 1;
                    bfsQ.push(onpidx);
                }
            }
        }
    };

    for (let p = bfs(); p != null; p = bfs()) {
        loosen(p);
    }

    const ret = [];
    const visited = new Uint8Array(MAX_NODE);
    const q = sources.map(p => calcIdx(p.x, p.y));
    for (const p of q) {
        visited[p] = 1;
    }

    while (q.length) {
        const sidx = q.shift();
        const didx = sidx | D_NODE;
        const p = calcPt(sidx);

        if (last[sidx] != -2 && last[didx] == -2) {
            ret.push(p);
        }

        for (const np of surroundingPoints(p)) {
            if (!isPointInRoom(np)) {
                continue;
            }

            if (visited[calcIdx(np.x, np.y)]) {
                continue;
            }

            if (costMap.get(np.x, np.y) == 255) {
                continue;
            }

            const npidx = calcIdx(np.x, np.y);
            visited[npidx] = 1;
            q.push(npidx);
        }
    }

    return ret;
}

function USAGE() {
 //   const assert = require('assert');

    const cm = new PathFinder.CostMatrix();
    cm._bits.fill(255);

//    cm.set(5, 0, 1);

/*
    for (let y = 0; y < 49; ++y) {
        for (let x = 0; x < 49; ++x) {

            if (getRoomTerrainAt(x, y, roomName) !== TERRAIN_MASK_WALL) {
                const dist = Math.max(Math.abs(centerPos.x - x), Math.abs(centerPos.y - y))
                const score = Math.pow(dist + 10, 1.5)/100
                cm.set(x, y, score);
            }
        }
    }*/

    /*
    const expected = [
        { x: 3, y: 1 },
        { x: 7, y: 1 },
        { x: 3, y: 2 },
        { x: 4, y: 2 },
        { x: 5, y: 2 },
        { x: 6, y: 2 },
        { x: 7, y: 2 },
    ];*/

    const result = minCutToExit(surroundingPoints({ x: 5, y: 5 }), cm);
/*
    result.sort((a, b) => {
        if (a.y != b.y) {
            return a.y - b.y;
        }
        return a.x - b.x;
    });
    assert.deepStrictEqual(result, expected);
    console.log('Yes!');*/
}


global.minCutToExit = function (sources, costMap) {
    return _minCutToExit(sources, costMap);
};
