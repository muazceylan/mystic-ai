import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';

import { AccessibleText, Button, SafeScreen } from '../../components/ui';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants/tokens';
import { useTheme } from '../../context/ThemeContext';
import {
  getAdMobDevToolsStatus,
  loadRewardedAdProbe,
  openAdMobInspector,
  type AdMobDevToolsStatus,
} from '../../features/monetization/providers/admobDevTools';

// Development-only console for the AdMob mediation setup. Guarded by `__DEV__`
// exactly like `dev/levelplay.tsx`; the helpers it calls are no-ops in
// production regardless.
//
// The Ad Inspector is the authoritative way to confirm which mediation ad
// sources are actually in a given ad unit's waterfall.

function StatusRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <AccessibleText style={[styles.rowLabel, { color: colors.subtext }]}>{label}</AccessibleText>
      <AccessibleText style={[styles.rowValue, { color: colors.text }]}>{value}</AccessibleText>
    </View>
  );
}

export default function AdMobDevScreen() {
  const { colors } = useTheme();
  const [status, setStatus] = useState<AdMobDevToolsStatus>(() => getAdMobDevToolsStatus());
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    setStatus(getAdMobDevToolsStatus());
  }, []);

  const openInspector = useCallback(async () => {
    setBusy(true);
    try {
      const result = await openAdMobInspector();
      setLastAction(
        result.ok
          ? 'Ad Inspector closed. Open your rewarded unit → "Ad sources" to see the live waterfall.'
          : `Could not open: ${result.reason}`,
      );
    } finally {
      setBusy(false);
      refresh();
    }
  }, [refresh]);

  const probeAd = useCallback(async () => {
    setBusy(true);
    try {
      const result = await loadRewardedAdProbe();
      setLastAction(result.ok ? result.message : `Probe failed: ${result.reason}`);
    } finally {
      setBusy(false);
      refresh();
    }
  }, [refresh]);

  if (!__DEV__) {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <SafeScreen edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AccessibleText style={[styles.title, { color: colors.text }]}>
          AdMob Dev Tools
        </AccessibleText>
        <AccessibleText style={[styles.subtitle, { color: colors.subtext }]}>
          Development-only. Ads shown from the Ad Inspector never credit Guru.
        </AccessibleText>

        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: RADIUS.lg }]}>
          <StatusRow label="Dev tools" value={status.enabled ? 'enabled' : 'disabled'} />
          <StatusRow label="Ad provider" value={status.provider} />
          <StatusRow label="Native SDK" value={status.sdkAvailable ? 'available' : 'missing'} />
          <StatusRow label="Initialized" value={status.initialized ? 'yes' : 'no'} />
          <StatusRow label="Rewarded unit" value={status.rewardedUnitId ?? 'unresolved'} />
          <StatusRow label="Unit mode" value={status.rewardedUnitMode ?? '—'} />
          <StatusRow
            label="Test devices"
            value={
              status.testDeviceIdCount > 0
                ? `${status.testDeviceIdCount} configured`
                : 'none — emulators auto-register; physical devices need one'
            }
          />
        </View>

        <AccessibleText style={[styles.sectionTitle, { color: colors.text }]}>
          Mediation adapters
        </AccessibleText>
        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: RADIUS.lg }]}>
          {status.adapters.length === 0 ? (
            <AccessibleText style={[styles.rowLabel, { color: colors.subtext }]}>
              None reported yet — the SDK has not finished initializing.
            </AccessibleText>
          ) : (
            status.adapters.map((adapter) => (
              <StatusRow
                key={adapter.name}
                label={adapter.name}
                value={adapter.ready ? 'ready' : 'not ready'}
              />
            ))
          )}
        </View>

        <Button
          title="Open Ad Inspector"
          onPress={openInspector}
          disabled={busy}
          fullWidth
          style={styles.action}
        />
        <Button
          title="Request ad (logs test device ID)"
          onPress={probeAd}
          disabled={busy}
          variant="outline"
          fullWidth
          style={styles.action}
        />
        <Button
          title="Refresh status"
          onPress={refresh}
          disabled={busy}
          variant="ghost"
          fullWidth
          style={styles.action}
        />

        {lastAction ? (
          <AccessibleText style={[styles.lastAction, { color: colors.subtext }]}>
            {lastAction}
          </AccessibleText>
        ) : null}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  title: {
    ...TYPOGRAPHY.H2,
  },
  subtitle: {
    ...TYPOGRAPHY.Caption,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.H2,
    marginTop: SPACING.sm,
  },
  card: {
    padding: SPACING.md,
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  rowLabel: {
    ...TYPOGRAPHY.Caption,
  },
  rowValue: {
    ...TYPOGRAPHY.Caption,
    flexShrink: 1,
    textAlign: 'right',
  },
  action: {
    marginTop: SPACING.xs,
  },
  lastAction: {
    ...TYPOGRAPHY.Caption,
    marginTop: SPACING.md,
  },
});
