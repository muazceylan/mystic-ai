import type { UserProfile } from '../store/useAuthStore';

type OnboardingFields = Pick<UserProfile, 'birthDate' | 'birthCountry' | 'birthCity' | 'gender' | 'focusPoint' | 'userType' | 'isAnonymous'>;

function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

/**
 * Route guard helper for users who are authenticated but still missing
 * required onboarding/profile fields.
 *
 * All users — including guest (anonymous) sessions — must provide birth data
 * before accessing the main app. Returns true when onboarding is required.
 */
export function needsOnboarding(user: OnboardingFields | null | undefined): boolean {
  if (!user) return false;

  return (
    isBlank(user.birthDate) ||
    isBlank(user.birthCountry) ||
    isBlank(user.birthCity) ||
    isBlank(user.gender) ||
    isBlank(user.focusPoint)
  );
}
