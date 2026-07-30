import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const repositoryRoot = resolve(root, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const readJson = (path) => JSON.parse(read(path));

function getPath(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

const en = readJson('src/i18n/en.json');
const tr = readJson('src/i18n/tr.json');
const requiredTranslationPaths = [
  'surfaceTitles.journey',
  'homePersonalPlan.title',
  'homePersonalPlan.errorTitle',
  'homePersonalPlan.preparingTitle',
  'homeJourney.title',
  'journey.title',
  'journey.emptyTitle',
  'journey.partialData',
  'dailyTransits.planningNoticeTitle',
  'dailyTransits.planningNoticeBody',
  'discover.categories.dailyLife.title',
  'discover.categories.astrologyInsights.title',
  'discover.modules.todayPlan.title',
  'discover.modules.dreamJournal.title',
];

for (const path of requiredTranslationPaths) {
  assert.equal(typeof getPath(en, path), 'string', `Missing English translation: ${path}`);
  assert.equal(typeof getPath(tr, path), 'string', `Missing Turkish translation: ${path}`);
}

const personalPlan = read('src/components/Home/PersonalPlanCard.tsx');
for (const marker of [
  'home-personal-plan-loading',
  'home-personal-plan-error',
  'home-personal-plan-empty',
  'home-personal-plan-open',
  'home-personal-plan-planner',
  'accessibilityRole="progressbar"',
]) {
  assert.ok(personalPlan.includes(marker), `Personal Plan contract is missing: ${marker}`);
}

const journey = read('src/app/(tabs)/journey.tsx');
for (const marker of ['journey-loading', 'journey-empty', 'journey-populated', 'journey.partialData']) {
  assert.ok(journey.includes(marker), `Journey state contract is missing: ${marker}`);
}

const navigation = [
  read('src/screens/HomeScreen.tsx'),
  read('src/app/(tabs)/discover.tsx'),
  read('src/app/(tabs)/_layout.tsx'),
].join('\n');
for (const route of [
  '/(tabs)/today-actions',
  '/(tabs)/calendar',
  '/(tabs)/decision-compass-tab',
  '/(tabs)/dreams',
  '/(tabs)/journey',
]) {
  const hiddenRouteName = route.split('/').at(-1);
  assert.ok(
    navigation.includes(route) || (hiddenRouteName && navigation.includes(`name="${hiddenRouteName}"`)),
    `Route not exposed: ${route}`,
  );
}

const analyticsSource = [
  read('src/screens/HomeScreen.tsx'),
  read('src/app/(tabs)/today-actions.tsx'),
  read('src/app/(tabs)/calendar.tsx'),
  read('src/app/decision-compass.tsx'),
  read('src/app/(tabs)/dreams.tsx'),
  read('src/spiritual/screens/SpiritualHomeScreen.tsx'),
  read('src/spiritual/screens/CounterScreen.tsx'),
  journey,
].join('\n');
for (const event of [
  'home_personal_plan_impression',
  'home_personal_plan_opened',
  'personal_plan_action_opened',
  'personal_plan_action_completed',
  'personal_plan_feedback_sent',
  'cosmic_planner_opened',
  'cosmic_planner_reminder_created',
  'decision_compass_opened',
  'decision_compass_started',
  'dream_journal_opened',
  'dream_entry_created',
  'spiritual_practice_opened',
  'spiritual_practice_completed',
  'journey_summary_opened',
  'astrology_context_opened',
]) {
  assert.ok(analyticsSource.includes(`'${event}'`), `Analytics event not wired: ${event}`);
}

for (const sensitivePayloadKey of ['dream_text:', 'decision_text:', 'prayer_text:', 'birth_date:']) {
  assert.ok(!analyticsSource.includes(sensitivePayloadKey), `Sensitive analytics payload detected: ${sensitivePayloadKey}`);
}

const englishSubtitle = 'Daily Plan & Personal Growth';
const turkishSubtitle = 'Günlük Plan ve Kişisel Gelişim';
assert.ok(englishSubtitle.length <= 30, 'English subtitle exceeds Apple limit');
assert.ok(turkishSubtitle.length <= 30, 'Turkish subtitle exceeds Apple limit');

const resubmission = readFileSync(
  resolve(repositoryRoot, 'docs/app-store/guideline-4.3b-resubmission.md'),
  'utf8',
);
for (let section = 1; section <= 12; section += 1) {
  assert.ok(resubmission.includes(`## ${section}.`), `Resubmission document is missing section ${section}`);
}

const tutorialCopy = [
  read('src/features/tutorial/registry/tutorialRegistry.en.ts'),
  read('src/features/tutorial/registry/tutorialRegistry.ts'),
].join('\n');
assert.ok(!tutorialCopy.includes('Save your result to revisit it later'), 'Tutorial claims unsupported decision history');
assert.ok(!tutorialCopy.includes('Karar Giriş Alanı'), 'Tutorial claims unsupported free-text decision input');

console.log('Guideline 4.3(b) static QA passed.');
