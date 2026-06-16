import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { svgPathProperties } from 'svg-path-properties';
import { parseOrthogonalPath, roundedOrthogonalPath } from './orthogonal-round.mjs';
import { scalePath } from './scale-path.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function extractPath(svg) {
  return svg.match(/d="([^"]+)"/)[1];
}

function estimateCornerRadii(skeleton, targetD, samples = 400) {
  const props = new svgPathProperties(targetD);
  const len = props.getTotalLength();
  const n = skeleton.length;

  return skeleton.map((curr, i) => {
    const prev = skeleton[(i - 1 + n) % n];
    const next = skeleton[(i + 1) % n];
    const vInX = curr.x - prev.x;
    const vInY = curr.y - prev.y;
    const vOutX = next.x - curr.x;
    const vOutY = next.y - curr.y;
    const convex = vInX * vOutY - vInY * vOutX > 0;

    let minD = Infinity;
    for (let j = 0; j <= samples; j++) {
      const p = props.getPointAtLength((len * j) / samples);
      minD = Math.min(minD, Math.hypot(p.x - curr.x, p.y - curr.y));
    }

    if (!convex) return 0;
    return Math.round(minD * 10) / 10;
  });
}

function distPaths(d1, d2) {
  const a = new svgPathProperties(d1);
  const b = new svgPathProperties(d2);
  const la = a.getTotalLength();
  const lb = b.getTotalLength();
  let t = 0;
  const n = 250;
  for (let i = 0; i <= n; i++) {
    const p = a.getPointAtLength((la * i) / n);
    let min = Infinity;
    for (let j = 0; j <= n; j++) {
      const q = b.getPointAtLength((lb * j) / n);
      min = Math.min(min, Math.hypot(p.x - q.x, p.y - q.y));
    }
    t += min;
  }
  return t / n;
}

const squadratoD = extractPath(readFileSync(join(root, 'squadrato.svg'), 'utf8'));
const tondoD = extractPath(readFileSync(join(root, 'tondo.svg'), 'utf8'));
const logomarialuisaRaw = readFileSync(join(root, 'logomarialuisa.svg'), 'utf8');
const logoFullD = extractPath(logomarialuisaRaw);
const vbLogo = logomarialuisaRaw.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
const scaledLogoD = scalePath(logoFullD, 1401 / vbLogo[2], 1818 / vbLogo[3]);

const skeleton = parseOrthogonalPath(squadratoD);
const radiiRound = estimateCornerRadii(skeleton, tondoD);
const radiiOriginal = estimateCornerRadii(skeleton, scaledLogoD);
const radiiSharp = skeleton.map(() => 0);

// Clamp very small estimates (concave corners / edge proximity)
function clampRadii(radii, maxR = 90) {
  return radii.map((r) => Math.min(maxR, Math.max(0, r)));
}

const config = {
  viewBox: '0 0 1401 1818',
  skeleton: squadratoD,
  radii: {
    original: clampRadii(radiiOriginal),
    round: clampRadii(radiiRound),
    sharp: radiiSharp,
  },
};

const builtRound = roundedOrthogonalPath(skeleton, config.radii.round);
const builtLogo = roundedOrthogonalPath(skeleton, config.radii.original);
const builtSharp = roundedOrthogonalPath(skeleton, config.radii.sharp);

console.log('Fit round:', distPaths(builtRound, tondoD).toFixed(2));
console.log('Fit logo:', distPaths(builtLogo, scaledLogoD).toFixed(2));
console.log('Fit sharp:', distPaths(builtSharp, squadratoD).toFixed(4));

writeFileSync(join(root, 'logo-config.json'), JSON.stringify(config, null, 2));
console.log('Written logo-config.json');
