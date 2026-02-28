import type { Ionicons } from '@expo/vector-icons';

export type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export type DiscoverSection = 'cosmicFlow' | 'tools' | 'wisdom';

export interface DiscoverModule {
  id: string;
  titleKey: string;
  descriptionKey: string;
  icon: IoniconsName;
  route: string;
  section: DiscoverSection;
  keywords: string[];
  gradientDark: [string, string];
  gradientLight: [string, string];
  glowOnCriticalTransit?: boolean;
}
