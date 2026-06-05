import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { NumerologyPreviewModel } from './types';
import { NumerologyShareCardPremium } from './NumerologyShareCardPremium';

interface Props {
  model: NumerologyPreviewModel;
  variant?: 'stage' | 'capture';
  style?: StyleProp<ViewStyle>;
}

export function ShareCardPreviewNumerology({ model, variant = 'stage', style }: Props) {
  return (
    <NumerologyShareCardPremium
      model={model}
      variant={variant}
      style={style}
    />
  );
}
