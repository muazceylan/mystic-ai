import { useRef, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ViewToken } from 'react-native';

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
  const flatListRef = useRef<FlatList>(null);
  const isScrollingRef = useRef(false);

  const selectedIndex = items.findIndex((item) => item.value === selectedValue);

  useEffect(() => {
    if (selectedIndex >= 0 && !isScrollingRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: selectedIndex * ITEM_HEIGHT,
          animated: false,
        });
      }, 50);
    }
  }, [selectedIndex]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        const middleIndex = Math.floor(viewableItems.length / 2);
        const middleItem = viewableItems[middleIndex];
        if (middleItem?.item && middleItem.item.value !== selectedValue) {
          onValueChange(middleItem.item.value);
        }
      }
    },
    [onValueChange, selectedValue],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

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
            isSelected && styles.itemTextSelected,
            !isSelected && styles.itemTextDimmed,
          ]}
        >
          {item.label}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { width, height: PICKER_HEIGHT }]}>
      <View style={styles.selectedOverlay} pointerEvents="none" />
      <FlatList
        ref={flatListRef}
        data={items}
        keyExtractor={(item) => String(item.value)}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScrollBeginDrag={() => {
          isScrollingRef.current = true;
        }}
        onMomentumScrollEnd={(e) => {
          isScrollingRef.current = false;
          const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
          const clamped = Math.max(0, Math.min(index, items.length - 1));
          if (items[clamped] && items[clamped].value !== selectedValue) {
            onValueChange(items[clamped].value);
          }
        }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
        }}
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
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E6E1EA',
    backgroundColor: 'rgba(157, 78, 221, 0.06)',
    zIndex: 1,
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1E1E1E',
  },
  itemTextSelected: {
    fontWeight: '700',
    color: '#9D4EDD',
    fontSize: 20,
  },
  itemTextDimmed: {
    color: '#B5B5B5',
  },
});
