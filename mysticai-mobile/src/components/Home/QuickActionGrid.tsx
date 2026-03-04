import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { spacing } from '../../theme';
import { QuickActionCard } from './QuickActionCard';
import type { QuickAction } from './types';

interface QuickActionGridProps {
  actions: QuickAction[];
  onPressAction: (action: QuickAction) => void;
}

export function QuickActionGrid({ actions, onPressAction }: QuickActionGridProps) {
  const { width } = useWindowDimensions();
  const horizontalPadding = spacing.screenPadding * 2;
  const gutter = spacing.sm;
  const rawWidth = (width - horizontalPadding - gutter) / 2;
  const cardWidth = Math.min(220, Math.max(137, Math.floor(rawWidth)));

  return (
    <View style={styles.grid}>
      {actions.map((action, index) => {
        const isLeft = index % 2 === 0;
        const isFirstRow = index < 2;
        return (
          <View
            key={action.id}
            style={[
              styles.itemWrap,
              isLeft ? { marginRight: gutter } : null,
              !isFirstRow ? { marginTop: gutter } : null,
            ]}
          >
            <QuickActionCard action={action} width={cardWidth} onPress={onPressAction} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    marginTop: spacing.cardGap,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  itemWrap: {
    flexShrink: 0,
  },
});
