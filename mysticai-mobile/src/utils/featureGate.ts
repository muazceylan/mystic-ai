import type { UserProfile } from '../store/useAuthStore';

/**
 * Feature keys that can be gated by user type.
 * Add new keys here when new features need access control.
 */
export type FeatureKey =
  | 'daily_readings'
  | 'decision_compass'
  | 'cosmic_planner'
  | 'dreams'
  | 'numerology'
  | 'name_analysis'
  | 'spiritual'
  | 'premium_access'
  | 'data_persistence'
  | 'notifications'
  | 'cross_device_sync';

/**
 * Phase 1 config: all features are open for all user types (including GUEST).
 *
 * To restrict a feature to registered users in a future phase, set:
 *   requiresRegistered: true
 *
 * Example (Phase 2+):
 *   cross_device_sync: { requiresRegistered: true }
 */
const FEATURE_CONFIG: Record<FeatureKey, { requiresRegistered: boolean }> = {
  // Phase 1: open for all (including guests)
  daily_readings:    { requiresRegistered: false },
  decision_compass:  { requiresRegistered: false },
  cosmic_planner:    { requiresRegistered: false },
  dreams:            { requiresRegistered: false },
  numerology:        { requiresRegistered: false },
  name_analysis:     { requiresRegistered: false },
  spiritual:         { requiresRegistered: false },
  data_persistence:  { requiresRegistered: false },
  notifications:     { requiresRegistered: false },
  // Phase 2: requires registration
  premium_access:    { requiresRegistered: true },
  cross_device_sync: { requiresRegistered: true },
};

/**
 * Central capability check. Use this instead of inline user type checks.
 *
 * @example
 *   if (!canUseFeature(user, 'dreams')) { showLinkAccountPrompt(); }
 */
export function canUseFeature(user: UserProfile | null | undefined, feature: FeatureKey): boolean {
  const config = FEATURE_CONFIG[feature];
  if (!config) return true; // unknown feature key: allow by default

  if (config.requiresRegistered && (user?.userType === 'GUEST' || user?.isAnonymous)) {
    return false;
  }
  return true;
}

/** Shorthand helpers */
export const canPersistData = (user: UserProfile | null | undefined) =>
  canUseFeature(user, 'data_persistence');

export const canUseNotifications = (user: UserProfile | null | undefined) =>
  canUseFeature(user, 'notifications');

export const canAccessPremium = (user: UserProfile | null | undefined) =>
  canUseFeature(user, 'premium_access');

export const canSyncAcrossDevices = (user: UserProfile | null | undefined) =>
  canUseFeature(user, 'cross_device_sync');
