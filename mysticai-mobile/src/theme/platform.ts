import { Platform } from 'react-native';

export const isAndroid = Platform.OS === 'android';

export function platformColor(iosColor: string, androidColor: string): string {
  return isAndroid ? androidColor : iosColor;
}
