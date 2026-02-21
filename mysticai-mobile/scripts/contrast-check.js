#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
    ];
  }
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function parseRgbString(s) {
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(',').map((p) => p.trim());
  return parts.slice(0, 3).map((n) => Number(n));
}

function srgbToLinear(c) {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

function luminance(rgb) {
  const [r, g, b] = rgb;
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(rgb1, rgb2) {
  const L1 = luminance(rgb1);
  const L2 = luminance(rgb2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

function extractColorsFromConstants(fileText) {
  const re = /(\w+):\s*('(?:#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})'|rgba?\([^\)]+\)))/g;
  const out = {};
  let m;
  while ((m = re.exec(fileText))) {
    const key = m[1];
    let val = m[2].slice(1, -1);
    out[key] = val;
  }
  return out;
}

function findInlineHexes(dir) {
  const results = [];
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results.push(...findInlineHexes(full));
    } else if (/\.(tsx?|jsx?|json)$/.test(f)) {
      const txt = fs.readFileSync(full, 'utf8');
      const re = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})/g;
      const m = txt.match(re);
      if (m) results.push({ file: full, values: Array.from(new Set(m)) });
    }
  }
  return results;
}

const ROOT = path.join(__dirname, '..', 'src', 'constants');
const COLORS_FILE = path.join(ROOT, 'colors.ts');

if (!fs.existsSync(COLORS_FILE)) {
  console.error('colors.ts not found at', COLORS_FILE);
  process.exit(2);
}

const fileText = fs.readFileSync(COLORS_FILE, 'utf8');
const colors = extractColorsFromConstants(fileText);

const report = { checks: [], inlineUsages: [] };

const bgCandidates = ['background', 'surface'];
const textCandidates = ['textPrimary', 'textSecondary', 'text', 'subtext'];

for (const t of textCandidates) {
  if (!colors[t]) continue;
  let textColor = colors[t];
  let textRgb = null;
  if (textColor.startsWith('#')) textRgb = hexToRgb(textColor);
  else if (textColor.startsWith('rgb')) textRgb = parseRgbString(textColor);
  if (!textRgb) continue;

  for (const b of bgCandidates) {
    if (!colors[b]) continue;
    let bgColor = colors[b];
    let bgRgb = bgColor.startsWith('#') ? hexToRgb(bgColor) : parseRgbString(bgColor);
    if (!bgRgb) continue;
    const ratio = contrastRatio(textRgb, bgRgb);
    report.checks.push({
      text: t,
      background: b,
      textValue: textColor,
      bgValue: bgColor,
      contrast: Number(ratio.toFixed(2)),
      passesAA_normal: ratio >= 4.5,
      passesAA_large: ratio >= 3.0,
    });
  }
}

// find inline hex usages
const inline = findInlineHexes(path.join(__dirname, '..'));
report.inlineUsages = inline;

const outPath = path.join(__dirname, '..', 'contrast-report.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
console.log('Contrast report written to', outPath);

// summary
let failed = 0;
for (const c of report.checks) {
  if (!c.passesAA_normal) failed++;
}
console.log('Summary: checks=', report.checks.length, 'inlineFiles=', report.inlineUsages.length, 'failures=', failed);
process.exit(failed > 0 ? 1 : 0);

