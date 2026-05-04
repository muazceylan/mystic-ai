import type { PremiumBehavior } from '@/types';

export interface PremiumBehaviorOption {
  value: PremiumBehavior;
  label: string;
  description: string;
}

export interface PremiumRuleWarning {
  id: string;
  tone: 'warning' | 'info';
  message: string;
}

export const PREMIUM_BEHAVIOR_OPTIONS: PremiumBehaviorOption[] = [
  {
    value: 'NO_CHANGE',
    label: 'NO_CHANGE',
    description: 'Premium için özel davranış yok',
  },
  {
    value: 'UNLOCK_FREE',
    label: 'UNLOCK_FREE',
    description: 'Premium/trial kullanıcı ücretsiz erişir',
  },
  {
    value: 'DISCOUNT_TOKEN_COST',
    label: 'DISCOUNT_TOKEN_COST',
    description: 'Premium/trial kullanıcı indirimli token harcar',
  },
  {
    value: 'AD_FREE_ONLY',
    label: 'AD_FREE_ONLY',
    description: 'Reklam gösterilmez, token kuralı kalır',
  },
  {
    value: 'TOKEN_REQUIRED_EVEN_PREMIUM',
    label: 'TOKEN_REQUIRED_EVEN_PREMIUM',
    description: 'Premium kullanıcı da token harcar',
  },
];

export function getPremiumRuleWarnings(args: {
  premiumBehavior: PremiumBehavior | string | undefined;
  premiumTokenCost: number;
  isPremiumAdFree: boolean;
}): PremiumRuleWarning[] {
  const warnings: PremiumRuleWarning[] = [];
  const premiumBehavior: PremiumBehavior = PREMIUM_BEHAVIOR_OPTIONS.some((option) => option.value === args.premiumBehavior)
    ? (args.premiumBehavior as PremiumBehavior)
    : 'NO_CHANGE';
  const premiumTokenCost = Number.isFinite(args.premiumTokenCost) ? args.premiumTokenCost : 0;

  if (premiumBehavior === 'DISCOUNT_TOKEN_COST' && premiumTokenCost <= 0) {
    warnings.push({
      id: 'discount-missing-cost',
      tone: 'warning',
      message: 'DISCOUNT_TOKEN_COST seçili ama premiumTokenCost boş veya 0. Bu durumda premium kullanıcı fiilen ücretsiz unlock alır.',
    });
  }

  if (premiumBehavior === 'UNLOCK_FREE' && premiumTokenCost > 0) {
    warnings.push({
      id: 'unlock-free-cost-ignored',
      tone: 'warning',
      message: 'UNLOCK_FREE seçiliyken premiumTokenCost dikkate alınmaz. Değer kaydedilse bile gate tarafında kullanılmaz.',
    });
  }

  if (premiumBehavior === 'TOKEN_REQUIRED_EVEN_PREMIUM' && args.isPremiumAdFree) {
    warnings.push({
      id: 'token-required-ad-free',
      tone: 'info',
      message: 'TOKEN_REQUIRED_EVEN_PREMIUM ile premiumAdFree birlikteyse premium kullanıcı yine token harcar, sadece reklam gösterilmez.',
    });
  }

  return warnings;
}
