import { readFileSync } from 'fs';
import { svgPathProperties } from 'svg-path-properties';

function bbox(d) {
  const p = new svgPathProperties(d);
  const len = p.getTotalLength();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i <= 500; i++) {
    const pt = p.getPointAtLength((len * i) / 500);
    minX = Math.min(minX, pt.x);
    minY = Math.min(minY, pt.y);
    maxX = Math.max(maxX, pt.x);
    maxY = Math.max(maxY, pt.y);
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

const files = ['squadrato.svg', 'tondo.svg', 'logomarialuisa.svg'];
for (const f of files) {
  const svg = readFileSync(f, 'utf8');
  const d = svg.match(/d="([^"]+)"/)[1];
  const vb = svg.match(/viewBox="([^"]+)"/)[1];
  console.log(f, 'viewBox', vb, 'bbox', bbox(d));
}
