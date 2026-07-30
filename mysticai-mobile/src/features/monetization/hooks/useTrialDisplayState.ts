import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ResolvedPaywallProduct } from '../types/billing';
import { checkRevenueCatTrialEligibility } from '../services/revenueCatService';
import {
  getFreeIntroOffer,
  getSubscriptionPeriod,
  parseTrialDuration,
  type TrialDisplayState,
} from '../utils/trialDisplay';

export function useTrialDisplayState(product: ResolvedPaywallProduct): TrialDisplayState {
  const { t } = useTranslation();
  const requestIdRef = useRef(0);
  const [state, setState] = useState<TrialDisplayState>({ status: 'not_eligible' });
  const revenueCatPackage = product.revenueCatPackage;

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    let mounted = true;

    const setCurrentState = (nextState: TrialDisplayState) => {
      if (mounted && requestId === requestIdRef.current) {
        setState(nextState);
      }
    };

    if (Platform.OS !== 'ios' || !revenueCatPackage) {
      setCurrentState({ status: 'not_eligible' });
      return () => {
        mounted = false;
      };
    }

    const storeProduct = revenueCatPackage.product;
    const freeIntroOffer = getFreeIntroOffer(storeProduct);
    const trialDuration = freeIntroOffer
      ? parseTrialDuration(freeIntroOffer.period, freeIntroOffer.cycles)
      : null;
    const subscriptionPeriod = getSubscriptionPeriod(revenueCatPackage);

    if (!freeIntroOffer || !trialDuration || !subscriptionPeriod) {
      setCurrentState({ status: 'not_eligible' });
      return () => {
        mounted = false;
      };
    }

    setCurrentState({ status: 'loading' });

    void checkRevenueCatTrialEligibility(storeProduct.identifier).then((eligible) => {
      if (!eligible) {
        setCurrentState({ status: 'not_eligible' });
        return;
      }

      const durationText = t(`premium.trialDuration.${trialDuration.unit}`, {
        count: trialDuration.count,
      });
      const periodText = t(`premium.period.${subscriptionPeriod}`);
      setCurrentState({
        status: 'eligible',
        durationText,
        durationIso8601: trialDuration.iso8601,
        recurringPriceText: t('premium.recurringPrice', {
          price: storeProduct.priceString,
          period: periodText,
        }),
      });
    });

    return () => {
      mounted = false;
    };
  }, [revenueCatPackage, t]);

  return state;
}
