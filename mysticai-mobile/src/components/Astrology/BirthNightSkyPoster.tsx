import React, { useMemo } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type {
  HousePlacement,
  NightSkyProjectionResponse,
  NightSkyPosterVariant,
  PlanetPosition,
} from '../../services/astrology.service';
import CosmicBackgroundLayer from '../nightSkyPoster/CosmicBackgroundLayer';
import LunarPhaseBadge from '../nightSkyPoster/LunarPhaseBadge';
import NightSkyDisc from '../nightSkyPoster/NightSkyDisc';
import NightSkyPosterHeader from '../nightSkyPoster/NightSkyPosterHeader';
import { nightSkyPosterMock } from '../../features/nightSkyPoster/poster.mock';
import { posterTokens } from '../../features/nightSkyPoster/poster.tokens';
import { buildNightSkyPosterModel } from '../../features/nightSkyPoster/poster.utils';

type Props = {
  name?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  isGuest?: boolean;
  birthDate: string;
  birthTime: string | null;
  birthLocation: string;
  latitude: number;
  longitude: number;
  shareUrl: string;
  planets: PlanetPosition[];
  houses?: HousePlacement[];
  variant?: NightSkyPosterVariant;
  projection?: NightSkyProjectionResponse | null;
};

const displaySerif = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: undefined,
});
const astroGuruIcon = require('../../../assets/brand/logo/astro-guru-icon-transparent-1024.png');

export default function BirthNightSkyPoster(props: Props) {
  const { i18n } = useTranslation();
  const isEnglish = i18n.language?.startsWith('en');

  const model = useMemo(() => {
    if ((!props.planets || props.planets.length === 0) && !props.projection) {
      return nightSkyPosterMock;
    }

    return buildNightSkyPosterModel({
      titleLabel: isEnglish ? 'THE NIGHT YOU WERE BORN' : 'DOĞDUĞUN GECE GÖKYÜZÜ',
      displayName: props.fullName ?? null,
      fullName: props.fullName,
      firstName: props.firstName,
      lastName: props.lastName,
      username: null,
      isGuest: props.isGuest ?? /^guest[_-]/i.test(props.name ?? ''),
      birthDate: props.birthDate,
      birthTime: props.birthTime,
      birthLocation: props.birthLocation,
      latitude: props.latitude,
      longitude: props.longitude,
      planets: props.planets ?? [],
      houses: props.houses,
      variant: props.variant,
      projection: props.projection,
      shareUrl: props.shareUrl,
      locale: isEnglish ? 'en' : 'tr',
    });
  }, [
    isEnglish,
    props.birthDate,
    props.birthLocation,
    props.birthTime,
    props.firstName,
    props.fullName,
    props.houses,
    props.isGuest,
    props.lastName,
    props.latitude,
    props.longitude,
    props.name,
    props.planets,
    props.projection,
    props.shareUrl,
    props.variant,
  ]);

  /* disc fills the available space — large as in reference */
  const discSize = model.displayName ? 346 : 362;
  const seedKey = `${props.birthDate}|${props.birthTime ?? 'unknown'}|${props.latitude}|${props.longitude}|${props.variant ?? 'minimal'}|${model.posterTone ?? 'moon'}`;

  return (
    <View style={styles.frame} collapsable={false}>
      <View style={styles.posterSurface}>
        <CosmicBackgroundLayer tone={model.posterTone ?? 'moon'} seedKey={seedKey} />

        {/* single thin gold border — matching reference */}
        <View style={styles.frameBorder} pointerEvents="none" />

        <View style={styles.content}>
          {/* header: title + date + location + coordinates */}
          <NightSkyPosterHeader model={model} />

          {/* main disc area */}
          <View style={styles.discWrap}>
            <NightSkyDisc model={model} size={discSize} />
          </View>

          {/* footer: moon phase + divider + brand */}
          <View style={styles.footerZone}>
            <View style={styles.footerPhaseRow}>
              <View style={styles.footerDivider} />
              <LunarPhaseBadge
                model={model}
                label={isEnglish ? 'illumination' : 'aydınlık'}
              />
              <View style={styles.footerDivider} />
            </View>
            <View style={styles.footerBrandRail}>
              <View style={styles.footerBrandRailLine} />
              <View style={styles.footerBrandRailDot} />
              <View style={styles.footerBrandRailLine} />
            </View>
            <View style={styles.footerBrandWrap}>
              <View style={styles.footerBrandIconWrap}>
                <Image source={astroGuruIcon} style={styles.footerBrandIcon} resizeMode="contain" />
              </View>
              <Text style={styles.footerBrand}>ASTRO GURU</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: posterTokens.frame.width,
    height: posterTokens.frame.height,
    padding: 6,
    backgroundColor: 'transparent',
  },
  posterSurface: {
    flex: 1,
    borderRadius: posterTokens.frame.radius,
    overflow: 'hidden',
    backgroundColor: '#030508',
  },
  frameBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: posterTokens.frame.radius,
    borderWidth: 1,
    borderColor: 'rgba(200,175,110,0.22)',
  },
  content: {
    flex: 1,
    paddingTop: 24,
    paddingBottom: 18,
    paddingHorizontal: posterTokens.frame.paddingHorizontal,
  },
  discWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  footerZone: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
  },
  footerPhaseRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  footerDivider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(214,189,123,0.28)',
  },
  footerBrandRail: {
    width: '72%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  footerBrandRailLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(214,189,123,0.36)',
  },
  footerBrandRailDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(243,217,154,0.95)',
    shadowColor: '#F0D07E',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  footerBrandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerBrandIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#E8C560',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  footerBrandIcon: {
    width: 92,
    height: 92,
  },
  footerBrand: {
    color: 'rgba(232,212,167,0.92)',
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: 5.2,
    fontFamily: displaySerif,
    textShadowColor: 'rgba(215,190,120,0.18)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
