import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AccessibleText } from '../ui';
import { ACCESSIBILITY } from '../../constants/tokens';
import type { RelationshipType } from '../../types/compare';

interface CompareFooterNavProps {
  active: 'type' | 'overview' | 'technical';
  type: RelationshipType;
  matchId: number;
  leftName?: string;
  rightName?: string;
  leftAvatarUri?: string;
  rightAvatarUri?: string;
  leftSignLabel?: string;
  rightSignLabel?: string;
}

export default function CompareFooterNav({
  active,
  type,
  matchId,
  leftName,
  rightName,
  leftAvatarUri,
  rightAvatarUri,
  leftSignLabel,
  rightSignLabel,
}: CompareFooterNavProps) {
  const commonParams = {
    type,
    matchId: String(matchId),
    ...(leftName ? { leftName } : {}),
    ...(rightName ? { rightName } : {}),
    ...(leftAvatarUri ? { leftAvatarUri } : {}),
    ...(rightAvatarUri ? { rightAvatarUri } : {}),
    ...(leftSignLabel ? { leftSignLabel } : {}),
    ...(rightSignLabel ? { rightSignLabel } : {}),
  };

  return (
    <View style={styles.shell}>
      <View style={styles.inner}>
        <Pressable
          onPress={() => router.replace({ pathname: '/compare/type-picker', params: commonParams } as never)}
          style={[styles.tabBtn, active === 'type' && styles.activeTabBtn]}
          accessibilityRole="button"
        >
          <Ionicons name="grid-outline" size={18} color={active === 'type' ? '#6D28D9' : '#6B6381'} />
          <AccessibleText
            style={[styles.tabText, active === 'type' && styles.activeTabText]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            Tür
          </AccessibleText>
        </Pressable>

        <Pressable
          onPress={() => router.replace({ pathname: '/compare', params: commonParams } as never)}
          style={[styles.tabBtn, active === 'overview' && styles.activeTabBtn]}
          accessibilityRole="button"
        >
          <Ionicons name="heart-outline" size={18} color={active === 'overview' ? '#6D28D9' : '#6B6381'} />
          <AccessibleText
            style={[styles.tabText, active === 'overview' && styles.activeTabText]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            Uyum Özeti
          </AccessibleText>
        </Pressable>

        <Pressable
          onPress={() => router.replace({ pathname: '/compare/technical', params: commonParams } as never)}
          style={[styles.tabBtn, active === 'technical' && styles.activeTabBtn]}
          accessibilityRole="button"
        >
          <Ionicons name="analytics-outline" size={18} color={active === 'technical' ? '#6D28D9' : '#6B6381'} />
          <AccessibleText
            style={[styles.tabText, active === 'technical' && styles.activeTabText]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            Detaylı Analiz
          </AccessibleText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#F7F5FB',
  },
  inner: {
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5DEEF',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 6,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
    shadowColor: '#2D0A5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  tabBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 4,
  },
  activeTabBtn: {
    backgroundColor: '#EFE8FF',
    borderWidth: 1,
    borderColor: '#D7C5FA',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B6381',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#5B21B6',
  },
});
