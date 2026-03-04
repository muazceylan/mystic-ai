import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AccessibleText, SafeScreen } from '../../../components/ui';
import type { RelationshipType } from '../../../types/compare';
import { RELATIONSHIP_TYPE_LABELS } from '../../../types/compare';
import { getRelationshipPalette } from '../../../constants/compareDesignTokens';
import { ACCESSIBILITY } from '../../../constants/tokens';
import CompareHeader from '../../../components/compare/CompareHeader';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const TYPE_ORDER: RelationshipType[] = ['love', 'work', 'friend', 'family', 'rival'];

const DESCRIPTIONS: Record<RelationshipType, string> = {
  love: 'Yakınlık, iletişim tonu ve duygusal güven odaklı analiz.',
  work: 'İş bölümü, karar alma ve çalışma ritmi odaklı analiz.',
  friend: 'Destek, sadakat, iletişim rahatlığı ve sınırlar odaklı analiz.',
  family: 'Bağ, sorumluluk, hassasiyet ve güvenli alan odaklı analiz.',
  rival: 'Rekabet, strateji, tetikleyiciler ve adil oyun kuralları odaklı analiz.',
};

export default function RelationshipTypePickerScreen() {
  const params = useLocalSearchParams<{
    matchId?: string;
    type?: string;
    leftName?: string;
    rightName?: string;
    leftAvatarUri?: string;
    rightAvatarUri?: string;
    leftSignLabel?: string;
    rightSignLabel?: string;
  }>();

  const matchId = firstParam(params.matchId);
  const leftName = firstParam(params.leftName);
  const rightName = firstParam(params.rightName);
  const leftAvatarUri = firstParam(params.leftAvatarUri);
  const rightAvatarUri = firstParam(params.rightAvatarUri);
  const leftSignLabel = firstParam(params.leftSignLabel);
  const rightSignLabel = firstParam(params.rightSignLabel);

  const goBackSafely = () => {
    router.replace('/(tabs)/compatibility' as never);
  };

  const goCompare = (type: RelationshipType) => {
    router.push({
      pathname: '/compare',
      params: {
        type,
        ...(matchId ? { matchId } : {}),
        ...(leftName ? { leftName } : {}),
        ...(rightName ? { rightName } : {}),
        ...(leftAvatarUri ? { leftAvatarUri } : {}),
        ...(rightAvatarUri ? { rightAvatarUri } : {}),
        ...(leftSignLabel ? { leftSignLabel } : {}),
        ...(rightSignLabel ? { rightSignLabel } : {}),
      },
    } as never);
  };

  return (
    <SafeScreen edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: '#F7F5FB' }}>
      <View style={{ flex: 1 }}>
        <View style={styles.container}>
          <CompareHeader
            title="İlişki Türünü Seç"
            subtitle="Seçtiğin türe göre tema başlıkları ve öneri dili otomatik değişecek."
            onBack={goBackSafely}
          />

          <View style={styles.grid}>
            {TYPE_ORDER.map((type) => {
              const palette = getRelationshipPalette(type);
              return (
                <Pressable
                  key={`relationship-type-${type}`}
                  onPress={() => goCompare(type)}
                  style={styles.cardPress}
                  accessibilityRole="button"
                  accessibilityLabel={`${RELATIONSHIP_TYPE_LABELS[type]} karşılaştırma modunu aç`}
                >
                  <LinearGradient
                    colors={[palette.surface, '#FFFFFF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.card, { borderColor: palette.border }]}
                  >
                    <View style={[styles.iconBubble, { backgroundColor: palette.accentSoft }]}>
                      <AccessibleText
                        style={styles.iconText}
                        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                      >
                        {palette.icon}
                      </AccessibleText>
                    </View>

                    <AccessibleText
                      style={[styles.cardTitle, { color: palette.accent }]}
                      maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                    >
                      {RELATIONSHIP_TYPE_LABELS[type]}
                    </AccessibleText>

                    <AccessibleText
                      style={styles.cardBody}
                      maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                    >
                      {DESCRIPTIONS[type]}
                    </AccessibleText>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 12,
  },
  grid: {
    paddingTop: 6,
    gap: 12,
  },
  cardPress: {
    minHeight: 92,
  },
  card: {
    minHeight: 92,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#2D0A5B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 7,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBubble: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 21,
  },
  cardTitle: {
    width: 82,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.25,
  },
  cardBody: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#4F4765',
    fontWeight: '600',
  },
});
