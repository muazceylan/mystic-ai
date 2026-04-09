import React from 'react';
import { StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { spacing } from '../../theme';
import { QuickActionCard } from './QuickActionCard';
import type { QuickAction } from './types';

interface QuickActionGridProps {
  actions: QuickAction[];
  onPressAction: (action: QuickAction) => void;
}

export function QuickActionGrid({ actions, onPressAction }: QuickActionGridProps) {
  const { width } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = React.useState<number | null>(null);
  const horizontalPadding = spacing.screenPadding * 2;
  const gutter = spacing.sm;
  const fallbackWidth = Math.max(0, width - horizontalPadding);
  const availableWidth = containerWidth ?? fallbackWidth;
  const columns =
    availableWidth >= 1120 && actions.length >= 4
      ? 4
      : Math.min(2, Math.max(actions.length, 1));
  const totalGutter = gutter * Math.max(columns - 1, 0);
  const cardWidth = Math.max(0, Math.floor((availableWidth - totalGutter) / columns));
  const handleLayout = React.useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.floor(event.nativeEvent.layout.width);
    if (nextWidth > 0) {
      setContainerWidth((current) => (current === nextWidth ? current : nextWidth));
    }
  }, []);

  return (
    <View style={styles.grid} onLayout={handleLayout}>
      {actions.map((action, index) => {
        const columnIndex = index % columns;
        const rowIndex = Math.floor(index / columns);
        return (
          <View
            key={action.id}
            style={[
              styles.itemWrap,
              { width: cardWidth },
              columnIndex < columns - 1 ? { marginRight: gutter } : null,
              rowIndex > 0 ? { marginTop: gutter } : null,
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
  },
  itemWrap: {
    flexShrink: 0,
  },
});
