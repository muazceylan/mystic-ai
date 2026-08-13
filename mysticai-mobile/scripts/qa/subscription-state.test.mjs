import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const sourcePath = path.resolve('src/features/monetization/services/subscriptionSnapshot.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const module = { exports: {} };
new Function('module', 'exports', 'require', compiled)(module, module.exports, () => ({}));
const { resolvePremiumPlanKey, toSubscriptionSnapshot } = module.exports;

const ENTITLEMENT_ID = 'Astro Guru Pro';

function customerInfo(activeEntitlement) {
  return {
    entitlements: {
      active: activeEntitlement ? { [ENTITLEMENT_ID]: activeEntitlement } : {},
      all: activeEntitlement ? { [ENTITLEMENT_ID]: activeEntitlement } : {},
    },
    managementURL: 'https://apps.apple.com/account/subscriptions',
    requestDate: '2026-08-10T12:00:00Z',
  };
}

const yearlyEntitlement = {
  identifier: ENTITLEMENT_ID,
  productIdentifier: 'astroguru_premium_yearly',
  expirationDate: '2027-08-12T00:00:00Z',
  willRenew: true,
  periodType: 'NORMAL',
};

const active = toSubscriptionSnapshot(customerInfo(yearlyEntitlement), ENTITLEMENT_ID, '42');
assert.equal(active.isPremium, true);
assert.equal(active.status, 'premium');
assert.equal(active.productId, 'astroguru_premium_yearly');
assert.equal(active.willRenew, true);

const inactive = toSubscriptionSnapshot(customerInfo(null), ENTITLEMENT_ID, '42');
assert.equal(inactive.isPremium, false);
assert.equal(inactive.status, 'free');

const cancelledButActive = toSubscriptionSnapshot(customerInfo({
  ...yearlyEntitlement,
  willRenew: false,
}), ENTITLEMENT_ID, '42');
assert.equal(cancelledButActive.isPremium, true);
assert.equal(cancelledButActive.willRenew, false);

const trial = toSubscriptionSnapshot(customerInfo({
  ...yearlyEntitlement,
  periodType: 'TRIAL',
}), ENTITLEMENT_ID, '42');
assert.equal(trial.isPremium, true);
assert.equal(trial.isTrialing, true);

assert.equal(resolvePremiumPlanKey('astroguru_premium_monthly'), 'monthly');
assert.equal(resolvePremiumPlanKey('astroguru_premium_yearly'), 'yearly');
assert.equal(resolvePremiumPlanKey('legacy_lifetime'), 'premium');

console.info('subscription-state tests passed');
