import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Vector3 } from 'three';
import { applyMove, faces, inverse, scramble, slots, solved, turn } from './cube.js';

test('all face turns preserve centers and can be reversed', () => {
  const state = ['R', 'F2', "D'", 'B', 'U2', 'L'].reduce(applyMove, solved);
  for (const face of faces) {
    for (const suffix of ['', "'", '2']) {
      const move = face + suffix;
      const moved = applyMove(state, move);
      assert.equal(applyMove(moved, inverse(move)), state);
      assert.equal([...faces].map((_, index) => moved[index * 9 + 4]).join(''), faces);
    }
    assert.equal([face, face, face, face].reduce(applyMove, state), state);
    assert.equal([face, face].reduce(applyMove, state), applyMove(state, face + '2'));
  }
});

test('scrambles contain legal moves and preserve sticker counts', () => {
  for (let index = 0; index < 20; index++) {
    const moves = scramble();
    assert.equal(moves.length, 20);
    assert.ok(moves.every((move, offset) => /^[URFDLB](2|')?$/.test(move) && move[0] !== moves[offset - 1]?.[0]));
    assert.equal([...moves.reduce(applyMove, solved)].sort().join(''), [...solved].sort().join(''));
  }
});

test('each completed Three.js rotation agrees with the logical sticker permutation', () => {
  const labels = slots.map((_, index) => String.fromCharCode(65 + index)).join('');
  const slotKey = (position, normal) => [...position, ...normal].join(',');
  const destinations = new Map(slots.map(({ position, normal }, index) => [slotKey(position, normal), index]));

  for (const face of faces) {
    for (const suffix of ['', "'", '2']) {
      const move = face + suffix;
      const { axis, layer, quarters } = turn(move);
      const vector = new Vector3().setComponent(axis, 1);
      const angle = quarters * Math.PI / 2;
      const rotate = components => new Vector3(...components).applyAxisAngle(vector, angle).toArray().map(Math.round);
      const next = applyMove(labels, move);

      slots.forEach(({ position, normal }, index) => {
        const destination = position[axis] === layer
          ? destinations.get(slotKey(rotate(position), rotate(normal)))
          : index;
        assert.equal(next[destination], labels[index], move + ' sticker ' + index);
      });
    }
  }
});
