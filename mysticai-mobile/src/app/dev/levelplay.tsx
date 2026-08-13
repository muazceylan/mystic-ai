import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';

import { AccessibleText, Button, SafeScreen } from '../../components/ui';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants/tokens';
import { useTheme } from '../../context/ThemeContext';
import {
  getLevelPlayDevToolsStatus,
  launchLevelPlayTestSuite,
  validateLevelPlayIntegration,
  type LevelPlayDevToolsStatus,
} from '../../features/ads/levelplay/levelPlayDevTools';

// Development-only console for the LevelPlay integration. Guarded by `__DEV__`
// exactly like `dev/compare-card-preview.tsx`; the helpers it calls are no-ops
// in production regardless.

function StatusRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <AccessibleText style={[styles.rowLabel, { color: colors.subtext }]}>
        {label}
      </AccessibleText>
      <AccessibleText style={[styles.rowValue, { color: colors.text }]}>{value}</AccessibleText>
    </View>
  );
}

export default function LevelPlayDevScreen() {
  const { colors } = useTheme();
  const [status, setStatus] = useState<LevelPlayDevToolsStatus>(() =>
    getLevelPlayDevToolsStatus(),
  );
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    setStatus(getLevelPlayDevToolsStatus());
  }, []);

  const runValidation = useCallback(async () => {
    setBusy(true);
    try {
      const ok = await validateLevelPlayIntegration();
      setLastAction(
        ok
          ? 'Validation requested — read the report in Logcat (tag: IronSource).'
          : 'Validation skipped — LevelPlay is not initialized yet.',
      );
    } finally {
      setBusy(false);
      refresh();
    }
  }, [refresh]);

  const openTestSuite = useCallback(async () => {
    setBusy(true);
    try {
      const ok = await launchLevelPlayTestSuite();
      setLastAction(
        ok ? 'Test Suite launched.' : 'Test Suite skipped — LevelPlay is not initialized yet.',
      );
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
          LevelPlay Dev Tools
        </AccessibleText>
        <AccessibleText style={[styles.subtitle, { color: colors.subtext }]}>
          Development-only. Ads shown from the Test Suite never credit Guru.
        </AccessibleText>

        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: RADIUS.lg }]}>
          <StatusRow label="Dev tools" value={status.enabled ? 'enabled' : 'disabled'} />
          <StatusRow label="Init state" value={status.initializationState} />
          <StatusRow label="App key" value={status.appKeyConfigured ? 'configured' : 'missing'} />
          <StatusRow
            label="Rewarded unit"
            value={status.rewardedAdUnitConfigured ? 'configured' : 'missing'}
          />
          {status.initializationError ? (
            <StatusRow label="Error" value={status.initializationError} />
          ) : null}
        </View>

        <Button
          title="Validate integration"
          onPress={runValidation}
          disabled={busy}
          fullWidth
          style={styles.action}
        />
        <Button
          title="Launch Test Suite"
          onPress={openTestSuite}
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
