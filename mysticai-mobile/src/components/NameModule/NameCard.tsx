import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { NameListItem } from '../../services/name.service';
import { FavoriteButton } from './FavoriteButton';
import { NameTagChip } from './NameTagChip';
import { QuranBadge } from './QuranBadge';

type NameCardProps = {
  item: NameListItem;
  isFavorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
};

function genderLabel(
  gender: NameListItem['gender'],
  t: (key: string) => string,
) {
  if (gender === 'MALE') return t('nameAnalysis.genderOptions.male');
  if (gender === 'FEMALE') return t('nameAnalysis.genderOptions.female');
  if (gender === 'UNISEX') return t('nameAnalysis.genderOptions.unisex');
  return null;
}

export function NameCard({ item, isFavorite, onPress, onToggleFavorite }: NameCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const firstTags = (item.tags ?? []).slice(0, 3);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
          <View style={styles.metaRow}>
            {item.origin ? <Text style={[styles.metaText, { color: colors.subtext }]}>{item.origin}</Text> : null}
            {genderLabel(item.gender, t) ? (
              <Text style={[styles.metaText, { color: colors.subtext }]}>{genderLabel(item.gender, t)}</Text>
            ) : null}
            <QuranBadge isQuranic={item.quranFlag} />
          </View>
        </View>
        <FavoriteButton isFavorite={isFavorite} onPress={onToggleFavorite} />
      </View>

      {item.meaningShort ? (
        <Text style={[styles.shortMeaning, { color: colors.textSoft }]} numberOfLines={2}>
          {item.meaningShort}
        </Text>
      ) : null}

      {firstTags.length > 0 ? (
        <View style={styles.tagsWrap}>
          {firstTags.map((tag) => (
            <NameTagChip key={`${item.id}-${tag.id}`} label={tag.tagValue} />
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleWrap: {
    flex: 1,
    gap: 6,
  },
  name: {
    fontSize: 19,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  shortMeaning: {
    fontSize: 14,
    lineHeight: 20,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
