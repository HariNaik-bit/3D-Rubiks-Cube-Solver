import assert from 'node:assert/strict';
import { applyMove, faces, scramble, solved } from '../src/cube.js';

const origin = process.argv[2] ?? 'http://localhost:8080';
function solve(facelets) {
  return fetch(new URL('/api/cube/solve', origin), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ facelets }),
    signal: AbortSignal.timeout(15_000)
  });
}

async function checkSolution(turns) {
  const facelets = turns.reduce(applyMove, solved);
  const response = await solve(facelets);
  assert.equal(response.status, 200, await response.clone().text());
  const { moves } = await response.json();
  assert.ok(Array.isArray(moves));
  assert.ok(moves.every(move => /^[URFDLB](?:2|')?$/.test(move)));
  assert.equal(moves.reduce(applyMove, facelets), solved, turns.join(' '));
  return moves;
}

assert.deepEqual(await checkSolution([]), []);
for (const face of faces) {
  for (const suffix of ['', "'", '2']) {
    await checkSolution([face + suffix]);
  }
}
for (let index = 0; index < 30; index++) {
  await checkSolution(scramble());
}

const flippedEdge = [...solved];
[flippedEdge[7], flippedEdge[19]] = [flippedEdge[19], flippedEdge[7]];
for (const [state, detail] of [['invalid', '54 facelets'], [flippedEdge.join(''), 'An edge is flipped.']]) {
  const response = await solve(state);
  assert.equal(response.status, 400);
  assert.ok((await response.json()).detail.includes(detail));
}
console.log('Verified the solved state, all 18 face turns, 30 scrambles, and two invalid states through the HTTP API.');
