import {
  INTRO_ELIGIBILITY_STATUS,
  PACKAGE_TYPE,
  type PurchasesPackage,
} from 'react-native-purchases';
export {
  getFreeIntroOffer,
  parseTrialDuration,
  type FreeIntroOffer,
  type TrialDuration,
  type TrialDurationUnit,
} from './trialMetadata';

export type TrialDisplayState =
  | { status: 'loading' }
  | {
      status: 'eligible';
      durationText: string;
      durationIso8601: string;
      recurringPriceText: string;
    }
  | { status: 'not_eligible' };

export function isTrialEligibilityEligible(status: INTRO_ELIGIBILITY_STATUS): boolean {
  return status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;
}

export function getSubscriptionPeriod(
  revenueCatPackage: PurchasesPackage,
): 'month' | 'year' | null {
  if (revenueCatPackage.packageType === PACKAGE_TYPE.MONTHLY) {
    return 'month';
  }
  if (revenueCatPackage.packageType === PACKAGE_TYPE.ANNUAL) {
    return 'year';
  }

  const subscriptionPeriod = revenueCatPackage.product.subscriptionPeriod?.toUpperCase();
  if (subscriptionPeriod === 'P1M') {
    return 'month';
  }
  if (subscriptionPeriod === 'P1Y') {
    return 'year';
  }

  return null;
}
