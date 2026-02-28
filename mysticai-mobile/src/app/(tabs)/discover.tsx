import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { SPACING } from '../../constants/tokens';
import { SafeScreen } from '../../components/ui/SafeScreen';
import { TabHeader } from '../../components/ui/TabHeader';
import { DiscoverSearchBar } from '../../features/discover/components/DiscoverSearchBar';
import { HoroscopeDiscoverBanner } from '../../features/discover/components/HoroscopeDiscoverBanner';
import { QuickLookWidget } from '../../features/discover/components/QuickLookWidget';
import { DreamReminderBanner } from '../../features/discover/components/DreamReminderBanner';
import { CosmicFlowSection } from '../../features/discover/components/CosmicFlowSection';
import { ToolsGridSection } from '../../features/discover/components/ToolsGridSection';
import { WisdomSection } from '../../features/discover/components/WisdomSection';
import { useDiscoverSearch } from '../../features/discover/useDiscoverSearch';

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const grouped = useDiscoverSearch(searchQuery);
  const hasSearch = searchQuery.trim().length > 0;
  const hasCosmicFlow = grouped.cosmicFlow.length > 0;
  const hasTools = grouped.tools.length > 0;
  const hasWisdom = grouped.wisdom.length > 0;

  return (
    <SafeScreen edges={['top', 'left', 'right']}>
      <TabHeader title={t('discover.title')} />
      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        <DiscoverSearchBar value={searchQuery} onChangeText={setSearchQuery} />

        {!hasSearch && <HoroscopeDiscoverBanner />}

        {!hasSearch && <QuickLookWidget />}

        {!hasSearch && <DreamReminderBanner />}

        {hasCosmicFlow && !hasSearch && <CosmicFlowSection />}

        {hasTools && <ToolsGridSection />}

        {hasWisdom && <WisdomSection />}

        <View style={styles.bottomSpacer} />
      </Animated.ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 120,
  },
  bottomSpacer: {
    height: SPACING.xl,
  },
});
