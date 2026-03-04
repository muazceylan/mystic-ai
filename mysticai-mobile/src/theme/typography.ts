import { TextStyle } from 'react-native';
import { colors } from './colors';

const H1 = {
  fontSize: 25,
  lineHeight: 31,
  fontWeight: '700',
  color: colors.textPrimary,
} satisfies TextStyle;

const H2 = {
  fontSize: 19,
  lineHeight: 25,
  fontWeight: '600',
  color: colors.textPrimary,
} satisfies TextStyle;

const Body = {
  fontSize: 15,
  lineHeight: 22,
  fontWeight: '400',
  color: colors.textPrimary,
} satisfies TextStyle;

const Caption = {
  fontSize: 12,
  lineHeight: 17,
  fontWeight: '400',
  color: colors.textSecondary,
} satisfies TextStyle;

const Button = {
  fontSize: 16,
  lineHeight: 22,
  fontWeight: '600',
  color: colors.textPrimary,
} satisfies TextStyle;

export const typography = {
  H1,
  H2,
  Body,
  Caption,
  Button,
  h1: H1,
  sectionTitle: H2,
  body: Body,
  caption: Caption,
  button: Button,
} as const;

export type AppTypography = typeof typography;
