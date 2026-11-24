import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyMove, faces, solved } from './cube.js';
import { analyzeGrid, calibrate, centerWarning, classifySticker, rgbToLab } from './cubeScan.js';
import { rotateFace, topNeighbor, validateNet } from './physicalCube.js';

const toNet = state => Object.fromEntries([...faces].map((face, i) => [face, [...state.slice(i * 9, i * 9 + 9)]]));
const palette = { U: [235, 235, 230], R: [200, 26, 34], F: [25, 145, 65],
  D: [241, 214, 25], L: [239, 118, 21], B: [24, 100, 214] };

function imageOf(labels) {
  const width = 150;
  const data = new Uint8ClampedArray(width * width * 4);
  for (let y = 0; y < width; y++) for (let x = 0; x < width; x++) {
    const row = Math.floor((y - 16) / 39.5);
    const col = Math.floor((x - 16) / 39.5);
    const gap = ((x - 16) % 39.5) < 3 || ((y - 16) % 39.5) < 3;
    const rgb = row < 0 || row > 2 || col < 0 || col > 2 || gap
      ? [20, 20, 20] : palette[labels[row * 3 + col]];
    data.set([...rgb, 255], (y * width + x) * 4);
  }
  return { data, width, height: width };
}

test('detects a nine-sticker image grid and classifies stickers under changed exposure', () => {
  const labels = 'URFDLBURF';
  const result = analyzeGrid(imageOf(labels));
  assert.deepEqual(result.warnings, []);
  const scans = Object.fromEntries([...faces].map(face => [face,
    { samples: Array(9).fill(rgbToLab(palette[face])) }]));
  assert.equal(result.samples.map(sample => classifySticker(sample, calibrate(scans)).color).join(''), labels);
  for (const face of faces) {
    const darker = rgbToLab(palette[face].map(value => value * 0.85 + 8));
    assert.equal(classifySticker(darker, calibrate(scans)).color, face);
  }
  assert.match(centerWarning({ U: scans.U, R: scans.U }, 'U'), /similar center/);
  assert.ok(analyzeGrid({ data: new Uint8ClampedArray(90 * 90 * 4), width: 90, height: 90 }).warnings.length >= 2);
});

test('face rotation reorders rows and recovers a misoriented capture', () => {
  assert.deepEqual(rotateFace([1, 2, 3, 4, 5, 6, 7, 8, 9]), [7, 4, 1, 8, 5, 2, 9, 6, 3]);
  assert.deepEqual(topNeighbor, { U: 'B', R: 'U', F: 'U', D: 'F', L: 'U', B: 'U' });
  const state = ['R', 'U', 'F2', "D'", 'B'].reduce(applyMove, solved);
  const net = toNet(state);
  net.F = rotateFace(net.F);
  assert.ok(validateNet(net).error);
  for (let i = 0; i < 3; i++) net.F = rotateFace(net.F);
  assert.deepEqual(validateNet(net), { facelets: state });
});

test('six detected faces reconstruct the exact solver and Three.js state', () => {
  const state = ['R', "D'", 'U2', 'B', 'F2', 'L'].reduce(applyMove, solved);
  const scans = Object.fromEntries(Object.entries(toNet(state)).map(([face, labels]) =>
    [face, analyzeGrid(imageOf(labels))]));
  const calibration = calibrate(scans);
  const net = Object.fromEntries([...faces].map(face =>
    [face, scans[face].samples.map(sample => classifySticker(sample, calibration).color)]));
  assert.deepEqual(validateNet(net), { facelets: state });
});

test('validation catches missing stickers, bad centers, counts, pieces, flips, twists and parity', () => {
  const invalid = (changes, reason) => {
    const state = [...solved];
    for (const [index, color] of changes) state[index] = color;
    assert.match(validateNet(toNet(state)).error, reason);
  };
  invalid([[0, null]], /54/);
  invalid([[4, 'R']], /center/);
  invalid([[0, 'R']], /nine/);
  invalid([[5, 'F'], [19, 'U']], /pieces/);
  invalid([[5, 'R'], [10, 'U']], /flip/);
  invalid([[8, 'F'], [9, 'U'], [20, 'R']], /twist/);
  invalid([[10, 'F'], [19, 'R']], /parity/);
});

test('validation accepts legal transitions on all six axes', () => {
  let state = solved;
  for (const face of faces) for (const suffix of ['', "'", '2']) {
    state = applyMove(state, face + suffix);
    assert.equal(validateNet(toNet(state)).facelets, state);
  }
});
