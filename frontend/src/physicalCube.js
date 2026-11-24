import { faces } from './cube.js';

export const faceNames = { U: 'Up', R: 'Right', F: 'Front', D: 'Down', L: 'Left', B: 'Back' };
export const colorNames = { U: 'white', R: 'red', F: 'green', D: 'yellow', L: 'orange', B: 'blue' };
export const topNeighbor = { U: 'B', R: 'U', F: 'U', D: 'F', L: 'U', B: 'U' };

const clockwise = [6, 3, 0, 7, 4, 1, 8, 5, 2];
export const rotateFace = cells => clockwise.map(index => cells[index]);

// Kociemba facelet numbering. Each corner starts with its U/D sticker.
const corners = [
  [8, 9, 20], [6, 18, 38], [0, 36, 47], [2, 45, 11],
  [29, 26, 15], [27, 44, 24], [33, 53, 42], [35, 17, 51]
];
const edges = [
  [5, 10], [7, 19], [3, 37], [1, 46], [32, 16], [28, 25],
  [30, 43], [34, 52], [23, 12], [21, 41], [50, 39], [48, 14]
];
const cornerColors = ['URF', 'UFL', 'ULB', 'UBR', 'DFR', 'DLF', 'DBL', 'DRB'];
const edgeColors = ['UR', 'UF', 'UL', 'UB', 'DR', 'DF', 'DL', 'DB', 'FR', 'FL', 'BL', 'BR'];

function readPieces(state, positions, pieces) {
  let orientation = 0;
  const permutation = positions.map(indices => {
    const stickers = indices.map(index => state[index]);
    for (let offset = 0; offset < stickers.length; offset++) {
      const ordered = [...stickers.slice(offset), ...stickers.slice(0, offset)].join('');
      const piece = pieces.indexOf(ordered);
      if (piece !== -1) {
        orientation += offset;
        return piece;
      }
    }
    return -1;
  });
  return { permutation, orientation, valid: !permutation.includes(-1) && new Set(permutation).size === pieces.length };
}

function parity(permutation) {
  return permutation.reduce((total, value, index) =>
    total + permutation.slice(index + 1).filter(next => next < value).length, 0) % 2;
}

export function validateNet(net) {
  if ([...faces].some(face => net[face]?.length !== 9)) {
    return { error: 'Fill in all 54 stickers before solving.' };
  }
  const stickers = [...faces].flatMap(face => net[face]);
  if (stickers.some(color => typeof color !== 'string' || color.length !== 1 || !faces.includes(color))) {
    return { error: 'Fill in all 54 stickers before solving.' };
  }
  for (const face of faces) {
    if (net[face][4] !== face) return { error: 'Each face must have its designated center color.' };
    const count = stickers.filter(color => color === face).length;
    if (count !== 9) return { error: 'Expected nine ' + colorNames[face] + ' stickers, found ' + count + '.' };
  }
  const edge = readPieces(stickers, edges, edgeColors);
  const corner = readPieces(stickers, corners, cornerColors);
  if (!edge.valid || !corner.valid) {
    return { error: 'Some pieces are missing, duplicated, or have impossible colors. Check sticker colors and face rotation.' };
  }
  if (edge.orientation % 2) return { error: 'The edges have an impossible flip. Check the scanned face orientations and colors.' };
  if (corner.orientation % 3) return { error: 'The corners have an impossible twist. Check the scanned face orientations and colors.' };
  if (parity(edge.permutation) !== parity(corner.permutation)) {
    return { error: 'Edge and corner permutations have incompatible parity. Recheck your face orientations and sticker colors.' };
  }
  return { facelets: stickers.join('') };
}
