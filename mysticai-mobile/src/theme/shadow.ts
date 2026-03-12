import { Platform, ViewStyle } from 'react-native';
import { colors } from './colors';

export const shadowHero: ViewStyle = Platform.select<ViewStyle>({
  ios: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  android: {
    elevation: 5,
  },
  web: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
}) ?? {};

export const shadowSubtle: ViewStyle = Platform.select<ViewStyle>({
  ios: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
  android: {
    elevation: 0,
  },
  web: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
  },
}) ?? {};

export const softShadow = shadowHero;
export const subtleShadow = shadowSubtle;
