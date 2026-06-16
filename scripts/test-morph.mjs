import flubber from 'flubber';
const { interpolate } = flubber;
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { paths } = JSON.parse(readFileSync(join(root, 'paths.json'), 'utf8'));

try {
  const i1 = interpolate(paths.logomarialuisa, paths.tondo);
  const i2 = interpolate(paths.tondo, paths.squadrato);
  const i3 = interpolate(paths.squadrato, paths.logomarialuisa);
  console.log('Morph OK', i1(0.5).slice(0, 50));
} catch (e) {
  console.error('Morph failed:', e.message);
  process.exit(1);
}
