import { Platform } from 'react-native';

export const WEB_INPUT_RESET_STYLE =
  Platform.OS === 'web'
    ? ({
        outlineStyle: 'none',
        outlineWidth: 0,
        outlineColor: 'transparent',
        boxShadow: 'none',
        WebkitAppearance: 'none',
        WebkitTapHighlightColor: 'transparent',
      } as any)
    : null;
