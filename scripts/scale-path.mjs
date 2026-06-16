export function scalePath(d, sx, sy) {
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
