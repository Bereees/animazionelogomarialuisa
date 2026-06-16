import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { svgPathProperties } from 'svg-path-properties';
import { scalePath } from './scale-path.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const NUM_POINTS = 512;

function extractPath(svg) {
  return svg.match(/d="([^"]+)"/)[1];
}

function extractViewBox(svg) {
  return svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
}

function sampleRing(d, count) {
  const props = new svgPathProperties(d);
  const len = props.getTotalLength();
  const ring = [];
  for (let i = 0; i < count; i++) {
    const p = props.getPointAtLength((len * i) / count);
    ring.push([p.x, p.y]);
  }
  return ring;
}

function polygonArea(ring) {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    area += ring[i][0] * ring[j][1] - ring[j][0] * ring[i][1];
  }
  return area / 2;
}

function rotateRingToMatch(ring, reference) {
  const len = ring.length;
  let min = Infinity;
  let bestOffset = 0;

  for (let offset = 0; offset < len; offset++) {
    let sum = 0;
    for (let i = 0; i < len; i++) {
      const a = ring[(offset + i) % len];
      const b = reference[i];
      const dx = a[0] - b[0];
      const dy = a[1] - b[1];
      sum += dx * dx + dy * dy;
    }
    if (sum < min) {
      min = sum;
      bestOffset = offset;
    }
  }

  if (!bestOffset) return ring;
  return [...ring.slice(bestOffset), ...ring.slice(0, bestOffset)];
}

function ringToPath(ring) {
  const fmt = (n) => Number(n.toFixed(3));
  let d = `M${fmt(ring[0][0])},${fmt(ring[0][1])}`;
  for (let i = 1; i < ring.length; i++) {
    d += `L${fmt(ring[i][0])},${fmt(ring[i][1])}`;
  }
  return d + 'Z';
}

function normalizeWinding(ring, reference) {
  const sign = Math.sign(polygonArea(ring)) || 1;
  const refSign = Math.sign(polygonArea(reference)) || 1;
  if (sign !== refSign) {
    return ring.slice().reverse();
  }
  return ring;
}

function prepareScaledPaths() {
  const targetViewBox = [0, 0, 1401, 1818];
  const files = {
    logomarialuisa: 'logomarialuisa.svg',
    tondo: 'tondo.svg',
    squadrato: 'squadrato.svg',
  };
  const paths = {};

  for (const [key, file] of Object.entries(files)) {
    const content = readFileSync(join(root, file), 'utf8');
    const vb = extractViewBox(content);
    let d = extractPath(content);
    if (vb[2] !== targetViewBox[2] || vb[3] !== targetViewBox[3]) {
      d = scalePath(d, targetViewBox[2] / vb[2], targetViewBox[3] / vb[3]);
    }
    paths[key] = d;
  }

  return { viewBox: targetViewBox.join(' '), paths };
}

const { viewBox, paths } = prepareScaledPaths();
const refRing = sampleRing(paths.logomarialuisa, NUM_POINTS);

const normalized = {};
for (const [key, d] of Object.entries(paths)) {
  let ring = sampleRing(d, NUM_POINTS);
  ring = normalizeWinding(ring, refRing);
  if (key !== 'logomarialuisa') {
    ring = rotateRingToMatch(ring, refRing);
  }
  normalized[key] = ringToPath(ring);
}

writeFileSync(
  join(root, 'paths-morph.json'),
  JSON.stringify({
    viewBox,
    original: paths,
    morph: normalized,
    numPoints: NUM_POINTS,
  }, null, 2)
);

console.log('Normalized morph paths:', Object.keys(normalized), `(${NUM_POINTS} pts each)`);
