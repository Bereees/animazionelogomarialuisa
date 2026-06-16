import { readFileSync } from 'fs';
import { svgPathProperties } from 'svg-path-properties';

const { paths } = JSON.parse(readFileSync('paths-morph.json', 'utf8'));

function sample(d, n = 512) {
  const p = new svgPathProperties(d);
  const len = p.getTotalLength();
  const pts = [];
  for (let i = 0; i < n; i++) {
    const pt = p.getPointAtLength((len * i) / n);
    pts.push([pt.x, pt.y]);
  }
  return pts;
}

const a = sample(paths.logomarialuisa);
const b = sample(paths.tondo);
let alignErr = 0;
for (let i = 0; i < a.length; i++) {
  alignErr += Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1]);
}
console.log('Aligned index error logo->tondo:', (alignErr / a.length).toFixed(2));

import flubber from 'flubber';
const morph = flubber.interpolate(paths.logomarialuisa, paths.tondo, { maxSegmentLength: 8, string: true });
console.log('Morph mid sample OK:', morph(0.5).slice(0, 40));
