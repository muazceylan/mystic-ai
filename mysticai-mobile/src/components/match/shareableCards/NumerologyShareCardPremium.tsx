import React from 'react';
import {
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Path,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { AccessibleText } from '../../ui';
import { BrandBadge } from '../../ui/BrandLogo';
import { ACCESSIBILITY } from '../../../constants/tokens';
import { radius } from '../../../theme';
import type { NumerologyPreviewModel } from './types';

interface NumerologyShareCardPremiumProps {
  model: NumerologyPreviewModel;
  variant?: 'stage' | 'capture';
  style?: StyleProp<ViewStyle>;
}

const P = {
  deepPurple: '#35145F',
  vividPurple: '#8B4DFF',
  borderGlass: 'rgba(255,255,255,0.44)',
  gold: '#F6D99D',
  textDark: '#2B1648',
};

const CARD_GRADIENT = ['#35145F', '#4D1D8F', '#6F35D5', '#A869F4', '#EACDFF'] as const;
const CARD_SOFT_WASH = ['rgba(255,255,255,0.08)', 'rgba(255,225,248,0.13)', 'rgba(241,227,255,0.24)'] as const;
const BADGE_GRADIENT = ['rgba(255,255,255,0.92)', 'rgba(247,237,255,0.76)'] as const;
const PANEL_GRADIENT = ['rgba(255,255,255,0.34)', 'rgba(241,227,255,0.22)'] as const;
const HERO_FONT_FAMILY = Platform.select({ ios: 'Georgia', android: 'serif', default: undefined });

export function NumerologyShareCardPremium({
  model,
  variant = 'stage',
  style,
}: NumerologyShareCardPremiumProps) {
  const { i18n, t } = useTranslation();
  const { height } = useWindowDimensions();
  const compact = variant === 'stage';
  const isStory = model.aspectRatio === 'story';
  const isSmallScreen = height < 740;
  const styles = React.useMemo(() => createStyles(compact, isStory, isSmallScreen), [compact, isStory, isSmallScreen]);
  const locale = i18n.language ?? 'tr';
  const panelTitle = model.panelTitle?.trim()
    ? model.panelTitle.toLocaleUpperCase(locale)
    : model.title.toLocaleUpperCase(locale);

  return (
    <View style={[styles.shadowFrame, style]}>
      <LinearGradient
        colors={CARD_GRADIENT}
        locations={[0, 0.3, 0.56, 0.78, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <LinearGradient
          colors={CARD_SOFT_WASH}
          locations={[0, 0.48, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.glowTopRight} pointerEvents="none" />
        <View style={styles.glowMiddle} pointerEvents="none" />
        <View style={styles.glowBottom} pointerEvents="none" />
        <NumerologyCardOverlay />

        <View style={styles.innerBorder} pointerEvents="none" />

        <View style={styles.content}>
          <LinearGradient
            colors={BADGE_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.topBadge}
          >
            <Ionicons name="sparkles" size={compact ? 15 : 17} color="#A8752A" />
            <AccessibleText
              style={styles.topBadgeText}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              numberOfLines={1}
            >
              {model.title}
            </AccessibleText>
          </LinearGradient>

          <View style={styles.nameRow}>
            <View style={styles.nameRule} />
            <View style={styles.nameDot} />
            <AccessibleText
              style={styles.nameText}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              numberOfLines={1}
            >
              {model.name}
            </AccessibleText>
            <View style={styles.nameDot} />
            <View style={styles.nameRule} />
          </View>

          <View style={styles.heroWrap}>
            <View style={styles.heroHalo} pointerEvents="none" />
            <AccessibleText
              style={styles.heroNumber}
              maxFontSizeMultiplier={1}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.68}
            >
              {model.mainNumber}
            </AccessibleText>
          </View>

          <AccessibleText
            style={styles.mainInsightText}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            numberOfLines={isStory ? 3 : 2}
            adjustsFontSizeToFit
            minimumFontScale={0.76}
          >
            {model.mainInsight}
          </AccessibleText>

          <View style={styles.personalYearWrap}>
            <LinearGradient
              colors={BADGE_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.personalYearPill}
            >
              <Ionicons name="calendar-outline" size={compact ? 15 : 17} color={P.vividPurple} />
              <AccessibleText
                style={styles.personalYearText}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                numberOfLines={1}
              >
                {t('shareableCards.numerologyCard.personalYear', { year: model.personalYear })}
              </AccessibleText>
            </LinearGradient>
          </View>

          <LinearGradient
            colors={PANEL_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.insightPanel}
          >
            <View style={styles.panelStar}>
              <Ionicons name="sparkles" size={compact ? 14 : 16} color={P.gold} />
            </View>

            <View style={styles.panelTitleBlock}>
              <AccessibleText
                style={styles.panelTitle}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.68}
              >
                {panelTitle}
              </AccessibleText>
              <View style={styles.panelDividerRow}>
                <View style={styles.panelDivider} />
                <Ionicons name="sparkles-outline" size={compact ? 12 : 13} color={P.vividPurple} />
                <View style={styles.panelDivider} />
              </View>
            </View>

            <View style={styles.panelBodyRow}>
              <View style={styles.panelIconGlow}>
                <Ionicons name="heart-outline" size={compact ? 25 : 29} color="#FFFFFF" />
              </View>
              <View style={styles.panelCopy}>
                <AccessibleText
                  style={styles.panelBody}
                  maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                  numberOfLines={compact ? 4 : 5}
                >
                  {model.panelBody}
                </AccessibleText>
              </View>
              <View style={styles.panelIconGlow}>
                <Ionicons name="diamond-outline" size={compact ? 25 : 29} color="#FFFFFF" />
              </View>
            </View>
          </LinearGradient>

          <View style={styles.footerRow}>
            <View style={styles.footerLine} />
            <View style={styles.footerBadge}>
              <BrandBadge variant="icon-transparent" size={compact ? 18 : 20} />
              <AccessibleText
                style={styles.footerText}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                numberOfLines={1}
              >
                {model.brandLabel}
              </AccessibleText>
              <Ionicons name="sparkles" size={compact ? 10 : 11} color={P.gold} />
            </View>
            <View style={styles.footerLine} />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const NumerologyCardOverlay = React.memo(function NumerologyCardOverlay() {
  return (
    <Svg
      pointerEvents="none"
      width="100%"
      height="100%"
      viewBox="0 0 360 640"
      preserveAspectRatio="none"
      style={StyleSheet.absoluteFill}
    >
      <Defs>
        <RadialGradient id="centerGlow" cx="50%" cy="45%" r="45%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.18" />
          <Stop offset="48%" stopColor="#CDA4FF" stopOpacity="0.08" />
          <Stop offset="100%" stopColor="#34135F" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      <Circle cx="180" cy="260" r="112" fill="url(#centerGlow)" />
      <Circle cx="180" cy="260" r="116" stroke="#FFFFFF" strokeOpacity="0.16" strokeWidth="1" fill="none" />
      <Circle cx="180" cy="260" r="94" stroke="#F6D99D" strokeOpacity="0.12" strokeWidth="1" fill="none" />
      <Circle cx="180" cy="260" r="70" stroke="#FFFFFF" strokeOpacity="0.09" strokeWidth="1" fill="none" />
      <Circle cx="180" cy="260" r="46" stroke="#FFFFFF" strokeOpacity="0.08" strokeWidth="1" fill="none" />

      <G stroke="#FFFFFF" strokeOpacity="0.12" strokeWidth="1">
        <Line x1="180" y1="148" x2="180" y2="372" />
        <Line x1="70" y1="260" x2="290" y2="260" />
        <Line x1="103" y1="184" x2="256" y2="336" />
        <Line x1="256" y1="184" x2="103" y2="336" />
        <Line x1="128" y1="164" x2="252" y2="250" />
        <Line x1="108" y1="292" x2="232" y2="176" />
      </G>

      <G fill="#FFFFFF" opacity="0.66">
        {[
          [48, 78, 1.2], [88, 140, 1.6], [142, 64, 1.1], [244, 72, 1.2], [307, 116, 1.4],
          [34, 282, 1.6], [310, 276, 1.8], [76, 430, 1.3], [292, 438, 1.5], [52, 536, 1.4],
          [318, 544, 1.2], [202, 126, 1.1], [262, 218, 1.2], [126, 354, 1.1],
        ].map(([cx, cy, r]) => (
          <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </G>

      <G stroke="#FFFFFF" strokeOpacity="0.3" strokeWidth="1.2" strokeLinecap="round">
        <Line x1="50" y1="76" x2="50" y2="88" />
        <Line x1="44" y1="82" x2="56" y2="82" />
        <Line x1="320" y1="102" x2="320" y2="114" />
        <Line x1="314" y1="108" x2="326" y2="108" />
        <Line x1="64" y1="486" x2="64" y2="500" />
        <Line x1="57" y1="493" x2="71" y2="493" />
        <Line x1="296" y1="350" x2="296" y2="364" />
        <Line x1="289" y1="357" x2="303" y2="357" />
      </G>

      <Path
        d="M75 276c-12-3-19-14-16-26 3-13 16-21 29-17-8 5-12 14-10 23 2 8 9 15 17 17-6 4-13 5-20 3z"
        fill="#FFDDF7"
        opacity="0.48"
      />
      <Path
        d="M286 276c-12-3-19-14-16-26 3-13 16-21 29-17-8 5-12 14-10 23 2 8 9 15 17 17-6 4-13 5-20 3z"
        fill="#FFDDF7"
        opacity="0.48"
      />

      <G fill="#F3E9FF" opacity="0.42">
        <SvgText x="76" y="216" fontSize="22" fontFamily={HERO_FONT_FAMILY} textAnchor="middle">2</SvgText>
        <SvgText x="79" y="352" fontSize="22" fontFamily={HERO_FONT_FAMILY} textAnchor="middle">4</SvgText>
        <SvgText x="282" y="216" fontSize="22" fontFamily={HERO_FONT_FAMILY} textAnchor="middle">7</SvgText>
        <SvgText x="286" y="352" fontSize="22" fontFamily={HERO_FONT_FAMILY} textAnchor="middle">9</SvgText>
      </G>

      <Path
        d="M34 46h292c16 0 29 13 29 29v493c0 16-13 29-29 29H34c-16 0-29-13-29-29V75c0-16 13-29 29-29z"
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.26"
        strokeWidth="1.2"
      />
      <Path
        d="M48 63h264c14 0 25 11 25 25v466c0 14-11 25-25 25H48c-14 0-25-11-25-25V88c0-14 11-25 25-25z"
        fill="none"
        stroke="#F6D99D"
        strokeOpacity="0.28"
        strokeWidth="1"
      />
    </Svg>
  );
});

function createStyles(compact: boolean, isStory: boolean, isSmallScreen: boolean) {
  const cardPadding = compact ? (isSmallScreen ? 18 : 22) : (isSmallScreen ? 22 : 26);
  const heroSize = compact
    ? (isSmallScreen ? 118 : isStory ? 138 : 122)
    : (isSmallScreen ? 136 : isStory ? 150 : 132);
  const mainTextSize = compact
    ? (isSmallScreen ? 20 : isStory ? 22 : 20)
    : (isSmallScreen ? 22 : isStory ? 24 : 22);
  const panelPadding = compact ? (isSmallScreen ? 15 : 18) : (isSmallScreen ? 18 : 22);
  const panelBodySize = compact ? (isSmallScreen ? 14 : 15) : (isSmallScreen ? 15 : 17);
  const verticalGap = compact ? (isSmallScreen ? 8 : 10) : (isSmallScreen ? 10 : 12);

  const textGlow: TextStyle = {
    textShadowColor: 'rgba(100, 30, 148, 0.55)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
  };

  return StyleSheet.create({
    shadowFrame: {
      flex: 1,
      borderRadius: compact ? 30 : 34,
      backgroundColor: P.deepPurple,
      shadowColor: '#6F35D5',
      shadowOpacity: compact ? 0.28 : 0.34,
      shadowOffset: { width: 0, height: compact ? 12 : 16 },
      shadowRadius: compact ? 22 : 30,
      elevation: compact ? 8 : 11,
    },
    card: {
      flex: 1,
      borderRadius: compact ? 30 : 34,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.48)',
      overflow: 'hidden',
      paddingHorizontal: cardPadding,
      paddingTop: cardPadding,
      paddingBottom: compact ? Math.max(14, cardPadding - 6) : Math.max(18, cardPadding - 6),
    },
    glowTopRight: {
      position: 'absolute',
      width: compact ? 148 : 190,
      height: compact ? 148 : 190,
      borderRadius: 999,
      right: -38,
      top: -22,
      backgroundColor: 'rgba(255, 225, 248, 0.18)',
    },
    glowMiddle: {
      position: 'absolute',
      width: compact ? 170 : 220,
      height: compact ? 170 : 220,
      borderRadius: 999,
      right: -70,
      top: compact ? 244 : 280,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    glowBottom: {
      position: 'absolute',
      width: compact ? 190 : 240,
      height: compact ? 130 : 170,
      borderRadius: 999,
      left: -52,
      bottom: -36,
      backgroundColor: 'rgba(241, 227, 255, 0.16)',
    },
    innerBorder: {
      ...StyleSheet.absoluteFillObject,
      margin: compact ? 8 : 10,
      borderRadius: compact ? 24 : 28,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.32)',
    },
    content: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: verticalGap,
      zIndex: 2,
    },
    topBadge: {
      minHeight: compact ? 36 : 42,
      maxWidth: '84%',
      paddingHorizontal: compact ? 15 : 18,
      paddingVertical: compact ? 7 : 9,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: 'rgba(246,217,157,0.72)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      shadowColor: '#271342',
      shadowOpacity: 0.14,
      shadowOffset: { width: 0, height: 5 },
      shadowRadius: 10,
      elevation: 4,
    },
    topBadgeText: {
      color: P.textDark,
      fontSize: compact ? 15 : 17,
      lineHeight: compact ? 19 : 21,
      fontWeight: '800',
      letterSpacing: 0,
    },
    nameRow: {
      width: '72%',
      minHeight: compact ? 27 : 31,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    nameRule: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: 'rgba(255,255,255,0.36)',
    },
    nameDot: {
      width: 4,
      height: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.86)',
    },
    nameText: {
      maxWidth: '64%',
      color: '#FFFFFF',
      fontFamily: HERO_FONT_FAMILY,
      fontSize: compact ? 24 : 28,
      lineHeight: compact ? 29 : 34,
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: 0,
      ...textGlow,
    },
    heroWrap: {
      width: '100%',
      minHeight: compact
        ? (isSmallScreen ? 116 : isStory ? 134 : 118)
        : (isSmallScreen ? 136 : isStory ? 152 : 132),
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: isStory ? 0 : -4,
      marginBottom: isSmallScreen ? -2 : 0,
    },
    heroHalo: {
      position: 'absolute',
      width: compact ? 160 : 190,
      height: compact ? 112 : 136,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.1)',
      shadowColor: '#FFFFFF',
      shadowOpacity: 0.26,
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 28,
      elevation: 2,
    },
    heroNumber: {
      color: '#FFEAFB',
      fontFamily: HERO_FONT_FAMILY,
      fontSize: heroSize,
      lineHeight: Math.round(heroSize * 1.02),
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: 0,
      textShadowColor: 'rgba(255, 230, 255, 0.85)',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 18,
    },
    mainInsightText: {
      width: '97%',
      color: '#FFFFFF',
      fontFamily: HERO_FONT_FAMILY,
      fontSize: mainTextSize,
      lineHeight: Math.round(mainTextSize * 1.26),
      fontWeight: '700',
      textAlign: 'center',
      letterSpacing: 0,
      ...textGlow,
    },
    personalYearWrap: {
      alignItems: 'center',
      minHeight: compact ? 40 : 46,
      justifyContent: 'center',
    },
    personalYearPill: {
      minHeight: compact ? 39 : 44,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.56)',
      paddingHorizontal: compact ? 17 : 20,
      paddingVertical: compact ? 8 : 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      shadowColor: '#271342',
      shadowOpacity: 0.16,
      shadowOffset: { width: 0, height: 7 },
      shadowRadius: 14,
      elevation: 4,
    },
    personalYearText: {
      color: '#5630B5',
      fontSize: compact ? 14 : 16,
      lineHeight: compact ? 18 : 21,
      fontWeight: '800',
      letterSpacing: 0,
    },
    insightPanel: {
      width: '100%',
      borderRadius: compact ? 24 : 28,
      borderWidth: 1,
      borderColor: P.borderGlass,
      paddingHorizontal: panelPadding,
      paddingTop: panelPadding + 7,
      paddingBottom: panelPadding,
      overflow: 'hidden',
      shadowColor: '#32105E',
      shadowOpacity: 0.18,
      shadowOffset: { width: 0, height: 9 },
      shadowRadius: 16,
      elevation: 5,
      marginTop: isSmallScreen ? 2 : 4,
    },
    panelStar: {
      position: 'absolute',
      top: 5,
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    panelTitleBlock: {
      width: '100%',
      alignItems: 'center',
      gap: compact ? 7 : 9,
      paddingHorizontal: compact ? 6 : 10,
      marginBottom: compact ? 12 : 14,
    },
    panelBodyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: compact ? 9 : 12,
    },
    panelIconGlow: {
      width: compact ? 42 : 52,
      height: compact ? 42 : 52,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.38)',
      shadowColor: '#FFFFFF',
      shadowOpacity: 0.35,
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 14,
      elevation: 3,
    },
    panelCopy: {
      flex: 1,
      alignItems: 'center',
    },
    panelTitle: {
      color: '#5F24D6',
      fontSize: compact ? 13 : 15,
      lineHeight: compact ? 17 : 20,
      fontWeight: '900',
      textAlign: 'center',
      letterSpacing: 0,
    },
    panelDividerRow: {
      width: '78%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    panelDivider: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: 'rgba(95,36,214,0.28)',
    },
    panelBody: {
      color: P.textDark,
      fontSize: panelBodySize,
      lineHeight: Math.round(panelBodySize * 1.42),
      fontWeight: '600',
      textAlign: 'center',
      letterSpacing: 0,
    },
    footerRow: {
      width: '100%',
      minHeight: compact ? 36 : 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    footerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: 'rgba(246,217,157,0.58)',
    },
    footerBadge: {
      maxWidth: '62%',
      minHeight: compact ? 33 : 38,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: 'rgba(246,217,157,0.72)',
      backgroundColor: 'rgba(255,255,255,0.7)',
      paddingHorizontal: compact ? 12 : 14,
      paddingVertical: compact ? 6 : 7,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      shadowColor: '#271342',
      shadowOpacity: 0.14,
      shadowOffset: { width: 0, height: 7 },
      shadowRadius: 12,
      elevation: 3,
    },
    footerText: {
      color: '#5630B5',
      fontFamily: HERO_FONT_FAMILY,
      fontSize: compact ? 14 : 16,
      lineHeight: compact ? 18 : 20,
      fontWeight: '700',
      letterSpacing: 0,
    },
  });
}
