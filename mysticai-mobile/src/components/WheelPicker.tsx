import { useRef, useEffect, useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Platform } from 'react-native';
import * as Haptics from '../utils/haptics';
import { useTheme } from '../context/ThemeContext';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface WheelPickerProps {
  items: { label: string; value: number | string }[];
  selectedValue: number | string;
  onValueChange: (value: number | string) => void;
  width?: number;
}

export default function WheelPicker({
  items,
  selectedValue,
  onValueChange,
  width = 80,
}: WheelPickerProps) {
  const { colors } = useTheme();
  const flatListRef = useRef<FlatList>(null);
  const isScrollingRef = useRef(false);
  const lastHapticIndex = useRef(-1);
  const [ready, setReady] = useState(false);

  const selectedIndex = items.findIndex((item) => item.value === selectedValue);

  // Initial scroll — wait for layout then scroll
  const handleLayout = useCallback(() => {
    if (!ready && selectedIndex >= 0) {
      flatListRef.current?.scrollToOffset({
        offset: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
      setReady(true);
    }
  }, [ready, selectedIndex]);

  // Subsequent value changes from parent
  useEffect(() => {
    if (ready && selectedIndex >= 0 && !isScrollingRef.current) {
      flatListRef.current?.scrollToOffset({
        offset: selectedIndex * ITEM_HEIGHT,
        animated: true,
      });
    }
  }, [selectedIndex, ready]);

  const handleScroll = useCallback(
    (e: any) => {
      const y = e.nativeEvent.contentOffset.y;
      const index = Math.round(y / ITEM_HEIGHT);
      if (index !== lastHapticIndex.current && index >= 0 && index < items.length) {
        lastHapticIndex.current = index;
        if (Platform.OS === 'ios') {
          Haptics.selectionAsync();
        }
      }
    },
    [items.length],
  );

  const getItemLayout = (_data: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  });

  const renderItem = ({ item, index }: { item: { label: string; value: number | string }; index: number }) => {
    const isSelected = index === selectedIndex;
    return (
      <View style={[styles.item, { height: ITEM_HEIGHT }]}>
        <Text
          style={[
            styles.itemText,
            { color: colors.disabledText },
            isSelected && { ...styles.itemTextSelected, color: colors.primary },
          ]}
        >
          {item.label}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { width, height: PICKER_HEIGHT }]}>
      {/* Highlight band — behind the list */}
      <View
        style={[
          styles.selectedOverlay,
          { borderColor: colors.border, backgroundColor: colors.primarySoft },
        ]}
        pointerEvents="none"
      />
      <FlatList
        ref={flatListRef}
        data={items}
        keyExtractor={(item) => String(item.value)}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        initialScrollIndex={selectedIndex >= 0 ? selectedIndex : 0}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onLayout={handleLayout}
        onScrollBeginDrag={() => {
          isScrollingRef.current = true;
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          isScrollingRef.current = false;
          const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
          const clamped = Math.max(0, Math.min(index, items.length - 1));
          if (items[clamped] && items[clamped].value !== selectedValue) {
            onValueChange(items[clamped].value);
          }
        }}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
        }}
        style={{ zIndex: 2 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  selectedOverlay: {
    position: 'absolute',
    top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
    left: 4,
    right: 4,
    height: ITEM_HEIGHT,
    borderRadius: 10,
    zIndex: 0,
  },
  item: { justifyContent: 'center', alignItems: 'center' },
  itemText: { fontSize: 18, fontWeight: '500' },
  itemTextSelected: { fontWeight: '700', fontSize: 20 },
});
