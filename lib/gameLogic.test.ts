// ponytail: assert-based self check, no test framework. `npm run test:logic`
import assert from "node:assert/strict";
import {
  CELL_COUNT, CELL_GRID, buildSpinPath, buildSettle, cellAt, isWhammy, rng,
} from "./gameLogic";

// ring layout covers 18 distinct perimeter squares of a 6x5 grid
assert.equal(CELL_GRID.length, CELL_COUNT);
assert.equal(new Set(CELL_GRID.map((c) => `${c.row},${c.col}`)).size, CELL_COUNT);
assert.ok(CELL_GRID.every((c) => c.row === 1 || c.row === 5 || c.col === 1 || c.col === 6));
assert.deepEqual(CELL_GRID[0], { row: 1, col: 1 });
assert.deepEqual(CELL_GRID[6], { row: 2, col: 6 });
assert.deepEqual(CELL_GRID[9], { row: 5, col: 6 });
assert.deepEqual(CELL_GRID[17], { row: 2, col: 1 });

// same seed => same spin on every client (the whole sync model rests on this)
assert.deepEqual(buildSpinPath(1234), buildSpinPath(1234));
assert.notDeepEqual(buildSpinPath(1234), buildSpinPath(1235));

const path = buildSpinPath(99);
assert.ok(path.every((s) => s.cell >= 0 && s.cell < CELL_COUNT));
assert.ok(path.every((s) => s.delay >= 45 && s.delay < 110));
// never repeats the same cell twice in a row, and doesn't just walk the ring
assert.ok(path.every((s, i) => i === 0 || s.cell !== path[i - 1].cell));
const sequential = path.filter((s, i) => i > 0 && Math.abs(s.cell - path[i - 1].cell) === 1).length;
assert.ok(sequential < path.length * 0.3, "path should jump, not crawl around the ring");

assert.equal(cellAt(path, path.length + 3), path[3].cell);

// settle: 2-4 decelerating jumps, deterministic, no immediate repeats
for (const step of [0, 7, 250]) {
  const s = buildSettle(42, step, cellAt(path, step));
  assert.ok(s.length >= 2 && s.length <= 4);
  assert.deepEqual(s, buildSettle(42, step, cellAt(path, step)));
  assert.ok(s.every((x, i) => i === 0 || x.delay > s[i - 1].delay), "delays decelerate");
  assert.notEqual(s[0].cell, cellAt(path, step));
}

assert.ok(isWhammy("WHAMMY") && isWhammy(" whammy ") && !isWhammy("Whammy Jr"));
assert.ok(!isWhammy(undefined));

// rng stays in [0,1)
const r = rng(7);
for (let i = 0; i < 1000; i++) { const v = r(); assert.ok(v >= 0 && v < 1); }

console.log("gameLogic: ok");
