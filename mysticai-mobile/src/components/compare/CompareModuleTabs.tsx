import React from 'react';
import { View, StyleSheet } from 'react-native';
import RelationshipTypeChips from '../RelationshipTypeChips';
import type { RelationshipType } from '../../types/compare';

interface CompareModuleTabsProps {
  value: RelationshipType;
  onChange: (type: RelationshipType) => void;
}

export default function CompareModuleTabs({ value, onChange }: CompareModuleTabsProps) {
  return (
    <View style={styles.wrap}>
      <RelationshipTypeChips value={value} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 2,
  },
});
