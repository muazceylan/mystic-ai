import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

type MeaningBlockProps = {
  meaningShort?: string | null;
  meaningLong?: string | null;
  maxLines?: number;
};

const TURKISH_MAP: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
};

function compactText(value?: string | null): string | null {
  if (!value) return null;
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length > 0 ? compact : null;
}

function normalizeForCompare(value: string): string {
  const lowered = value.toLocaleLowerCase('tr-TR');
  const mapped = lowered
    .split('')
    .map((char) => TURKISH_MAP[char] ?? char)
    .join('');

  return mapped
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveMeaningPair(
  meaningShort?: string | null,
  meaningLong?: string | null
): { shortText: string | null; longText: string | null } {
  const shortText = compactText(meaningShort);
  const longText = compactText(meaningLong);

  if (!shortText && !longText) {
    return { shortText: null, longText: null };
  }
  if (!shortText || !longText) {
    return { shortText, longText };
  }

  const shortNormalized = normalizeForCompare(shortText);
  const longNormalized = normalizeForCompare(longText);

  const duplicateLike =
    shortNormalized.length > 0 &&
    longNormalized.length > 0 &&
    (shortNormalized === longNormalized ||
      shortNormalized.startsWith(longNormalized) ||
      longNormalized.startsWith(shortNormalized));

  if (!duplicateLike) {
    return { shortText, longText };
  }

  if (longText.length > shortText.length) {
    return { shortText: null, longText };
  }
  return { shortText, longText: null };
}

export function MeaningBlock({ meaningShort, meaningLong, maxLines = 5 }: MeaningBlockProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const resolved = resolveMeaningPair(meaningShort, meaningLong);

  if (!resolved.shortText && !resolved.longText) return null;

  return (
    <View style={styles.wrap}>
      {resolved.shortText ? <Text style={[styles.short, { color: colors.text }]}>{resolved.shortText}</Text> : null}
      {resolved.longText ? (
        <>
          <Text style={[styles.long, { color: colors.subtext }]} numberOfLines={expanded ? 0 : maxLines}>
            {resolved.longText}
          </Text>
          {resolved.longText.length > 220 ? (
            <Pressable onPress={() => setExpanded((prev) => !prev)}>
              <Text style={[styles.toggle, { color: colors.primary }]}>
                {expanded ? t('nameAnalysis.meaning.showLess') : t('nameAnalysis.meaning.showMore')}
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  short: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  long: {
    fontSize: 14,
    lineHeight: 21,
  },
  toggle: {
    fontSize: 13,
    fontWeight: '700',
  },
});
