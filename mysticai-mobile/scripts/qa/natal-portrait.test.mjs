/**
 * Haritam (natal portrait) QA.
 *
 * Behavioural half: compiles the pure interpretation-support modules — the ones with no native or
 * network imports — and exercises the logic that decides what the user reads.
 *
 * Static half: asserts the contract that cannot be unit-tested here. Two things in particular:
 * every i18n key the new surfaces reference must exist in both TR and EN (a missing key ships a
 * raw dotted string to a real user), and the technical astrology data must still be reachable
 * rather than deleted by the redesign.
 *
 * Run: npm run qa:natal-portrait
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');
const readJson = (path) => JSON.parse(read(path));

// ── compile the pure modules ────────────────────────────────────────────────
const outDir = mkdtempSync(join(tmpdir(), 'natal-portrait-'));
let chartLevels;
let topicMeta;
try {
  execFileSync(
    join(root, 'node_modules/.bin/tsc'),
    [
      join(root, 'src/features/natal/chartLevels.ts'),
      join(root, 'src/features/natal/topicMeta.ts'),
      '--outDir', outDir,
      '--target', 'es2022',
      '--module', 'es2022',
      '--moduleResolution', 'bundler',
      '--skipLibCheck',
    ],
    { stdio: 'pipe' },
  );
  // tsc cannot emit .mjs directly; rename so node loads the output as an ES module. The modules
  // are deliberately free of React and of the HTTP client, so they compile in isolation.
  const rename = (name) => {
    const compiled = join(outDir, `${name}.mjs`);
    renameSync(join(outDir, `${name}.js`), compiled);
    return compiled;
  };
  rename('types');
  chartLevels = await import(pathToFileURL(rename('chartLevels')).href);
  topicMeta = await import(pathToFileURL(rename('topicMeta')).href);
} catch (error) {
  rmSync(outDir, { recursive: true, force: true });
  throw error;
}

// A translator stub that echoes the key plus its interpolations, so a test can assert both that
// the right key was chosen and that the real counts were passed into it.
const t = (key, options) =>
  options ? `${key}(${JSON.stringify(options)})` : key;

// ── chart levels: tiers must follow the chart, not a constant ───────────────
const richContext = {
  chartId: 1,
  locale: 'tr',
  birthTimeKnown: true,
  sun: null,
  moon: null,
  ascendant: { sign: 'Leo', degree: 16 },
  chartRuler: null,
  planets: [
    { planet: 'Sun', sign: 'Pisces', degree: 16.2, absoluteLongitude: 346.2, house: 8, retrograde: false, anaretic: false, angular: false },
    { planet: 'Moon', sign: 'Virgo', degree: 4.5, absoluteLongitude: 154.5, house: 1, retrograde: false, anaretic: false, angular: true },
    { planet: 'Venus', sign: 'Aries', degree: 3.4, absoluteLongitude: 3.4, house: 10, retrograde: false, anaretic: false, angular: true },
  ],
  houses: [],
  aspects: [
    { planet1: 'Sun', planet2: 'NorthNode', type: 'SQUARE', angle: 89.87, orb: 0.13, strength: 'TIGHT', tone: 'TENSE' },
    { planet1: 'Moon', planet2: 'Venus', type: 'TRINE', angle: 118.9, orb: 1.1, strength: 'TIGHT', tone: 'SUPPORTIVE' },
    { planet1: 'Moon', planet2: 'Sun', type: 'SEXTILE', angle: 61.0, orb: 1.0, strength: 'TIGHT', tone: 'SUPPORTIVE' },
  ],
  elements: { Fire: 1, Earth: 4, Air: 2, Water: 3 },
  modalities: { Cardinal: 5, Fixed: 2, Mutable: 3 },
  emphasis: {
    dominantElement: 'Earth',
    dominantModality: 'Cardinal',
    dominantPlanets: ['Moon', 'Sun'],
    stelliumHouses: [],
    stelliumSigns: [],
    tenseAspectCount: 1,
    supportiveAspectCount: 2,
    missingElements: [],
  },
};

const levels = chartLevels.buildChartLevels(richContext, t);
const byKey = Object.fromEntries(levels.map((l) => [l.key, l]));

assert.equal(byKey.element_earth.tier, 'veryStrong', '4 earth planets is a real concentration');
assert.equal(byKey.element_water.tier, 'strong', '3 planets is strong, not very strong');
assert.equal(byKey.element_air.tier, 'balanced');
assert.equal(byKey.element_fire.tier, 'balanced', '1 planet is present, so not "sensitive"');

// 2 supportive of 3 aspects = 0.67 → veryStrong; 1 tense of 3 = 0.33 → balanced.
assert.equal(byKey.flow.tier, 'veryStrong');
assert.equal(byKey.growth_pressure.tier, 'balanced');
assert.equal(byKey.visibility.tier, 'strong', 'two angular planets');

// Every tier must carry the count it was derived from — that is what makes it explainable.
for (const level of levels) {
  assert.ok(level.reason, `level ${level.key} must state how it was determined`);
  assert.ok(
    level.reason.startsWith('natalPortrait.levelReason'),
    `level ${level.key} must use a translated reason key, got: ${level.reason}`,
  );
}
assert.match(byKey.element_earth.reason, /"count":4/, 'the reason must quote the real planet count');
assert.match(byKey.flow.reason, /"supportive":2/);
assert.match(byKey.flow.reason, /"total":3/);

// A different chart must produce different tiers — the old radar could not do this.
const airyContext = {
  ...richContext,
  elements: { Fire: 4, Earth: 0, Air: 4, Water: 2 },
  emphasis: { ...richContext.emphasis, dominantElement: 'Fire', dominantModality: 'Mutable' },
};
const airyLevels = Object.fromEntries(
  chartLevels.buildChartLevels(airyContext, t).map((l) => [l.key, l]),
);
assert.equal(airyLevels.element_fire.tier, 'veryStrong');
assert.equal(airyLevels.element_earth.tier, 'sensitive', 'a missing element must read as sensitive');
assert.notEqual(
  airyLevels.element_earth.tier,
  byKey.element_earth.tier,
  'tiers must move with the chart',
);

// ── no birth time: nothing house-dependent may be claimed ───────────────────
const noTimeContext = { ...richContext, birthTimeKnown: false, ascendant: null };
const noTimeLevels = chartLevels.buildChartLevels(noTimeContext, t);
assert.ok(
  !noTimeLevels.some((l) => l.key === 'visibility'),
  'visibility depends on houses and must be omitted without a birth time',
);
assert.ok(noTimeLevels.length > 0, 'element balance is still readable without a birth time');

assert.deepEqual(chartLevels.buildChartLevels(null, t), [], 'no context yields no levels');

// ── placement levels are scoped to that planet, not the whole chart ─────────
const moonLevels = chartLevels.buildPlacementLevels(richContext, 'Moon', t);
assert.ok(moonLevels.length > 0);
assert.match(
  moonLevels.find((l) => l.key === 'support').reason,
  /"total":2/,
  'only the two aspects touching the Moon may be counted',
);
assert.ok(
  moonLevels.some((l) => l.key === 'prominence'),
  'an angular Moon must be called out',
);
assert.deepEqual(
  chartLevels.buildPlacementLevels(noTimeContext, 'Ascendant', t),
  [],
  'there is no ascendant to read without a birth time',
);

// ── topic ordering ──────────────────────────────────────────────────────────
const shuffled = [
  { id: 'challenges' },
  { id: 'core_character' },
  { id: 'brand_new_topic' },
  { id: 'emotional_world' },
];
const sorted = topicMeta.sortTopics(shuffled, topicMeta.ABOUT_ME_ORDER);
assert.deepEqual(
  sorted.map((topic) => topic.id),
  ['core_character', 'emotional_world', 'challenges', 'brand_new_topic'],
  'known topics take the fixed order; unknown ones survive at the end',
);
assert.notEqual(topicMeta.topicIcon('love'), topicMeta.topicIcon('career'));
assert.ok(topicMeta.topicIcon('unknown_topic'), 'an unmapped topic still gets an icon');

rmSync(outDir, { recursive: true, force: true });

// ── i18n contract: TR and EN must stay in lockstep ──────────────────────────
const tr = readJson('src/i18n/tr.json');
const en = readJson('src/i18n/en.json');

const flatten = (value, prefix = '') => {
  const out = new Set();
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      for (const nested of flatten(child, path)) out.add(nested);
    } else {
      out.add(path);
    }
  }
  return out;
};

const trKeys = flatten(tr.natalPortrait ?? {});
const enKeys = flatten(en.natalPortrait ?? {});
assert.deepEqual([...trKeys].sort(), [...enKeys].sort(), 'natalPortrait must be identical in TR and EN');
assert.ok(trKeys.size > 50, 'the natalPortrait namespace looks truncated');

// Every t('natalPortrait.x') the feature references must actually resolve.
const featureSources = [
  'src/features/natal/chartLevels.ts',
  'src/features/natal/placementLesson.ts',
  'src/features/natal/components/PortraitHeroCard.tsx',
  'src/features/natal/components/BigThreeStrip.tsx',
  'src/features/natal/components/BigThreeDetailSheet.tsx',
  'src/features/natal/components/TopicDetailSheet.tsx',
  'src/features/natal/components/LearnPlacementCard.tsx',
  'src/features/natal/components/AspectStorySection.tsx',
  'src/features/natal/components/AskChartSection.tsx',
  'src/features/natal/components/QualitativeLevels.tsx',
  'src/features/natal/components/EvidenceDisclosure.tsx',
  'src/features/natal/components/NatalPortraitExperience.tsx',
  'src/app/(tabs)/natal-chart.tsx',
];

const referenced = new Set();
for (const file of featureSources) {
  const source = read(file);
  for (const match of source.matchAll(/t\(\s*'(natalPortrait\.[A-Za-z0-9_.]+)'/g)) {
    referenced.add(match[1].replace('natalPortrait.', ''));
  }
}
assert.ok(referenced.size > 25, `expected many natalPortrait keys, found ${referenced.size}`);

const missing = [...referenced].filter((key) => !trKeys.has(key));
assert.deepEqual(missing, [], `missing TR translations: ${missing.join(', ')}`);

// The level tiers are built as template keys, so assert them explicitly.
for (const tier of ['veryStrong', 'strong', 'balanced', 'sensitive']) {
  assert.ok(trKeys.has(`level.${tier}`), `missing tier translation: ${tier}`);
}
for (const element of ['fire', 'earth', 'air', 'water']) {
  assert.ok(trKeys.has(`element.${element}`), `missing element translation: ${element}`);
}
for (const modality of ['cardinal', 'fixed', 'mutable']) {
  assert.ok(trKeys.has(`modality.${modality}`), `missing modality translation: ${modality}`);
}

assert.ok(Array.isArray(tr.natalPortrait.askSuggestions), 'ask suggestions must be a list');
assert.equal(
  tr.natalPortrait.askSuggestions.length,
  en.natalPortrait.askSuggestions.length,
  'TR and EN must offer the same number of suggested questions',
);

// ── the technical chart must survive the redesign ───────────────────────────
const screen = read('src/app/(tabs)/natal-chart.tsx');
for (const section of [
  'natal_chart_visual',
  'aspect_matrix_table',
  'cosmic_position_details',
  'cosmic_balance',
  'planet_positions',
  'aspect_list',
  'house_positions',
]) {
  assert.ok(
    screen.includes(`'${section}'`),
    `technical section ${section} must remain reachable, not be deleted`,
  );
}
assert.match(
  screen,
  /ADVANCED_NATAL_SECTION_KEYS/,
  'technical sections must be grouped under Astrolojik Detaylar',
);
assert.match(
  screen,
  /advancedSectionKeys\.map/,
  'the advanced group must actually render its sections',
);

// The portrait is user-scoped; a saved companion profile must keep the old surface.
assert.match(
  screen,
  /const portraitEnabled = !activeProfileIsSaved && !!chart;/,
  'the portrait must not render for saved companion profiles',
);

// ── entitlement must survive the redesign ───────────────────────────────────
// The old "Guru Yorum" accordion sat behind NATAL_CHART_DETAIL_VIEW. The portrait replaces it, so
// it must inherit that gate rather than quietly giving previously paid content away.
assert.match(
  screen,
  /detailUnlocked=\{detailSectionsUnlocked \|\| !natalDetailUnlockState\.usesMonetization\}/,
  'the portrait must reuse the existing natal-detail entitlement',
);
assert.match(
  screen,
  /onRequestUnlock=\{\(\) => setShowDetailUnlockSheet\(true\)\}/,
  'a locked card must open the existing unlock sheet',
);

const experience = read('src/features/natal/components/NatalPortraitExperience.tsx');
assert.match(
  experience,
  /if \(detailUnlocked\) return false;/,
  'unlocked users must see everything',
);
assert.match(
  experience,
  /group === 'about_me' && topic\.id === 'core_character'/,
  'exactly one topic stays free as the preview',
);
assert.match(
  experience,
  /disabled=\{loading \|\| !portrait \|\| !detailUnlocked\}/,
  '"Haritama Sor" generates per question and must stay gated',
);

// ── planet and house sheets must lead with meaning, not the old template ────
// These two surfaces are progressive enhancements of the existing sheets rather than parallel
// copies: with no reading (a saved companion profile) the previous body must still render.
const planetSheet = read('src/components/Astrology/PlanetBottomSheet.tsx');
assert.match(planetSheet, /reading\?: NatalPlacementReading \| null;/,
  'the planet sheet must accept the redesigned reading');
assert.match(planetSheet, /reading \? \(\s*<PlacementReadingBody/,
  'a reading must replace the legacy template body');
assert.match(planetSheet, /t\('planetSheet\.cardCharacter'\)/,
  'the legacy body must survive for profiles without a portrait');

const houseSheet = read('src/components/Astrology/HouseBottomSheet.tsx');
assert.match(houseSheet, /reading\?: NatalHouseReading \| null;/,
  'the house sheet must accept the redesigned reading');
assert.match(houseSheet, /reading \? \(\s*<HouseReadingBody/,
  'a reading must replace the legacy template body');

// The reading bodies must render the brief's ordered sections, synthesis included.
const readingBody = read('src/features/natal/components/ReadingBody.tsx');
for (const key of [
  'planetWhatItMeans', 'planetHowTheSign', 'planetWhereTheHouse', 'planetHowItShowsUp',
  'planetWorksWell', 'planetStrains', 'planetConnections',
  'houseWhatItMeans', 'houseYourSign', 'houseRuler', 'houseResidents',
  'houseSynthesis', 'houseStrengths', 'houseCautions',
]) {
  assert.ok(readingBody.includes(`natalPortrait.${key}`), `reading body is missing section: ${key}`);
  assert.ok(trKeys.has(key), `missing TR translation for reading section: ${key}`);
}
assert.match(readingBody, /EvidenceDisclosure/,
  'both reading bodies must keep the technical receipt behind a disclosure');

// ── every declared analytics event must actually fire ───────────────────────
const analyticsSource = read('src/features/natal/analytics.ts');
// Read the exported object only, so the local track() helper is not mistaken for an event.
const exportBlock = analyticsSource.slice(analyticsSource.indexOf('export const natalAnalytics'));
const declared = [...exportBlock.matchAll(/^  ([a-zA-Z]+)\(/gm)].map((m) => m[1]);

const featureFiles = [
  ...featureSources,
  'src/features/natal/hooks/useNatalPortrait.ts',
  'src/features/natal/components/TopicCard.tsx',
];
const firedSource = featureFiles.map(read).join('\n');
const neverFired = declared.filter((name) => !firedSource.includes(`natalAnalytics.${name}(`));
assert.deepEqual(neverFired, [],
  `analytics events declared but never fired: ${neverFired.join(', ')}`);
assert.ok(declared.length >= 13, `expected the full event set, found ${declared.length}`);

// Birth data must never travel in an event payload.
for (const forbidden of ['birthDate', 'birthTime', 'birthLocation', 'latitude', 'longitude', 'sunSign']) {
  assert.ok(!analyticsSource.includes(forbidden),
    `analytics must not carry birth data: ${forbidden}`);
}

// ── the client must never compute astrology ─────────────────────────────────
// Placements arrive already calculated by the backend engine. Any arithmetic on longitudes or
// degrees here would mean a second, divergent source of chart facts.
const service = read('src/services/natalPortrait.service.ts');
assert.ok(!/Math\.(floor|round|abs|atan2|sin|cos)\s*\(/.test(service),
  'the natal portrait client must not do astrological arithmetic');
assert.ok(!/%\s*360|julianDay|ephemeris/i.test(service),
  'the natal portrait client must not derive positions');

const levelsSource = read('src/features/natal/chartLevels.ts');
assert.ok(!/%\s*360|julianDay|ephemeris/i.test(levelsSource),
  'chart levels must count calculated facts, never recompute them');

console.log('natal-portrait QA: all checks passed');
