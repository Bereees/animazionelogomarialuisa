import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function extractPath(svgContent) {
  const match = svgContent.match(/<path[^>]*\sd="([^"]+)"/);
  if (!match) throw new Error('Path not found');
  return match[1];
}

function extractViewBox(svgContent) {
  const match = svgContent.match(/viewBox="([^"]+)"/);
  if (!match) throw new Error('viewBox not found');
  return match[1].split(/\s+/).map(Number);
}

function scalePath(d, sx, sy) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
  const out = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[a-zA-Z]/.test(t)) {
      const cmd = t;
      out.push(cmd);
      i++;
      const upper = cmd.toUpperCase();
      let coordCount = 0;
      switch (upper) {
        case 'M':
        case 'L':
        case 'T':
          coordCount = 2;
          break;
        case 'H':
          coordCount = 1;
          break;
        case 'V':
          coordCount = 1;
          break;
        case 'C':
          coordCount = 6;
          break;
        case 'S':
        case 'Q':
          coordCount = 4;
          break;
        case 'A':
          coordCount = 7;
          break;
        case 'Z':
          coordCount = 0;
          break;
        default:
          throw new Error(`Unknown command: ${cmd}`);
      }
      for (let c = 0; c < coordCount; c++) {
        const val = parseFloat(tokens[i]);
        if (upper === 'H') {
          out.push(String(val * sx));
        } else if (upper === 'V') {
          out.push(String(val * sy));
        } else if (upper === 'A') {
          if (c === 0 || c === 1) out.push(String(val * (c === 0 ? sx : sy)));
          else out.push(tokens[i]);
        } else {
          out.push(String(c % 2 === 0 ? val * sx : val * sy));
        }
        i++;
      }
    } else {
      i++;
    }
  }
  return out.join(' ');
}

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
    const sx = targetViewBox[2] / vb[2];
    const sy = targetViewBox[3] / vb[3];
    d = scalePath(d, sx, sy);
  }
  paths[key] = d;
}

const output = {
  viewBox: targetViewBox.join(' '),
  paths,
};

writeFileSync(join(root, 'paths.json'), JSON.stringify(output, null, 2));
console.log('Paths prepared:', Object.keys(paths));
console.log('Lengths:', Object.fromEntries(Object.entries(paths).map(([k, v]) => [k, v.length])));
