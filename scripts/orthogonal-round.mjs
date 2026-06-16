/**
 * Orthogonal path parsing and per-corner radius rounding.
 */

export function parseOrthogonalPath(d) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
  if (!tokens) throw new Error('Invalid path');

  let i = 0;
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  const points = [];

  function readNum() {
    return parseFloat(tokens[i++]);
  }

  while (i < tokens.length) {
    const cmd = tokens[i++];
    const upper = cmd.toUpperCase();
    const relative = cmd !== upper;

    if (upper === 'M') {
      x = readNum();
      y = readNum();
      startX = x;
      startY = y;
      points.push({ x, y });
    } else if (upper === 'L') {
      x = relative ? x + readNum() : readNum();
      y = relative ? y + readNum() : readNum();
      points.push({ x, y });
    } else if (upper === 'H') {
      x = relative ? x + readNum() : readNum();
      points.push({ x, y });
    } else if (upper === 'V') {
      y = relative ? y + readNum() : readNum();
      points.push({ x, y });
    } else if (upper === 'Z') {
      if (points.length && (points[0].x !== x || points[0].y !== y)) {
        x = startX;
        y = startY;
        points.push({ x, y });
      }
    } else {
      throw new Error(`Unsupported command: ${cmd}`);
    }
  }

  if (points.length > 1) {
    const last = points[points.length - 1];
    const first = points[0];
    if (Math.abs(last.x - first.x) < 0.01 && Math.abs(last.y - first.y) < 0.01) {
      points.pop();
    }
  }

  return points;
}

function dist(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function fmt(n) {
  return Number(n.toFixed(3)).toString();
}

function crossZ(ax, ay, bx, by) {
  return ax * by - ay * bx;
}

function radiusAt(radii, index) {
  if (Array.isArray(radii)) return radii[index] ?? 0;
  return radii;
}

/**
 * Build path with per-corner radius (array) or uniform radius (number).
 */
export function roundedOrthogonalPath(points, radii) {
  const uniform = typeof radii === 'number';
  const n = points.length;
  if (n < 3) return '';

  if (uniform && radii <= 0) {
    let d = `M${fmt(points[0].x)},${fmt(points[0].y)}`;
    for (let i = 1; i < n; i++) d += `L${fmt(points[i].x)},${fmt(points[i].y)}`;
    return d + 'Z';
  }

  const cornerData = [];

  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const curr = points[i];
    const next = points[(i + 1) % n];
    const radius = radiusAt(radii, i);

    const vInX = curr.x - prev.x;
    const vInY = curr.y - prev.y;
    const vOutX = next.x - curr.x;
    const vOutY = next.y - curr.y;

    const lenIn = Math.hypot(vInX, vInY);
    const lenOut = Math.hypot(vOutX, vOutY);
    const r = Math.min(radius, lenIn / 2, lenOut / 2);

    const turn = crossZ(vInX, vInY, vOutX, vOutY);
    const convex = turn > 0;

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

    if (r > 0.001) {
      parts.push(`A${fmt(r)},${fmt(r)} 0 0 ${sweep} ${fmt(pOut.x)},${fmt(pOut.y)}`);
    } else {
      parts.push(`L${fmt(pOut.x)},${fmt(pOut.y)}`);
    }

    if (dist(pOut, nextIn) > 0.001) {
      parts.push(`L${fmt(nextIn.x)},${fmt(nextIn.y)}`);
    }
  }

  parts.push('Z');
  return parts.join('');
}

export function interpolateRadii(a, b, t) {
  return a.map((ra, i) => ra + (b[i] - ra) * t);
}
