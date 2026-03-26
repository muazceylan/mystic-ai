import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
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
  const discSize = model.displayName ? 340 : 356;
  const seedKey = `${props.birthDate}|${props.birthTime ?? 'unknown'}|${props.latitude}|${props.longitude}|${model.posterTone ?? 'moon'}`;

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
            <LunarPhaseBadge
              model={model}
              label={isEnglish ? 'illumination' : 'aydınlık'}
            />
            <View style={styles.footerDivider} />
            <Text style={styles.footerBrand}>ASTRO GURU</Text>
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
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: posterTokens.frame.paddingHorizontal,
  },
  discWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerZone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  footerDivider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 10,
    backgroundColor: 'rgba(200,175,110,0.14)',
  },
  footerBrand: {
    color: 'rgba(215,190,120,0.8)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 4,
    fontFamily: displaySerif,
  },
});
