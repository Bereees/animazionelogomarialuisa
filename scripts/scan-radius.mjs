import { readFileSync } from 'fs';
import { svgPathProperties } from 'svg-path-properties';
import { parseOrthogonalPath } from './orthogonal-round.mjs';

const tondoD = readFileSync('tondo.svg', 'utf8').match(/d="([^"]+)"/)[1];
const squadratoD = readFileSync('squadrato.svg', 'utf8').match(/d="([^"]+)"/)[1];
const skeleton = parseOrthogonalPath(squadratoD);

function distPaths(d1, d2) {
  const a = new svgPathProperties(d1);
  const b = new svgPathProperties(d2);
  const la = a.getTotalLength();
  const lb = b.getTotalLength();
  let t = 0;
  const n = 150;
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

console.log('squadrato vs tondo:', distPaths(squadratoD, tondoD).toFixed(2));

function dist(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}
function fmt(n) {
  return Number(n.toFixed(3)).toString();
}
function crossZ(ax, ay, bx, by) {
  return ax * by - ay * bx;
}

function rounded(points, radius, invertConvex) {
  const n = points.length;
  const cornerData = [];
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const curr = points[i];
    const next = points[(i + 1) % n];
    const vInX = curr.x - prev.x;
    const vInY = curr.y - prev.y;
    const vOutX = next.x - curr.x;
    const vOutY = next.y - curr.y;
    const lenIn = Math.hypot(vInX, vInY);
    const lenOut = Math.hypot(vOutX, vOutY);
    const r = Math.min(radius, lenIn / 2, lenOut / 2);
    const turn = crossZ(vInX, vInY, vOutX, vOutY);
    const convex = invertConvex ? turn < 0 : turn > 0;
    let pIn, pOut, sweep;
    if (Math.abs(vInY) < 0.001 && Math.abs(vOutX) < 0.001) {
      const signIn = vInX > 0 ? 1 : -1;
      const signOut = vOutY > 0 ? 1 : -1;
      if (convex) {
        pIn = { x: curr.x - signIn * r, y: curr.y };
        pOut = { x: curr.x, y: curr.y + signOut * r };
        sweep = signIn === signOut ? 0 : 1;
      } else {
        pIn = { x: curr.x + signIn * r, y: curr.y };
        pOut = { x: curr.x, y: curr.y - signOut * r };
        sweep = signIn === signOut ? 1 : 0;
      }
    } else if (Math.abs(vInX) < 0.001 && Math.abs(vOutY) < 0.001) {
      const signIn = vInY > 0 ? 1 : -1;
      const signOut = vOutX > 0 ? 1 : -1;
      if (convex) {
        pIn = { x: curr.x, y: curr.y - signIn * r };
        pOut = { x: curr.x + signOut * r, y: curr.y };
        sweep = signIn === signOut ? 0 : 1;
      } else {
        pIn = { x: curr.x, y: curr.y + signIn * r };
        pOut = { x: curr.x - signOut * r, y: curr.y };
        sweep = signIn === signOut ? 1 : 0;
      }
    } else {
      pIn = curr;
      pOut = curr;
      sweep = 0;
    }
    cornerData.push({ pIn, pOut, r, sweep });
  }
  const parts = [`M${fmt(cornerData[0].pIn.x)},${fmt(cornerData[0].pIn.y)}`];
  for (let i = 0; i < n; i++) {
    const { pOut, r, sweep } = cornerData[i];
    const nextIn = cornerData[(i + 1) % n].pIn;
    if (r > 0) parts.push(`A${fmt(r)},${fmt(r)} 0 0 ${sweep} ${fmt(pOut.x)},${fmt(pOut.y)}`);
    else parts.push(`L${fmt(pOut.x)},${fmt(pOut.y)}`);
    if (dist(pOut, nextIn) > 0.001) parts.push(`L${fmt(nextIn.x)},${fmt(nextIn.y)}`);
  }
  parts.push('Z');
  return parts.join('');
}

for (const invert of [false, true]) {
  let best = { r: 0, e: Infinity };
  for (let r = 0; r <= 80; r += 2) {
    const e = distPaths(rounded(skeleton, r, invert), tondoD);
    if (e < best.e) best = { r, e };
  }
  console.log('invert', invert, 'best', best);
}
