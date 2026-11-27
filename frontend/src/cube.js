export const faces = 'URFDLB';
export const colors = { U: '#f7f7ee', R: '#e82d43', F: '#26cf8b', D: '#ffdb54', L: '#ffa326', B: '#5287ff' };
const frames = {
  U: [[0, 1, 0], [1, 0, 0], [0, 0, 1]],
  R: [[1, 0, 0], [0, 0, -1], [0, -1, 0]],
  F: [[0, 0, 1], [1, 0, 0], [0, -1, 0]],
  D: [[0, -1, 0], [1, 0, 0], [0, 0, -1]],
  L: [[-1, 0, 0], [0, 0, 1], [0, -1, 0]],
  B: [[0, 0, -1], [-1, 0, 0], [0, -1, 0]]
};

export const slots = [...faces].flatMap(face => {
  const [normal, right, down] = frames[face];
  return Array.from({ length: 9 }, (_, index) => ({
    face,
    normal,
    position: normal.map((value, axis) =>
      value + (index % 3 - 1) * right[axis] + (Math.floor(index / 3) - 1) * down[axis])
  }));
});
export const solved = slots.map(slot => slot.face).join('');

export function turn(move) {
  const normal = frames[move[0]][0];
  const axis = normal.findIndex(Boolean);
  const layer = normal[axis];
  const quarters = -layer * (move.endsWith('2') ? 2 : move.endsWith("'") ? -1 : 1);
  return { axis, layer, quarters };
}

function rotate(vector, axis, quarters) {
  const result = [...vector];
  const first = (axis + 1) % 3;
  const second = (axis + 2) % 3;
  for (let index = 0; index < (quarters + 4) % 4; index++) {
    [result[first], result[second]] = [-result[second], result[first]];
  }
  return result;
}

const key = (position, normal) => [...position, ...normal].join(',');
const indices = new Map(slots.map(({ position, normal }, index) => [key(position, normal), index]));

export function applyMove(state, move) {
  const { axis, layer, quarters } = turn(move);
  const next = [...state];
  slots.forEach(({ position, normal }, index) => {
    if (position[axis] !== layer) return;
    const destination = key(rotate(position, axis, quarters), rotate(normal, axis, quarters));
    next[indices.get(destination)] = state[index];
  });
  return next.join('');
}

export const inverse = move => move.endsWith('2') ? move : move.endsWith("'") ? move[0] : move + "'";

export function scramble(length = 20) {
  const moves = [];
  while (moves.length < length) {
    const face = faces[Math.floor(Math.random() * faces.length)];
    if (face === moves.at(-1)?.[0]) continue;
    moves.push(face + ['', "'", '2'][Math.floor(Math.random() * 3)]);
  }
  return moves;
}
