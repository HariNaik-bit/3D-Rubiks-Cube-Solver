import { faces } from './cube.js';

export function rgbToLab(rgb) {
  const [r, g, b] = rgb.map(value => {
    const s = value / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const xyz = [
    (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047,
    0.2126729 * r + 0.7151522 * g + 0.072175 * b,
    (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883
  ];
  const [x, y, z] = xyz.map(value => value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

// Weight chromaticity over brightness to tolerate exposure changes between photos.
export const colorDistance = (a, b) => Math.hypot((a[0] - b[0]) * 0.55, a[1] - b[1], a[2] - b[2]);
const hue = ([, a, b]) => Math.atan2(b, a) * 180 / Math.PI;
const chroma = ([, a, b]) => Math.hypot(a, b);
const hueDistance = (a, b) => Math.abs(((hue(a) - hue(b) + 540) % 360) - 180);
const warmColors = new Set(['R', 'L']);
const minimumWarmSeparation = 12;
const references = Object.fromEntries([
  [242, 242, 239], [202, 27, 38], [20, 154, 78],
  [243, 220, 34], [246, 123, 24], [28, 98, 220]
].map((rgb, index) => [faces[index], rgbToLab(rgb)]));

export function calibrate(scans) {
  return Object.fromEntries([...faces].map(face => [face, scans[face]?.samples[4] || references[face]]));
}

export function classifySticker(sample, calibration) {
  const candidates = [...faces].map(face => ({ face, distance: colorDistance(sample, calibration[face]) }));
  candidates.sort((a, b) => a.distance - b.distance);
  const [best, next] = candidates;
  if (warmColors.has(best.face) && warmColors.has(next.face)) {
    const red = calibration.R;
    const orange = calibration.L;
    const reliableCenters = chroma(red) >= 20 && chroma(orange) >= 20 &&
      hue(orange) - hue(red) >= minimumWarmSeparation;
    const redDistance = hueDistance(sample, reliableCenters ? red : references.R);
    const orangeDistance = hueDistance(sample, reliableCenters ? orange : references.L);
    const color = redDistance <= orangeDistance ? 'R' : 'L';
    return {
      color,
      uncertain: !reliableCenters || chroma(sample) < 20 ||
        Math.abs(redDistance - orangeDistance) < 8 ||
        Math.min(redDistance, orangeDistance) > 20
    };
  }
  return { color: best.face, uncertain: best.distance > 27 || next.distance - best.distance < 8 };
}

export function centerWarning(scans, face) {
  const sample = scans[face]?.samples[4];
  if (!sample) return '';
  const duplicate = [...faces].find(other => other !== face && scans[other] &&
    colorDistance(sample, scans[other].samples[4]) < 11);
  if (duplicate) return 'Two photos have very similar center colors. Check for a duplicate face or poor lighting.';
  if (warmColors.has(face) && scans.R && scans.L &&
      hue(scans.L.samples[4]) - hue(scans.R.samples[4]) < minimumWarmSeparation) {
    return 'Red and orange centers are too similar or swapped. Check the slots, retake both photos under the same light, or correct the marked stickers.';
  }
  const match = classifySticker(sample, references);
  if (match.color !== face && !match.uncertain) return 'The center may belong to a different slot. Check the face and lighting.';
  return '';
}

const median = values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];

export function analyzeGrid({ data, width, height }) {
  const pixel = (x, y) => {
    const i = (Math.round(y) * width + Math.round(x)) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  };
  const scale = Math.min(width, height);
  let best = { score: -Infinity };
  for (const ratio of [0.61, 0.67, 0.73, 0.79, 0.85]) {
    for (const dx of [-0.055, 0, 0.055]) {
      for (const dy of [-0.055, 0, 0.055]) {
        const size = scale * ratio;
        const x = (width - size) / 2 + dx * scale;
        const y = (height - size) / 2 + dy * scale;
        const delta = size * 0.021;
        const edges = [];
        for (const line of [1 / 3, 2 / 3]) {
          for (const along of [1 / 6, 1 / 2, 5 / 6]) {
            const dimensions = [[x + size * line, y + size * along, delta, 0],
              [x + size * along, y + size * line, 0, delta]];
            for (const [cx, cy, sx, sy] of dimensions) {
              const mid = pixel(cx, cy);
              const before = pixel(cx - sx, cy - sy);
              const after = pixel(cx + sx, cy + sy);
              edges.push(Math.max(...mid.map((value, i) =>
                Math.max(Math.abs(value - before[i]), Math.abs(value - after[i]), Math.abs(before[i] - after[i])))));
            }
          }
        }
        const score = median(edges) - 10 * (Math.abs(dx) + Math.abs(dy)) - 18 * Math.abs(ratio - 0.79);
        if (score > best.score) best = { score, x, y, size };
      }
    }
  }
  const { x, y, size, score } = best;
  const cell = size / 3;
  const samples = Array.from({ length: 9 }, (_, index) => {
    const rgb = [[], [], []];
    for (const dx of [-0.16, -0.08, 0, 0.08, 0.16]) {
      for (const dy of [-0.16, -0.08, 0, 0.08, 0.16]) {
        const point = pixel(x + cell * (index % 3 + 0.5 + dx), y + cell * (Math.floor(index / 3) + 0.5 + dy));
        point.forEach((value, channel) => rgb[channel].push(value));
      }
    }
    return rgbToLab(rgb.map(median));
  });
  const light = median(samples.map(sample => sample[0]));
  const warnings = [];
  if (score < 18) warnings.push('Grid edges are faint. Use a sharper photo and align the face with the guide.');
  if (light < 29 || light > 94) warnings.push('Lighting may hide sticker colors. Try even, indirect light.');
  return { samples, warnings, grid: { x: x / width, y: y / height, size: size / width } };
}

export async function scanPhoto(file) {
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose an image under 20 MB.');
  const url = URL.createObjectURL(file);
  try {
    const photo = new Image();
    photo.src = url;
    await photo.decode();
    const side = Math.min(photo.naturalWidth, photo.naturalHeight);
    if (side < 90) throw new Error('Use a sharper image at least 90 pixels wide and tall.');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 300;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(photo, (photo.naturalWidth - side) / 2, (photo.naturalHeight - side) / 2,
      side, side, 0, 0, 300, 300);
    return { ...analyzeGrid(context.getImageData(0, 0, 300, 300)), preview: canvas.toDataURL('image/jpeg', 0.75) };
  } finally {
    URL.revokeObjectURL(url);
  }
}
