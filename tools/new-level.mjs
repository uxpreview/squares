// Scaffold a new level in one step.
//
//   npm run new-level -- <id>
//   npm run new-level -- <id> --name "Gooseworth Manor" --areas "Grand Hall, Library, Cellar"
//
// Reads the level's brief (docs/levels/<id>.md) for its name, one-liner, areas
// (the first column of the Areas table) and palette (the hex codes under
// "Palette and plate"). Then makes:
//
//   src/maps/<id>/map.js          the map: every area on a simple grid, ready to arrange
//   src/maps/<id>/style.js        the style sheet: the brief's inks, greybox tones
//   src/maps/<id>/ambient.js      backdrop and sky: print marks and a caption
//   src/maps/<id>/areas/*.js      a greybox placeholder per area (src/maps/greybox.js)
//
// adds the level to src/maps/index.js (hidden until it ships), and starts the
// brief from docs/levels/_TEMPLATE.md if there isn't one. It never overwrites
// a file that exists. Next steps are printed at the end.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--') && !isOptionValue(a));
const opt = (name) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : null;
};
function isOptionValue(a) {
  const i = args.indexOf(a);
  return i > 0 && args[i - 1].startsWith('--');
}

if (!id || !/^[a-z][a-z0-9-]*$/.test(id)) {
  console.log('Usage: npm run new-level -- <id> [--name "Name"] [--areas "Area one, Area two"]');
  console.log('The id is lowercase letters, numbers and dashes, like "manor". It goes in links and saves.');
  process.exit(1);
}

// ---------- The brief ----------
const briefPath = path.join(root, 'docs/levels', id + '.md');
const brief = fs.existsSync(briefPath) ? readBrief(fs.readFileSync(briefPath, 'utf8')) : {};
const name = opt('name') || brief.name || titleCase(id);
const areaNames = (opt('areas') ? opt('areas').split(',') : brief.areas || []).map((s) => s.trim()).filter(Boolean);
if (!areaNames.length) {
  console.log(`No areas. Add an Areas table to ${rel(briefPath)} or pass --areas "One, Two, Three".`);
  process.exit(1);
}
const tagline = opt('tagline') || brief.tagline || `${areaNames.length} areas. One loose goose.`;
const palette = brief.palette && brief.palette.length ? brief.palette : [
  { name: 'ink', hex: '#252D52' }, { name: 'coral', hex: '#E3603F' }, { name: 'teal', hex: '#2E8B84' },
  { name: 'mustard', hex: '#EDB53B' }, { name: 'blush', hex: '#F3BCA9' }, { name: 'paper', hex: '#F1E8D6' },
];
const paper = (palette.find((p) => /paper/i.test(p.name)) || { hex: '#F1E8D6' }).hex;
const inks = palette.filter((p) => !/paper/i.test(p.name));

const areas = areaNames.map((n) => ({ name: n, id: slug(n), js: camel(slug(n)) }));
const dupes = areas.filter((a, i) => areas.findIndex((b) => b.id === a.id) !== i);
if (dupes.length) {
  console.log('Two areas would get the same id: ' + dupes.map((a) => a.id).join(', '));
  process.exit(1);
}

// ---------- Files ----------
const dir = path.join(root, 'src/maps', id);
const made = [], kept = [];
function write(file, text) {
  if (fs.existsSync(file)) { kept.push(rel(file)); return; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  made.push(rel(file));
}

write(path.join(dir, 'style.js'), styleJs());
write(path.join(dir, 'ambient.js'), ambientJs());
write(path.join(dir, 'map.js'), mapJs());
areas.forEach((a, i) => write(path.join(dir, 'areas', a.id + '.js'), areaJs(a, i)));
if (!fs.existsSync(briefPath)) {
  const tpl = fs.readFileSync(path.join(root, 'docs/levels/_TEMPLATE.md'), 'utf8');
  write(briefPath, tpl.replace('<Level name>', name));
}
register();

console.log(`\n${name} (${id})`);
for (const f of made) console.log('  made  ' + f);
for (const f of kept) console.log('  kept  ' + f + ' (already there)');
console.log(`
Next:
  1. Arrange the areas in src/maps/${id}/map.js (where each sits, storeys, cutaway).
  2. Block out each area in src/maps/${id}/areas/ with src/maps/greybox.js.
  3. Look at it:  node tools/shoot.mjs ${id} out.png   and   npm run qa -- ${id}
  4. Send the contact sheet to the owner for the greybox gate (docs/PROCESS.md, step 4).
It's hidden from the picker until it ships; open it at #/${id}.`);

// ---------- Templates ----------
function styleJs() {
  const keys = inks.map((p) => [camel(slug(p.name)), p.hex]);
  return `// ${name}: the style sheet. Every area takes its colors and shared props from
// here, so the whole level stays one plate. The inks come from the brief
// (docs/levels/${id}.md, "Palette and plate"). Add recurring props (a lamp, a
// sign, a character's look) here once, rather than in each area.
import { tint, shade } from '../../engine/art.js';

export const INK = {
${keys.map(([k, v]) => `  ${k}: '${v}',`).join('\n')}
};

// The paper this level is printed on.
export const PAPER = '${paper}';

// Greybox floor tones, one per area in turn, so the plan reads at a glance.
const inks = Object.values(INK);
export const TONE = inks.map((c) => tint(c, 0.55)).concat(inks.map((c) => tint(c, 0.3)));
export const BLOCK = inks.map((c) => shade(c, 0.05));
`;
}

function ambientJs() {
  return `// Around ${name}: what's drawn under and over its areas (the backdrop and the
// sky). Starts as print marks and a caption; the level's weather, grounds and
// silhouette go here.
import { C, alpha } from '../../engine/art.js';
import { reg, birds, geeseV } from '../shared.js';

export function backdrop(ctx, t, world) {
  const [X0, X1, Y0, Y1] = world.overviewBox(false);
  reg(ctx, (X0 + X1) / 2, Y0 + 1);
  reg(ctx, (X0 + X1) / 2, Y1 - 1);
  const k = 40;
  ctx.save();
  ctx.translate((X0 + X1) / 2, Y1 - 4);
  ctx.scale(1 / k, 1 / k);
  ctx.font = \`\${0.9 * k}px "Rethink Sans", system-ui, sans-serif\`;
  ctx.fillStyle = alpha(C.ink, 0.55);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(${JSON.stringify(name.toUpperCase() + '  ·  GREYBOX')}, 0, 0);
  ctx.restore();
}

export function sky(ctx, t, world, fx) {
  const [X0, X1] = world.overviewBox(false);
  birds(ctx, t, 0, (X1 - X0) / 2);
  if (fx.parade) geeseV(ctx, t, fx.parade, world.totalGeese, (X1 - X0) / 2);
}
`;
}

function mapJs() {
  const cols = Math.ceil(Math.sqrt(areas.length));
  return `// ${name}. Scaffolded by tools/new-level.mjs: the areas sit on a simple grid.
// Arrange them for real (where each one sits, storeys, how they cut away) at
// the greybox stage; see docs/PROCESS.md, step 4, and README "Adding a place".
import { S } from '../../engine/iso.js';
import { PAPER } from './style.js';
import { backdrop, sky } from './ambient.js';

${areas.map((a) => `import ${a.js} from './areas/${a.id}.js';`).join('\n')}

const AREAS = [${areas.map((a) => a.js).join(', ')}];
const COLS = ${cols};
const GAP = 5; // space between areas

export default {
  id: '${id}',
  name: ${JSON.stringify(name)},
  tagline: ${JSON.stringify(tagline)},
  zones: AREAS.map((zone, i) => ({
    zone,
    at: [(i % COLS) * (S + GAP), Math.floor(i / COLS) * (S + GAP), 0],
    tag: '',
  })),
  cutaway: { front: true },
  plate: { paper: PAPER },
  backdrop,
  sky,
  words: {
    zone: 'room',
    hint: 'Tap a room to step inside. Pinch or scroll to zoom.',
    whole: 'The whole place',
    complete: 'Every goose, found.',
  },
};
`;
}

function areaJs(a, i) {
  const goose = i === 0
    ? `\n    R.goose([12, 5, 0], { dir: 'l' }); // where the goose is (move it, or into another area)`
    : '';
  return `// ${a.name} (greybox placeholder). Block it out with src/maps/greybox.js: the
// floor and walls, doors, the hero, furniture, where people stand, the finds.
// Keep the id: it's in links and saves.
import { shell, block, pin } from '../../greybox.js';
import { TONE, BLOCK } from '../style.js';

export default {
  id: '${a.id}',
  name: ${JSON.stringify(a.name)},
  blurb: 'TODO: one or two short, funny sentences about what is going on here.',

  build(R) {
    shell(R, { floor: TONE[${i} % TONE.length], name: ${JSON.stringify(a.name.toUpperCase())} });
    block(R, 6, 6, 4, 4, 1.2, BLOCK[${i} % BLOCK.length], 'HERO');
    pin(R, { id: 'find-1', label: ${JSON.stringify('Placeholder one in ' + a.name)}, at: [3, 12, 0.3] }, 1);
    pin(R, { id: 'find-2', label: ${JSON.stringify('Placeholder two in ' + a.name)}, at: [12, 12, 0.3] }, 2);
    pin(R, { id: 'find-3', label: ${JSON.stringify('Placeholder three in ' + a.name)}, at: [8, 3, 0.3] }, 3);${goose}
  },
};
`;
}

// Add the level to the picker list, hidden until it ships.
function register() {
  const file = path.join(root, 'src/maps/index.js');
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes(`id: '${id}'`)) { kept.push(rel(file) + ` (${id} is already listed)`); return; }
  const entry = `  {
    id: '${id}',
    name: ${JSON.stringify(name)},
    tagline: ${JSON.stringify(tagline)},
    ink: '${(inks[2] || inks[0]).hex}',
    hidden: true, // unfinished: out of the picker until it ships (open it at #/${id})
    load: () => import('./${id}/map.js'),
  },
];`;
  const at = text.lastIndexOf('];');
  fs.writeFileSync(file, text.slice(0, at) + entry + text.slice(at + 2));
  made.push(rel(file) + ' (listed, hidden)');
}

// ---------- Helpers ----------
function readBrief(text) {
  const lines = text.split('\n');
  const section = (title) => {
    const i = lines.findIndex((l) => new RegExp(`^##\\s+${title}\\s*$`, 'i').test(l));
    if (i < 0) return [];
    const out = [];
    for (let j = i + 1; j < lines.length && !/^##\s/.test(lines[j]); j++) out.push(lines[j]);
    return out;
  };
  const title = (lines.find((l) => /^#\s/.test(l)) || '').replace(/^#\s+/, '').trim();
  const oneLine = section('In one line').find((l) => l.trim()) || '';
  // First column of the Areas table, minus the header and divider rows.
  const rows = section('Areas').filter((l) => l.trim().startsWith('|'));
  const areasOut = rows.slice(2).map((l) => l.split('|')[1].replace(/\*\*/g, '').trim()).filter(Boolean);
  const paletteText = section('Palette and plate').join(' ');
  const paletteOut = [...paletteText.matchAll(/([A-Za-z][A-Za-z ]*?)\s*`(#[0-9A-Fa-f]{6})`/g)]
    .map((m) => ({ name: m[1].trim(), hex: m[2].toUpperCase() }));
  return { name: title && !title.startsWith('<') ? title : null, tagline: oneLine.trim(), areas: areasOut, palette: paletteOut };
}

function slug(s) {
  return s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').replace(/^the-/, '');
}
function camel(s) {
  const c = s.replace(/-([a-z0-9])/g, (_, ch) => ch.toUpperCase());
  return /^[0-9]/.test(c) ? '_' + c : c;
}
function titleCase(s) {
  return s.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}
function rel(f) {
  return path.relative(root, f);
}
