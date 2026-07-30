import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);
const read = async (path) => readFile(new URL(path, root), 'utf8');

const [sheet, service, tr, en] = await Promise.all([
  read('src/components/dreams/DreamExpansionSheet.tsx'),
  read('src/services/dream.service.ts'),
  read('src/i18n/tr.json').then(JSON.parse),
  read('src/i18n/en.json').then(JSON.parse),
]);

const requiredEvents = [
  'dream_expansion_option_selected',
  'dream_expansion_payment_confirmation_viewed',
  'dream_expansion_payment_confirmed',
  'dream_expansion_insufficient_balance',
  'dream_expansion_token_reserved',
  'dream_expansion_token_spent',
  'dream_expansion_token_refunded',
  'dream_expansion_generation_failed',
  'dream_expansion_existing_result_opened',
  'dream_expansion_regeneration_requested',
  'dream_expansion_completed',
];

for (const eventName of requiredEvents) {
  assert.ok(sheet.includes(`'${eventName}'`), `missing analytics event: ${eventName}`);
}

assert.ok(service.includes('pricingVersion: string'), 'pricing version contract is required');
assert.ok(!/expandAnalysis:[\\s\\S]*tokenCost\\s*:/.test(service), 'mobile must not send tokenCost');
assert.ok(!/expandAnalysis:[\\s\\S]*isPremium\\s*:/.test(service), 'mobile must not send isPremium');
assert.ok(sheet.includes("type DreamExpansionPaymentStatus"), 'payment state machine type is required');
assert.ok(sheet.includes("pricingVersion: pricingVersionOverride"), 'backend price quote must be echoed');
assert.ok(sheet.includes("DREAM_EXPANSION_PRICE_CHANGED"), 'price-change reconfirmation is required');

for (const locale of [tr, en]) {
  const expansion = locale?.dreams?.analysis?.expansion;
  assert.ok(expansion, 'dream expansion translations are required');
  assert.ok(expansion.ctaWithCost.includes('{{cost}}'), 'CTA must display backend cost');
  assert.ok(expansion.confirmBody.includes('{{remaining}}'), 'confirmation must show remaining balance');
  assert.ok(expansion.errors.DREAM_EXPANSION_PRICE_CHANGED, 'price-change copy is required');
  assert.ok(expansion.errors.TOKEN_REFUNDED, 'refund copy is required');
}

console.log(`dream-expansion mobile QA passed (${requiredEvents.length} analytics events)`);
