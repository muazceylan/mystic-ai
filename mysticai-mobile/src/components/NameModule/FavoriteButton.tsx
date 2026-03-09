import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

type FavoriteButtonProps = {
  isFavorite: boolean;
  loading?: boolean;
  onPress: () => void;
};

export function FavoriteButton({ isFavorite, loading, onPress }: FavoriteButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
          borderColor: colors.border,
          opacity: loading ? 0.6 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={isFavorite ? 'Favoriden çıkar' : 'Favorilere ekle'}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={20}
          color={isFavorite ? colors.pink : colors.text}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
