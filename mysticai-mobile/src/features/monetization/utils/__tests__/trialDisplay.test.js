jest.mock('react-native-purchases', () => ({
  INTRO_ELIGIBILITY_STATUS: {
    INTRO_ELIGIBILITY_STATUS_UNKNOWN: 0,
    INTRO_ELIGIBILITY_STATUS_INELIGIBLE: 1,
    INTRO_ELIGIBILITY_STATUS_ELIGIBLE: 2,
    INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS: 3,
  },
  PACKAGE_TYPE: {
    MONTHLY: 'MONTHLY',
    ANNUAL: 'ANNUAL',
  },
}));

const {
  getFreeIntroOffer,
  parseTrialDuration,
} = require('../trialMetadata');
const { isTrialEligibilityEligible } = require('../trialDisplay');
const { INTRO_ELIGIBILITY_STATUS } = require('react-native-purchases');

function storeProduct(overrides = {}) {
  return {
    identifier: 'astroguru_premium_monthly',
    priceString: '₺199,99',
    introPrice: {
      price: 0,
      priceString: '₺0,00',
      cycles: 1,
      period: 'P1W',
      periodUnit: 'WEEK',
      periodNumberOfUnits: 1,
    },
    ...overrides,
  };
}

describe('trial display metadata', () => {
  test.each([
    ['P1W', 1, { count: 1, unit: 'week', iso8601: 'P1W' }],
    ['P3D', 1, { count: 3, unit: 'day', iso8601: 'P3D' }],
    ['P2W', 1, { count: 2, unit: 'week', iso8601: 'P2W' }],
    ['P1M', 1, { count: 1, unit: 'month', iso8601: 'P1M' }],
  ])('formats metadata duration %s', (period, cycles, expected) => {
    expect(parseTrialDuration(period, cycles)).toEqual(expected);
  });

  test('accepts an actual free introductory offer', () => {
    expect(getFreeIntroOffer(storeProduct())).toEqual({ period: 'P1W', cycles: 1 });
  });

  test('rejects a paid introductory offer or missing offer', () => {
    expect(getFreeIntroOffer(storeProduct({
      introPrice: { ...storeProduct().introPrice, price: 9.99 },
    }))).toBeNull();
    expect(getFreeIntroOffer(storeProduct({ introPrice: null }))).toBeNull();
  });

  test('only ELIGIBLE permits trial display', () => {
    expect(isTrialEligibilityEligible(
      INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE,
    )).toBe(true);
    expect(isTrialEligibilityEligible(
      INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE,
    )).toBe(false);
    expect(isTrialEligibilityEligible(
      INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_UNKNOWN,
    )).toBe(false);
    expect(isTrialEligibilityEligible(
      INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS,
    )).toBe(false);
  });

  test('preserves the StoreProduct localized price string', () => {
    expect(storeProduct().priceString).toBe('₺199,99');
  });
});
