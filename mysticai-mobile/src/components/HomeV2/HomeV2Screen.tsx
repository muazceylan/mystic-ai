import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { HomeV2DecisionCompassItem, HomeV2Model, HomeV2QuickActionId, HomeV2StatusTone } from './homeV2.types';
import { useDecisionCompassStore } from '../../store/useDecisionCompassStore';

interface HomeV2ScreenProps {
  model: HomeV2Model;
  isDark: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  loading?: {
    hero?: boolean;
    summary?: boolean;
    compass?: boolean;
    weekly?: boolean;
  };
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
  onOpenMoonDetail: () => void;
  onQuickActionPress: (id: HomeV2QuickActionId) => void;
  onOpenDailySummary: () => void;
  onOpenDecisionCompass: () => void;
  onOpenDecisionCompassItem?: (item: HomeV2DecisionCompassItem) => void;
  onOpenDecisionCompassItemDetail?: (item: HomeV2DecisionCompassItem) => void;
  spiritualSection?: React.ReactNode;
  horoscopeSection?: React.ReactNode;
  headerSlot?: React.ReactNode;
}

type Palette = ReturnType<typeof makePalette>;

const BG_DOTS = [
  [20, 72, 2, 0.05], [110, 55, 1.2, 0.06], [242, 80, 1.8, 0.04], [328, 61, 1.4, 0.05],
  [38, 162, 2.4, 0.03], [144, 198, 1.4, 0.05], [214, 144, 2.0, 0.04], [350, 205, 1.4, 0.05],
  [59, 322, 2.1, 0.04], [181, 294, 1.5, 0.05], [319, 338, 2.0, 0.03], [350, 448, 1.2, 0.05],
  [38, 520, 2.0, 0.04], [150, 536, 1.4, 0.04], [270, 522, 1.8, 0.04], [334, 610, 1.4, 0.05],
] as const;

const HERO_STARS = [
  [22, 18, 1.1, 0.5], [54, 36, 1.4, 0.8], [87, 24, 0.8, 0.6], [118, 42, 1.2, 0.65],
  [155, 30, 0.9, 0.55], [186, 21, 1.2, 0.75], [220, 38, 1.0, 0.7], [260, 24, 0.9, 0.65],
  [300, 36, 1.2, 0.78], [325, 56, 1.3, 0.75], [38, 72, 0.9, 0.55], [95, 88, 1.0, 0.6],
  [146, 78, 1.2, 0.58], [202, 92, 1.1, 0.6], [256, 84, 0.9, 0.55], [302, 96, 1.0, 0.62],
  [46, 118, 1.0, 0.5], [130, 128, 0.9, 0.52], [226, 120, 1.2, 0.6], [290, 136, 1.0, 0.58],
] as const;

export function HomeV2Screen({
  model,
  isDark,
  refreshing,
  onRefresh,
  loading,
  onOpenProfile,
  onOpenSettings,
  onOpenNotifications,
  onOpenMoonDetail,
  onQuickActionPress,
  onOpenDailySummary,
  onOpenDecisionCompass,
  onOpenDecisionCompassItem,
  onOpenDecisionCompassItemDetail,
  spiritualSection,
  horoscopeSection,
  headerSlot,
}: HomeV2ScreenProps) {
  const { width } = useWindowDimensions();
  const P = makePalette(isDark);
  const S = makeStyles(P);
  const contentMaxWidth = Platform.OS === 'web' ? Math.min(920, width - 24) : undefined;

  return (
    <View style={S.root}>
      <LinearGradient colors={P.screenGradient} style={StyleSheet.absoluteFillObject} />
      <View pointerEvents="none" style={S.backgroundLayer}>
        {BG_DOTS.map(([left, top, size, opacity], index) => (
          <View
            key={`bg-dot-${index}`}
            style={[
              S.bgDot,
              {
                left,
                top,
                width: size,
                height: size,
                borderRadius: size / 2,
                opacity,
              },
            ]}
          />
        ))}
        <View style={S.bgGlowTop} />
        <View style={S.bgGlowBottom} />
      </View>

      <ScrollView
        style={S.scroll}
        contentContainerStyle={[
          S.content,
          contentMaxWidth ? { width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center' } : null,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={P.accent}
            colors={[P.accent]}
          />
        }
      >
        {headerSlot ?? (
          <TopBar
            S={S}
            P={P}
            userName={model.userName}
            infoLine={model.infoLine}
            onOpenProfile={onOpenProfile}
            onOpenSettings={onOpenSettings}
            onOpenNotifications={onOpenNotifications}
          />
        )}

        <HeroCard
          S={S}
          P={P}
          title={model.hero.title}
          subtitle={model.hero.subtitle}
          description={model.hero.description}
          loading={!!loading?.hero}
          onPress={onOpenMoonDetail}
        />

        <DecisionCompassCard
          S={S}
          P={P}
          items={model.decisionCompass}
          overallScore={model.dailySummary.scoreValue}
          loading={!!loading?.compass}
          onPressAll={onOpenDecisionCompass}
          onPressItem={onOpenDecisionCompassItem ?? ((item) => {
            void item;
            onOpenDecisionCompass();
          })}
          onPressItemDetail={onOpenDecisionCompassItemDetail}
        />

        <View style={S.quickRowShell}>
          <LinearGradient
            pointerEvents="none"
            colors={isDark ? ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.00)'] : ['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.00)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={S.quickRowFadeLeft}
          />
          <LinearGradient
            pointerEvents="none"
            colors={isDark ? ['rgba(9,14,25,0.00)', 'rgba(9,14,25,0.78)'] : ['rgba(242,238,255,0.00)', 'rgba(242,238,255,0.92)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={S.quickRowFadeRight}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={S.quickRowContent}
            style={S.quickRowScroll}
          >
            {model.quickActions.map((action) => (
              <QuickActionPill
                key={action.id}
                S={S}
                P={P}
                action={action}
                onPress={() => onQuickActionPress(action.id)}
              />
            ))}
          </ScrollView>
        </View>

        {spiritualSection}

        {horoscopeSection}

        <DailySummaryCard
          S={S}
          P={P}
          model={model}
          loading={!!loading?.summary}
          onPress={onOpenDailySummary}
        />

        <TransitInsightsCard
          S={S}
          P={P}
          model={model}
          loading={!!loading?.summary}
          onPress={onOpenDailySummary}
        />

        <WeeklyCard
          S={S}
          P={P}
          model={model}
          loading={!!loading?.weekly}
        />

        <View style={S.footerStatusWrap}>
          <View style={S.footerStatusPill}>
            <View style={[S.footerStatusDotHalo, { backgroundColor: P.oracleDot }]} />
            <View style={[S.footerStatusDot, { backgroundColor: P.oracleDot }]} />
            <Text style={S.footerStatusText}>{model.oracleStatus.label}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function TopBar({
  S,
  P,
  userName,
  infoLine,
  onOpenProfile,
  onOpenSettings,
  onOpenNotifications,
}: {
  S: ReturnType<typeof makeStyles>;
  P: Palette;
  userName: string;
  infoLine: string;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
}) {
  return (
    <View style={S.topWrap}>
      <View style={S.topRow}>
        <Pressable onPress={onOpenProfile} style={({ pressed }) => [S.profileBtn, pressed && S.pressed]}>
          <View style={S.avatarCircle}>
            <Ionicons name="person-outline" size={18} color={P.iconMuted} />
          </View>
          <Text style={S.userName} numberOfLines={1}>{userName}</Text>
        </Pressable>

        <View style={S.topActions}>
          <IconCircleButton icon="options-outline" onPress={onOpenSettings} S={S} />
          <IconCircleButton icon="notifications-outline" onPress={onOpenNotifications} S={S} />
        </View>
      </View>
      <Text style={S.topInfoLine} numberOfLines={1}>{infoLine}</Text>
    </View>
  );
}

function IconCircleButton({
  icon,
  onPress,
  S,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  S: ReturnType<typeof makeStyles>;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [S.iconCircleBtn, pressed && S.pressed]}>
      <Ionicons name={icon} size={18} color={S.__palette.iconStrong} />
    </Pressable>
  );
}

function HeroCard({
  S,
  P,
  title,
  subtitle,
  description,
  loading,
  onPress,
}: {
  S: ReturnType<typeof makeStyles>;
  P: Palette;
  title: string;
  subtitle: string;
  description: string;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [S.heroOuter, pressed && S.pressed]}>
      <LinearGradient colors={P.heroGradient} style={S.heroCard}>
        <View style={S.heroNebulaOne} />
        <View style={S.heroNebulaTwo} />
        {HERO_STARS.map(([left, top, size, opacity], index) => (
          <View
            key={`hero-star-${index}`}
            style={[
              S.heroStar,
              { left, top, width: size, height: size, borderRadius: size / 2, opacity },
            ]}
          />
        ))}

        <View style={S.heroMoonGlow} />
        <View style={S.heroMoon}>
          <View style={S.heroMoonTextureA} />
          <View style={S.heroMoonTextureB} />
          <View style={S.heroMoonTextureC} />
          <View style={S.heroMoonShadow} />
          <View style={S.heroMoonRim} />
        </View>

        <Pressable onPress={onPress} style={({ pressed }) => [S.heroDetailPill, pressed && S.pressed]}>
          <Text style={S.heroDetailText}>Detay</Text>
        </Pressable>

        <View style={S.heroTextWrap}>
          <Text style={[S.heroTitle, loading && S.loadingText]} numberOfLines={1}>{title}</Text>
          <Text style={[S.heroSubtitle, loading && S.loadingText]} numberOfLines={1}>{subtitle}</Text>
          <Text style={[S.heroDescription, loading && S.loadingText]} numberOfLines={2}>{description}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function QuickActionPill({
  S,
  P,
  action,
  onPress,
}: {
  S: ReturnType<typeof makeStyles>;
  P: Palette;
  action: HomeV2Model['quickActions'][number];
  onPress: () => void;
}) {
  const iconName = (() => {
    switch (action.id) {
      case 'dream': return 'add';
      case 'compatibility': return 'heart';
      case 'planner': return 'calendar-outline';
      case 'chart': return 'sparkles-outline';
      default: return 'ellipse-outline';
    }
  })() as keyof typeof Ionicons.glyphMap;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [S.quickPill, action.id === 'compatibility' && S.quickPillWide, pressed && S.pressed]}>
      <View style={S.quickIconBubble}>
        <Ionicons name={iconName} size={16} color={P.accent} />
      </View>
      <Text style={S.quickLabel} numberOfLines={1}>{action.label}</Text>
    </Pressable>
  );
}

function DailySummaryCard({
  S,
  model,
  loading,
  onPress,
}: {
  S: ReturnType<typeof makeStyles>;
  P: Palette;
  model: HomeV2Model;
  loading: boolean;
  onPress: () => void;
}) {
  const summary = model.dailySummary;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [S.cardBase, S.summaryCard, pressed && S.pressed]}>
      <View style={S.cardTopHighlight} />
      <View style={S.sectionHeaderRow}>
        <Text style={S.sectionTitle}>Günlük Özet</Text>
        <View style={S.scoreChip}>
          <Text style={S.scoreValue}>{typeof summary.scoreValue === 'number' ? summary.scoreValue : '--'}</Text>
          <Text style={S.scoreLabel}>{summary.scoreLabel}</Text>
        </View>
      </View>

      <View style={S.summaryLinesWrap}>
        <Text style={[S.summaryLine, loading && S.loadingText]} numberOfLines={1}>
          <Text style={S.summaryLineLabel}>Tema: </Text>
          {summary.themeText}
        </Text>
        <Text style={[S.summaryLine, loading && S.loadingText]} numberOfLines={1}>
          <Text style={S.summaryLineLabel}>Öneri: </Text>
          {summary.suggestionText}
        </Text>
      </View>

      <View style={S.divider} />

      <View style={S.summaryChipsRow}>
        {summary.chips.map((chip) => (
          <View key={`${chip.label}-${chip.value}`} style={[S.summaryChip, S[`summaryChip_${chip.tone}` as const]]}>
            <Text style={S.summaryChipText} numberOfLines={1}>{chip.label}: {chip.value}</Text>
          </View>
        ))}
        <Ionicons name="chevron-forward" size={18} color={S.__palette.chevron} style={S.chevronInline} />
      </View>
    </Pressable>
  );
}

function TransitInsightsCard({
  S,
  model,
  loading,
  onPress,
}: {
  S: ReturnType<typeof makeStyles>;
  P: Palette;
  model: HomeV2Model;
  loading: boolean;
  onPress: () => void;
}) {
  const transit = model.transitToday;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [S.cardBase, S.transitCard, pressed && S.pressed]}>
      <View style={S.cardTopHighlight} />
      <View style={S.sectionHeaderRow}>
        <Text style={S.sectionTitle}>Günün Transitleri</Text>
        <View style={S.transitHeaderBadge}>
          <Ionicons name="planet-outline" size={12} color={S.__palette.accent} />
          <Text style={S.transitHeaderBadgeText}>Bugün</Text>
        </View>
      </View>

      <Text style={[S.transitHeadline, loading && S.loadingText]} numberOfLines={2}>
        {transit.headline}
      </Text>
      <Text style={[S.transitSummary, loading && S.loadingText]} numberOfLines={2}>
        {transit.summary}
      </Text>

      <View style={S.transitMetaRow}>
        {transit.metaChips.map((chip) => (
          <View key={chip.id} style={S.transitMetaChip}>
            <Text style={S.transitMetaChipText} numberOfLines={1}>
              {chip.label}: {chip.value}
            </Text>
          </View>
        ))}
      </View>

      <View style={S.transitPointsWrap}>
        {transit.points.slice(0, 3).map((point, idx) => (
          <View key={`${idx}-${point}`} style={S.transitPointRow}>
            <View style={S.transitPointDot} />
            <Text style={[S.transitPointText, loading && S.loadingText]} numberOfLines={1}>{point}</Text>
          </View>
        ))}
      </View>

      <View style={S.transitFooterRow}>
        <Text style={S.transitFooterText}>Detaylı yorum için dokun</Text>
        <Ionicons name="chevron-forward" size={16} color={S.__palette.chevron} />
      </View>
    </Pressable>
  );
}

function DecisionCompassCard({
  S,
  P,
  items,
  overallScore,
  loading,
  onPressAll,
  onPressItem,
  onPressItemDetail,
}: {
  S: ReturnType<typeof makeStyles>;
  P: Palette;
  items: HomeV2DecisionCompassItem[];
  overallScore?: number | null;
  loading: boolean;
  onPressAll: () => void;
  onPressItem: (item: HomeV2DecisionCompassItem) => void;
  onPressItemDetail?: (item: HomeV2DecisionCompassItem) => void;
}) {
  const hiddenCategoryKeys = useDecisionCompassStore((state) => state.hiddenCategoryKeys);
  const setCategoryVisibility = useDecisionCompassStore((state) => state.setCategoryVisibility);
  const resetHiddenCategories = useDecisionCompassStore((state) => state.resetHiddenCategories);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [expandedList, setExpandedList] = React.useState(false);
  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);
  const filteredItems = React.useMemo(
    () =>
      items.filter((item) => {
        const key = item.categoryKey?.trim();
        return !key || !hiddenCategoryKeys.includes(key);
      }),
    [hiddenCategoryKeys, items],
  );
  const categoryOptions = React.useMemo(
    () =>
      items
        .filter((item) => !!item.categoryKey)
        .map((item) => ({
          key: item.categoryKey!.trim(),
          label: item.label,
          score: item.score,
          icon: item.icon,
        }))
        .filter((item, index, arr) => arr.findIndex((x) => x.key === item.key) === index)
        .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, 'tr')),
    [items],
  );
  const visibleItems = expandedList ? filteredItems : filteredItems.slice(0, 3);
  const extraCount = Math.max(0, filteredItems.length - 3);
  const computedScore = filteredItems.length
    ? Math.round(filteredItems.reduce((sum, item) => sum + item.score, 0) / filteredItems.length)
    : null;
  const headerScore = typeof overallScore === 'number' ? Math.round(overallScore) : computedScore;
  const topChips = filteredItems.slice(0, 3);

  React.useEffect(() => {
    if (expandedRowId && !filteredItems.some((item) => item.id === expandedRowId)) {
      setExpandedRowId(null);
    }
  }, [expandedRowId, filteredItems]);

  return (
    <View style={[S.cardBase, S.compassCard]}>
      <View style={S.cardTopHighlight} />

      <View style={S.compassLegacyHeader}>
        <View style={S.compassLegacyHeaderTextWrap}>
          <Text style={S.compassLegacyEyebrow}>KOZMİK YAŞAM REHBERİ</Text>
          <Text style={S.compassLegacyTitle}>Bugünün Karar Pusulası</Text>
          <Text style={S.compassLegacySubtitle}>Yıldız haritana göre sana en uygun anları yüzdesel olarak belirledik. Detay için butonu kullan.</Text>
        </View>

        <View style={S.compassLegacyHeaderActions}>
          <Pressable onPress={() => setSettingsOpen(true)} style={({ pressed }) => [S.compassSettingsBtn, pressed && S.pressed]}>
            <Ionicons name="options-outline" size={16} color={S.__palette.iconStrong} />
          </Pressable>
          <Pressable onPress={onPressAll} style={({ pressed }) => [S.compassHeaderLinkBtn, pressed && S.pressed]}>
            <Text style={S.compassHeaderLinkText}>Tümünü Gör</Text>
          </Pressable>
          <View style={[S.scoreChip, S.compassHeaderScoreChip]}>
            <Text style={S.scoreValue}>
              {typeof headerScore === 'number' ? `${headerScore}%` : '--'}
            </Text>
            <Text style={S.scoreLabel}>Genel</Text>
          </View>
        </View>
      </View>

      <View style={S.compassHeaderProgressTrack}>
        <View
          style={[
            S.compassHeaderProgressFill,
            {
              width: `${Math.max(8, Math.min(100, typeof headerScore === 'number' ? headerScore : 8))}%`,
              backgroundColor: typeof headerScore === 'number'
                ? compassScoreTone(headerScore, S.__palette).fill
                : S.__palette.accent,
            },
          ]}
        />
      </View>

      {topChips.length ? (
        <View style={S.compassTopSummaryRow}>
          {topChips.map((item) => {
            const tone = compassScoreTone(item.score, S.__palette);
            return (
              <View key={`chip-${item.id}`} style={[S.compassTopSummaryChip, { borderColor: tone.border }]}>
                <View style={[S.compassTopSummaryDot, { backgroundColor: tone.fill }]} />
                <Text style={S.compassTopSummaryText} numberOfLines={1}>{item.label}</Text>
                <Text style={[S.compassTopSummaryScore, { color: tone.text }]}>{item.score}%</Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={S.compassListWrap}>
        {!filteredItems.length ? (
          <View style={S.compassAllHiddenCard}>
            <Text style={S.compassAllHiddenTitle}>Tüm kategoriler gizlendi</Text>
            <Text style={S.compassAllHiddenBody}>Ayarlar menüsünden görünür kategorileri tekrar açabilirsiniz.</Text>
            <Pressable onPress={resetHiddenCategories} style={({ pressed }) => [S.compassAllHiddenBtn, pressed && S.pressed]}>
              <Text style={S.compassAllHiddenBtnText}>Kategorileri Sıfırla</Text>
            </Pressable>
          </View>
        ) : null}
        {visibleItems.map((item) => {
          const tone = compassScoreTone(item.score, S.__palette);
          const isRowExpanded = expandedRowId === item.id;
          const itemCountText =
            typeof item.itemCount === 'number' && item.itemCount > 0
              ? `${item.itemCount} alt kategori`
              : null;

          return (
            <View key={item.id} style={[S.compassRowCard, isRowExpanded && S.compassRowCardExpanded]}>
              <View style={S.compassRowTopGlow} />
              <Pressable
                onPress={() => setExpandedRowId((prev) => (prev === item.id ? null : item.id))}
                style={({ pressed }) => [S.compassRowHeadPress, pressed && S.pressed]}
              >
                <View style={S.compassIconCircle}>
                  <Ionicons name={compassIconName(item.icon)} size={16} color={compassIconColor(item.icon, S.__palette)} />
                </View>

                <View style={S.compassRowTitleWrap}>
                  <Text style={[S.compassRowTitle, loading && S.loadingText]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <View style={S.compassRowMetaLine}>
                    {itemCountText ? (
                      <Text style={[S.compassRowMetaText, loading && S.loadingText]} numberOfLines={1}>
                        {itemCountText}
                      </Text>
                    ) : null}
                    {item.activityLabel ? (
                      <Text style={[S.compassRowMetaText, S.compassRowMetaAccent, loading && S.loadingText]} numberOfLines={1}>
                        {itemCountText ? ' • ' : ''}
                        Detay: {item.activityLabel}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={[S.compassScoreChip, S.compassScoreChipLarge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                  <Text style={[S.compassScoreText, S.compassScoreTextLarge, { color: tone.text }]}>{item.score}%</Text>
                </View>

                <Ionicons
                  name={isRowExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={S.__palette.chevron}
                />
              </Pressable>

              {isRowExpanded ? (
                <View style={S.compassRowExpandedPanel}>
                  <Text style={S.compassRowExpandedAdvice}>
                    {item.shortAdvice?.trim() || 'Bugün bu alanda dengeli ve bilinçli ilerlemek daha güçlü sonuç verir.'}
                  </Text>

                  <View style={S.compassRowExpandedProgressTrack}>
                    <View
                      style={[
                        S.compassRowExpandedProgressFill,
                        {
                          width: `${Math.max(8, Math.min(100, item.score))}%`,
                          backgroundColor: tone.fill,
                        },
                      ]}
                    />
                  </View>

                  <View style={S.compassRowExpandedActions}>
                    <View style={[
                      S.compassExpandedTypePill,
                      item.kind === 'warning' ? S.compassExpandedTypePill_warning : S.compassExpandedTypePill_opportunity,
                    ]}>
                      <Text style={[
                        S.compassExpandedTypePillText,
                        item.kind === 'warning' ? S.compassExpandedTypePillText_warning : S.compassExpandedTypePillText_opportunity,
                      ]}>
                        {item.kind === 'warning' ? 'Uyarı' : 'Fırsat'}
                      </Text>
                    </View>

                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        onPressItem(item);
                      }}
                      style={({ pressed }) => [S.compassSecondaryActionBtn, pressed && S.pressed]}
                    >
                      <Ionicons name="calendar-outline" size={12} color={S.__palette.iconMuted} />
                      <Text style={S.compassSecondaryActionText}>Liste</Text>
                    </Pressable>

                    {onPressItemDetail && item.categoryKey ? (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          onPressItemDetail(item);
                        }}
                        style={({ pressed }) => [S.compassPrimaryActionBtn, pressed && S.pressed]}
                      >
                        <Text style={S.compassPrimaryActionText}>Detay</Text>
                        <Ionicons name="chevron-forward" size={12} color={S.__palette.accent} />
                      </Pressable>
                    ) : null}
                  </View>

                  {item.subItems?.length ? (
                    <View style={S.compassExpandedSubList}>
                      <View style={S.compassExpandedSubDivider} />
                      <Text style={S.compassExpandedSubTitle}>Alt Kategoriler</Text>
                      {item.subItems.slice(0, 4).map((sub) => {
                        const subTone = compassScoreTone(sub.score, S.__palette);
                        return (
                          <View key={sub.id} style={S.compassExpandedSubRow}>
                            <View style={[S.compassExpandedSubDot, { backgroundColor: subTone.fill }]} />
                            <Text style={S.compassExpandedSubLabel} numberOfLines={1}>{sub.label}</Text>
                            <View style={[S.compassExpandedSubScorePill, { backgroundColor: subTone.bg, borderColor: subTone.border }]}>
                              <Text style={[S.compassExpandedSubScoreText, { color: subTone.text }]}>{sub.score}%</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {extraCount > 0 ? (
        <View style={S.compassAccordionWrap}>
          <Pressable onPress={() => setExpandedList((v) => !v)} style={({ pressed }) => [S.compassAccordionBtn, pressed && S.pressed]}>
            <View style={S.compassAccordionBtnLeft}>
              <View style={S.compassAccordionIconBubble}>
                <Ionicons name={expandedList ? 'layers-outline' : 'list-outline'} size={14} color={S.__palette.accent} />
              </View>
              <Text style={S.compassAccordionText}>
                {expandedList ? 'Özet görünümüne dön' : `${extraCount} kategori daha göster`}
              </Text>
            </View>
            <Ionicons
              name={expandedList ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={S.__palette.chevron}
            />
          </Pressable>
        </View>
      ) : null}

      <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
        <View style={S.compassSettingsBackdropRoot}>
          <Pressable style={S.compassSettingsBackdrop} onPress={() => setSettingsOpen(false)} />
          <View style={S.compassSettingsSheet}>
            <View style={S.compassSettingsHeader}>
              <View style={S.compassSettingsHeaderTextWrap}>
                <Text style={S.compassSettingsKicker}>KATEGORİ GÖRÜNÜRLÜĞÜ</Text>
                <Text style={S.compassSettingsTitle}>Karar Pusulası Ayarları</Text>
                <Text style={S.compassSettingsSubtitle}>Ana sayfa ve detay ekranlarında hangi kategorilerin görüneceğini seç.</Text>
              </View>
              <Pressable onPress={() => setSettingsOpen(false)} style={({ pressed }) => [S.compassSettingsCloseBtn, pressed && S.pressed]}>
                <Ionicons name="close" size={16} color={S.__palette.iconStrong} />
              </Pressable>
            </View>

            <ScrollView style={S.compassSettingsScroll} contentContainerStyle={S.compassSettingsScrollContent}>
              {categoryOptions.map((category) => {
                const visible = !hiddenCategoryKeys.includes(category.key);
                const tone = compassScoreTone(category.score, S.__palette);
                return (
                  <View key={category.key} style={S.compassSettingsRow}>
                    <View style={[S.compassSettingsIconBubble, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                      <Ionicons name={compassIconName(category.icon)} size={15} color={compassIconColor(category.icon, S.__palette)} />
                    </View>
                    <View style={S.compassSettingsRowTextWrap}>
                      <Text style={S.compassSettingsRowTitle} numberOfLines={1}>{category.label}</Text>
                      <Text style={S.compassSettingsRowMeta}>{category.score}%</Text>
                    </View>
                    <Switch
                      value={visible}
                      onValueChange={(next) => setCategoryVisibility(category.key, next)}
                      thumbColor={Platform.OS === 'android' ? (visible ? '#FFFFFF' : '#F5F4FA') : undefined}
                      trackColor={{
                        false: P.rowStroke,
                        true: isColorDarkModeAccent(S.__palette) ? 'rgba(194,168,255,0.38)' : 'rgba(122,91,234,0.36)',
                      }}
                      ios_backgroundColor={P.rowStroke}
                    />
                  </View>
                );
              })}
            </ScrollView>

            <View style={S.compassSettingsFooter}>
              <Pressable onPress={resetHiddenCategories} style={({ pressed }) => [S.compassSettingsResetBtn, pressed && S.pressed]}>
                <Text style={S.compassSettingsResetText}>Tümünü Göster</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function WeeklyCard({
  S,
  model,
  loading,
}: {
  S: ReturnType<typeof makeStyles>;
  P: Palette;
  model: HomeV2Model;
  loading: boolean;
}) {
  const [expandedId, setExpandedId] = React.useState<HomeV2Model['weeklyItems'][number]['id'] | null>(null);

  return (
    <View style={[S.cardBase, S.weeklyCard]}>
      <View style={S.cardTopHighlight} />
      <View style={S.sectionHeaderRow}>
        <Text style={S.sectionTitle}>Bu Hafta</Text>
        <Text style={S.sectionDateText}>{model.weekRangeLabel}</Text>
      </View>

      <View style={S.weeklyListWrap}>
        {model.weeklyItems.map((row) => (
          <Pressable
            key={row.id}
            onPress={() => setExpandedId((prev) => (prev === row.id ? null : row.id))}
            style={({ pressed }) => [S.weeklyRow, expandedId === row.id && S.weeklyRowExpanded, pressed && S.pressed]}
          >
            <View style={S.weeklyRowTopGlow} />
            <View style={S.weeklyIconBubble}>
              <Ionicons name={weeklyIconName(row.id)} size={14} color={weeklyIconColor(row.tone, S.__palette)} />
            </View>

            <View style={S.weeklyTextWrap}>
              <View style={S.weeklyTitleRow}>
                <Text style={S.weeklyTitle} numberOfLines={1}>{row.title}</Text>
                <View style={[S.weeklyBadge, weeklyBadgeStyle(row.tone, S.__palette)]}>
                  <Text style={[S.weeklyBadgeText, weeklyBadgeTextStyle(row.tone, S.__palette)]}>{row.badge}</Text>
                </View>
                <Ionicons
                  name={expandedId === row.id ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={S.__palette.chevron}
                />
              </View>
              <Text style={[S.weeklyPreview, loading && S.loadingText]} numberOfLines={1}>• {row.preview}</Text>
              {expandedId === row.id ? (
                <View style={S.weeklyExpandedPanel}>
                  <Text style={S.weeklyExpandedText}>{weeklyDetailDescription(row)}</Text>
                  <View style={S.weeklyExpandedActionRow}>
                    <View style={[S.weeklyExpandedActionChip, weeklyBadgeStyle(row.tone, S.__palette)]}>
                      <Ionicons name="sparkles-outline" size={12} color={weeklyBadgeTextStyle(row.tone, S.__palette).color} />
                      <Text style={[S.weeklyExpandedActionText, weeklyBadgeTextStyle(row.tone, S.__palette)]}>
                        {row.preview.replace(/^1 adım:\s*/i, '')}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function compassIconName(icon: HomeV2DecisionCompassItem['icon']): keyof typeof Ionicons.glyphMap {
  switch (icon) {
    case 'career': return 'briefcase-outline';
    case 'beauty': return 'color-palette-outline';
    case 'finance': return 'wallet-outline';
    case 'heart': return 'heart-outline';
    case 'social': return 'people-outline';
    case 'health': return 'fitness-outline';
    default: return 'sparkles-outline';
  }
}

function weeklyIconName(id: HomeV2Model['weeklyItems'][number]['id']): keyof typeof Ionicons.glyphMap {
  switch (id) {
    case 'strength': return 'flash-outline';
    case 'opportunity': return 'star-outline';
    case 'threat': return 'warning-outline';
    case 'weakness': return 'alert-circle-outline';
    default: return 'ellipse-outline';
  }
}

function weeklyIconColor(tone: HomeV2StatusTone, P: Palette) {
  switch (tone) {
    case 'high': return P.badgeHighText;
    case 'medium': return P.badgeMediumText;
    case 'risk': return P.badgeRiskText;
  }
}

function weeklyBadgeStyle(tone: HomeV2StatusTone, P: Palette) {
  switch (tone) {
    case 'high': return { backgroundColor: P.badgeHighBg };
    case 'medium': return { backgroundColor: P.badgeMediumBg };
    case 'risk': return { backgroundColor: P.badgeRiskBg };
  }
}

function weeklyBadgeTextStyle(tone: HomeV2StatusTone, P: Palette) {
  switch (tone) {
    case 'high': return { color: P.badgeHighText };
    case 'medium': return { color: P.badgeMediumText };
    case 'risk': return { color: P.badgeRiskText };
  }
}

function weeklyDetailDescription(row: HomeV2Model['weeklyItems'][number]): string {
  switch (row.id) {
    case 'strength':
      return 'Bu alanda momentum yüksek. İçsel dengeyi koruyarak görünür bir adım attığında sonuç alma olasılığı artar.';
    case 'opportunity':
      return 'Zamanlama penceresi açık. Küçük ama net bir aksiyon, haftanın geri kalanında daha güçlü fırsatlar üretebilir.';
    case 'threat':
      return 'Duygusal tepki veya acele karar riski var. Önce durup ritmi gözlemlemek daha güvenli sonuç verir.';
    case 'weakness':
      return 'Enerji yönetimi öncelikli. Performans yerine sürdürülebilir tempo seçmek verimi artırır.';
    default:
      return 'Bu hafta için kısa bir aksiyon planı belirlemek dengeyi güçlendirir.';
  }
}

function compassIconColor(icon: HomeV2DecisionCompassItem['icon'], P: Palette): string {
  switch (icon) {
    case 'career': return P.accent;
    case 'beauty': return P.beauty;
    case 'finance': return P.finance;
    case 'heart': return P.heart;
    case 'social': return P.social;
    case 'health': return P.health;
    default: return P.accent;
  }
}

function compassScoreTone(score: number, P: Palette) {
  if (score >= 75) {
    return {
      bg: 'rgba(122,91,234,0.22)',
      border: 'rgba(122,91,234,0.18)',
      text: P.accent,
      fill: P.accent,
    };
  }
  if (score >= 55) {
    return {
      bg: 'rgba(122,91,234,0.12)',
      border: 'rgba(122,91,234,0.10)',
      text: P.text,
      fill: isColorDarkModeAccent(P) ? 'rgba(194,168,255,0.86)' : 'rgba(122,91,234,0.88)',
    };
  }
  if (score >= 40) {
    return {
      bg: 'rgba(139,132,164,0.10)',
      border: 'rgba(139,132,164,0.10)',
      text: P.textSecondary,
      fill: isColorDarkModeAccent(P) ? 'rgba(170,163,196,0.65)' : 'rgba(141,137,162,0.72)',
    };
  }
  return {
    bg: 'rgba(130,130,146,0.08)',
    border: 'rgba(130,130,146,0.10)',
    text: P.textTertiary,
    fill: isColorDarkModeAccent(P) ? 'rgba(130,130,146,0.48)' : 'rgba(130,130,146,0.58)',
  };
}

function isColorDarkModeAccent(P: Palette): boolean {
  return P.text === '#EEF2FA';
}

function makePalette(isDark: boolean) {
  if (isDark) {
    return {
      screenGradient: ['#090E19', '#101528', '#171A27'],
      surface: 'rgba(18, 23, 34, 0.74)',
      surfaceSoft: 'rgba(255,255,255,0.03)',
      surfaceStroke: 'rgba(255,255,255,0.08)',
      rowStroke: 'rgba(255,255,255,0.05)',
      text: '#EEF2FA',
      textSecondary: '#B7B0CB',
      textTertiary: '#9790AD',
      textOnHero: '#FAFBFF',
      textOnHeroSub: 'rgba(235,229,255,0.9)',
      accent: '#C2A8FF',
      accentSoft: 'rgba(180,148,255,0.14)',
      accentGlow: 'rgba(157,118,255,0.18)',
      iconMuted: '#C6C0DC',
      iconStrong: '#E2DDF6',
      chevron: '#958FA8',
      heroGradient: ['#050814', '#090E28', '#1B1740'],
      heroNebula1: 'rgba(141,108,255,0.22)',
      heroNebula2: 'rgba(100,144,255,0.18)',
      cardShadow: '#000000',
      scoreChipBg: 'rgba(180,148,255,0.15)',
      scoreChipText: '#D0BCFF',
      scoreChipSub: '#BEB6D4',
      chipFocusBg: 'rgba(180,148,255,0.14)',
      chipFocusText: '#D4C1FF',
      chipEmotionBg: 'rgba(98,194,165,0.12)',
      chipEmotionText: '#A6E8D2',
      chipRiskBg: 'rgba(141,79,104,0.20)',
      chipRiskText: '#E5B9C7',
      badgeHighBg: 'rgba(173,132,55,0.18)',
      badgeHighText: '#F4DDAF',
      badgeMediumBg: 'rgba(166,128,85,0.16)',
      badgeMediumText: '#E8CFB2',
      badgeRiskBg: 'rgba(132,70,94,0.22)',
      badgeRiskText: '#E8BDCC',
      oracleDot: '#59C3A8',
      topGlow: 'rgba(120,94,241,0.12)',
      bottomGlow: 'rgba(96,78,168,0.12)',
      beauty: '#D99ACD',
      finance: '#E1BF54',
      heart: '#E6A4C3',
      social: '#8FB8FF',
      health: '#88D7A9',
    };
  }

  return {
    screenGradient: ['#FFFFFF', '#F6F3FF', '#F2EEFF'],
    surface: 'rgba(255,255,255,0.96)',
    surfaceSoft: '#FBFAFF',
    surfaceStroke: '#ECE8F7',
    rowStroke: '#EDEAF7',
    text: '#1B2031',
    textSecondary: '#706C86',
    textTertiary: '#8D89A2',
    textOnHero: '#FBFBFF',
    textOnHeroSub: 'rgba(244,240,255,0.9)',
    accent: '#7A5BEA',
    accentSoft: 'rgba(122,91,234,0.08)',
    accentGlow: 'rgba(122,91,234,0.10)',
    iconMuted: '#7F7995',
    iconStrong: '#635D7B',
    chevron: '#8E8AA1',
    heroGradient: ['#040714', '#090E2A', '#171333'],
    heroNebula1: 'rgba(163,127,255,0.28)',
    heroNebula2: 'rgba(114,132,255,0.18)',
    cardShadow: '#B9B0D7',
    scoreChipBg: '#F4F0FF',
    scoreChipText: '#6C59D6',
    scoreChipSub: '#7C7599',
    chipFocusBg: '#F3EEFF',
    chipFocusText: '#5D4FC4',
    chipEmotionBg: '#EEF8F4',
    chipEmotionText: '#2D7665',
    chipRiskBg: '#FBF2EA',
    chipRiskText: '#9A6541',
    badgeHighBg: '#F7F0E2',
    badgeHighText: '#A1711F',
    badgeMediumBg: '#F6EEE4',
    badgeMediumText: '#8B6A39',
    badgeRiskBg: '#F7EEF1',
    badgeRiskText: '#9A5669',
    oracleDot: '#57B49A',
    topGlow: 'rgba(180,154,255,0.12)',
    bottomGlow: 'rgba(160,136,235,0.10)',
    beauty: '#D28EC6',
    finance: '#E0B94C',
    heart: '#D881A9',
    social: '#719FFF',
    health: '#4DBC89',
  };
}

function makeStyles(P: Palette) {
  const isDark = P.text === '#EEF2FA';
  const styles = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: P.screenGradient[0],
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'web' ? 12 : 8,
      paddingBottom: Platform.OS === 'ios' ? 124 : Platform.OS === 'web' ? 40 : 96,
      gap: 12,
    },
    backgroundLayer: {
      ...StyleSheet.absoluteFillObject,
    },
    bgDot: {
      position: 'absolute',
      backgroundColor: isDark ? '#FFFFFF' : '#6F5ACD',
    },
    bgGlowTop: {
      position: 'absolute',
      top: 36,
      left: 16,
      width: 180,
      height: 120,
      borderRadius: 90,
      backgroundColor: P.topGlow,
    },
    bgGlowBottom: {
      position: 'absolute',
      right: 12,
      bottom: 118,
      width: 180,
      height: 120,
      borderRadius: 90,
      backgroundColor: P.bottomGlow,
    },

    topWrap: {
      paddingTop: Platform.OS === 'web' ? 8 : 4,
      gap: 6,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    profileBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flexShrink: 1,
    },
    avatarCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.88)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(122,91,234,0.10)',
      shadowColor: isDark ? '#000' : '#C4BCD9',
      shadowOpacity: isDark ? 0.24 : 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    userName: {
      color: P.text,
      fontSize: 18,
      fontWeight: '700',
      letterSpacing: -0.3,
      maxWidth: 180,
    },
    topActions: {
      flexDirection: 'row',
      gap: 10,
    },
    iconCircleBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(248,246,255,0.94)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.09)' : '#E9E5F5',
      shadowColor: isDark ? '#000' : '#C4BCD9',
      shadowOpacity: isDark ? 0.18 : 0.10,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    topInfoLine: {
      color: P.textTertiary,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 0.1,
      marginLeft: 2,
    },

    heroOuter: {
      borderRadius: 22,
      shadowColor: isDark ? '#000' : P.cardShadow,
      shadowOpacity: isDark ? 0.38 : 0.16,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 12 },
      elevation: 6,
    },
    heroCard: {
      minHeight: 166,
      borderRadius: 22,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
      padding: 16,
    },
    heroNebulaOne: {
      position: 'absolute',
      right: 26,
      bottom: -6,
      width: 190,
      height: 130,
      borderRadius: 95,
      backgroundColor: P.heroNebula1,
    },
    heroNebulaTwo: {
      position: 'absolute',
      right: 80,
      top: 28,
      width: 120,
      height: 80,
      borderRadius: 60,
      backgroundColor: P.heroNebula2,
    },
    heroStar: {
      position: 'absolute',
      backgroundColor: '#FFFFFF',
    },
    heroMoonGlow: {
      position: 'absolute',
      right: 34,
      top: 16,
      width: 122,
      height: 122,
      borderRadius: 61,
      backgroundColor: P.accentGlow,
    },
    heroMoon: {
      position: 'absolute',
      right: 44,
      top: 28,
      width: 82,
      height: 82,
      borderRadius: 41,
      backgroundColor: '#F5F1FB',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
      overflow: 'hidden',
    },
    heroMoonTextureA: {
      position: 'absolute',
      left: 16,
      top: 14,
      width: 22,
      height: 18,
      borderRadius: 12,
      backgroundColor: 'rgba(120,118,145,0.18)',
    },
    heroMoonTextureB: {
      position: 'absolute',
      left: 30,
      top: 34,
      width: 28,
      height: 22,
      borderRadius: 14,
      backgroundColor: 'rgba(111,109,137,0.15)',
    },
    heroMoonTextureC: {
      position: 'absolute',
      left: 10,
      top: 44,
      width: 18,
      height: 14,
      borderRadius: 10,
      backgroundColor: 'rgba(109,107,135,0.12)',
    },
    heroMoonShadow: {
      position: 'absolute',
      left: -8,
      top: -2,
      width: 62,
      height: 86,
      borderRadius: 43,
      backgroundColor: 'rgba(17,21,34,0.36)',
    },
    heroMoonRim: {
      position: 'absolute',
      left: 14,
      top: 0,
      width: 54,
      height: 82,
      borderRadius: 40,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
    },
    heroDetailPill: {
      position: 'absolute',
      right: 14,
      top: 12,
      height: 28,
      borderRadius: 14,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(248,244,255,0.92)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.72)',
    },
    heroDetailText: {
      color: isDark ? '#DCCEFF' : '#6A57D8',
      fontSize: 13,
      fontWeight: '700',
    },
    heroTextWrap: {
      marginTop: 54,
      maxWidth: '74%',
      gap: 8,
    },
    heroTitle: {
      color: P.textOnHero,
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: -0.4,
    },
    heroSubtitle: {
      color: P.textOnHeroSub,
      fontSize: 12,
      fontWeight: '600',
    },
    heroDescription: {
      color: P.textOnHeroSub,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500',
      marginTop: 8,
      paddingRight: 8,
    },

    quickRow: {
      flexDirection: 'row',
      gap: 8,
    },
    quickRowShell: {
      position: 'relative',
      marginHorizontal: -2,
    },
    quickRowScroll: {
      marginHorizontal: -2,
    },
    quickRowContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 2,
      paddingRight: 18,
    },
    quickRowFadeLeft: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 18,
      zIndex: 2,
    },
    quickRowFadeRight: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 24,
      zIndex: 2,
    },
    quickPill: {
      minHeight: 44,
      borderRadius: 22,
      backgroundColor: isDark ? 'rgba(17,23,34,0.70)' : 'rgba(255,255,255,0.96)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#ECE8F7',
      minWidth: 120,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      shadowColor: isDark ? '#000' : P.cardShadow,
      shadowOpacity: isDark ? 0.18 : 0.10,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    quickPillWide: {
      minWidth: 138,
    },
    quickIconBubble: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: P.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(194,168,255,0.18)' : 'rgba(122,91,234,0.12)',
    },
    quickLabel: {
      color: P.text,
      fontSize: 11.5,
      fontWeight: '700',
      letterSpacing: -0.1,
      flexShrink: 1,
    },

    cardBase: {
      borderRadius: 22,
      backgroundColor: P.surface,
      borderWidth: 1,
      borderColor: P.surfaceStroke,
      padding: 14,
      shadowColor: isDark ? '#000' : P.cardShadow,
      shadowOpacity: isDark ? 0.28 : 0.14,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
      overflow: 'hidden',
    },
    cardTopHighlight: {
      position: 'absolute',
      top: 0,
      left: 16,
      right: 16,
      height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.95)',
    },
    summaryCard: {
      gap: 10,
    },
    transitCard: {
      gap: 10,
    },
    compassCard: {
      gap: 10,
    },
    weeklyCard: {
      gap: 10,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    sectionTitle: {
      color: P.text,
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    sectionDateText: {
      color: P.textTertiary,
      fontSize: 12,
      fontWeight: '600',
    },

    scoreChip: {
      minHeight: 28,
      borderRadius: 14,
      paddingHorizontal: 12,
      backgroundColor: P.scoreChipBg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(123,107,206,0.06)',
    },
    scoreValue: {
      color: P.scoreChipText,
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    scoreLabel: {
      color: P.scoreChipSub,
      fontSize: 10,
      fontWeight: '700',
    },
    summaryLinesWrap: {
      gap: 4,
    },
    summaryLine: {
      color: P.textSecondary,
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: -0.1,
    },
    summaryLineLabel: {
      color: P.textTertiary,
      fontWeight: '700',
    },
    divider: {
      height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0EDF7',
    },
    summaryChipsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'nowrap',
    },
    summaryChip: {
      height: 24,
      borderRadius: 12,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
      maxWidth: 120,
      borderWidth: 1,
    },
    summaryChip_focus: {
      backgroundColor: P.chipFocusBg,
      borderColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    },
    summaryChip_emotion: {
      backgroundColor: P.chipEmotionBg,
      borderColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    },
    summaryChip_risk: {
      backgroundColor: P.chipRiskBg,
      borderColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    },
    summaryChipText: {
      color: P.textSecondary,
      fontSize: 10.5,
      fontWeight: '700',
    },
    chevronInline: {
      marginLeft: 'auto',
    },

    transitHeaderBadge: {
      minHeight: 24,
      borderRadius: 12,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: isDark ? 'rgba(180,148,255,0.10)' : 'rgba(122,91,234,0.06)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(122,91,234,0.05)',
    },
    transitHeaderBadgeText: {
      color: P.accent,
      fontSize: 10.5,
      fontWeight: '700',
    },
    transitHeadline: {
      color: P.text,
      fontSize: 14,
      fontWeight: '800',
      lineHeight: 19,
      letterSpacing: -0.2,
    },
    transitSummary: {
      color: P.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 17,
      letterSpacing: -0.1,
    },
    transitMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    transitMetaChip: {
      minHeight: 24,
      borderRadius: 12,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : P.surfaceSoft,
      borderWidth: 1,
      borderColor: P.rowStroke,
      maxWidth: 160,
    },
    transitMetaChipText: {
      color: P.textSecondary,
      fontSize: 10.5,
      fontWeight: '700',
    },
    transitPointsWrap: {
      gap: 6,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.55)',
      borderWidth: 1,
      borderColor: P.rowStroke,
      padding: 10,
    },
    transitPointRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    transitPointDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: P.accent,
    },
    transitPointText: {
      flex: 1,
      color: P.textSecondary,
      fontSize: 11.5,
      fontWeight: '600',
      letterSpacing: -0.1,
    },
    transitFooterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    transitFooterText: {
      color: P.textTertiary,
      fontSize: 11,
      fontWeight: '700',
    },

    linkBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    linkText: {
      color: P.accent,
      fontSize: 12,
      fontWeight: '700',
    },
    compassLegacyHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
    },
    compassLegacyHeaderTextWrap: {
      flex: 1,
      gap: 2,
    },
    compassLegacyEyebrow: {
      color: P.textTertiary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.5,
    },
    compassLegacyTitle: {
      color: P.text,
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: -0.25,
      lineHeight: 20,
    },
    compassLegacySubtitle: {
      color: P.textSecondary,
      fontSize: 11.5,
      lineHeight: 16,
      fontWeight: '600',
      letterSpacing: -0.05,
    },
    compassLegacyHeaderActions: {
      alignItems: 'flex-end',
      gap: 8,
    },
    compassHeaderLinkBtn: {
      minHeight: 20,
      paddingHorizontal: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    compassHeaderLinkText: {
      color: P.accent,
      fontSize: 10.5,
      fontWeight: '700',
      letterSpacing: -0.05,
    },
    compassSettingsBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.84)',
      borderWidth: 1,
      borderColor: P.rowStroke,
      shadowColor: isDark ? '#000' : P.cardShadow,
      shadowOpacity: isDark ? 0.14 : 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    compassHeaderScoreChip: {
      minWidth: 82,
      paddingHorizontal: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    compassHeaderProgressTrack: {
      marginTop: 8,
      height: 4,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(123,107,206,0.10)',
      overflow: 'hidden',
    },
    compassHeaderProgressFill: {
      height: '100%',
      borderRadius: 999,
    },
    compassTopSummaryRow: {
      marginTop: 10,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    compassTopSummaryChip: {
      minHeight: 26,
      maxWidth: '100%',
      borderRadius: 13,
      paddingHorizontal: 9,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : P.surfaceSoft,
      borderWidth: 1,
    },
    compassTopSummaryDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    compassTopSummaryText: {
      color: P.textSecondary,
      fontSize: 10.5,
      fontWeight: '700',
      maxWidth: 98,
      flexShrink: 1,
    },
    compassTopSummaryScore: {
      color: P.text,
      fontSize: 10.5,
      fontWeight: '800',
    },
    compassListWrap: {
      gap: 8,
      marginTop: 10,
    },
    compassAllHiddenCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: P.rowStroke,
      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.70)',
      padding: 12,
      gap: 6,
    },
    compassAllHiddenTitle: {
      color: P.text,
      fontSize: 12.5,
      fontWeight: '800',
      letterSpacing: -0.15,
    },
    compassAllHiddenBody: {
      color: P.textSecondary,
      fontSize: 11.5,
      lineHeight: 16,
      fontWeight: '600',
    },
    compassAllHiddenBtn: {
      alignSelf: 'flex-start',
      marginTop: 2,
      minHeight: 26,
      borderRadius: 13,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(180,148,255,0.10)' : 'rgba(122,91,234,0.07)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(122,91,234,0.08)',
    },
    compassAllHiddenBtnText: {
      color: P.accent,
      fontSize: 10.5,
      fontWeight: '700',
    },
    compassRowCard: {
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : P.surfaceSoft,
      borderWidth: 1,
      borderColor: P.rowStroke,
      overflow: 'hidden',
    },
    compassRowCardExpanded: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.72)',
    },
    compassRowHeadPress: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 10,
      gap: 8,
    },
    compassAccordionWrap: {
      marginTop: -2,
    },
    compassAccordionBtn: {
      minHeight: 34,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : P.surfaceSoft,
      borderWidth: 1,
      borderColor: P.rowStroke,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    compassAccordionBtnLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    compassAccordionIconBubble: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: P.accentSoft,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(122,91,234,0.08)',
    },
    compassAccordionText: {
      color: P.textSecondary,
      fontSize: 11.5,
      fontWeight: '700',
      letterSpacing: -0.1,
    },
    compassRowTopGlow: {
      position: 'absolute',
      top: 0,
      left: 10,
      right: 10,
      height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)',
    },
    compassIconCircle: {
      width: 30,
      height: 30,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(122,91,234,0.06)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(122,91,234,0.06)',
    },
    compassRowTitleWrap: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    compassRowTitle: {
      color: P.text,
      fontSize: 13.5,
      fontWeight: '800',
      letterSpacing: -0.15,
    },
    compassRowMetaLine: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'nowrap',
      minWidth: 0,
    },
    compassRowMetaText: {
      color: P.textTertiary,
      fontSize: 10.5,
      fontWeight: '700',
      letterSpacing: -0.05,
    },
    compassRowMetaAccent: {
      color: P.textSecondary,
      flexShrink: 1,
    },
    compassScoreChip: {
      minWidth: 44,
      height: 24,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(124,106,205,0.05)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(124,106,205,0.06)',
    },
    compassScoreChipLarge: {
      minWidth: 58,
      height: 28,
      borderRadius: 14,
      paddingHorizontal: 10,
    },
    compassScoreText: {
      color: P.text,
      fontSize: 10.5,
      fontWeight: '800',
    },
    compassScoreTextLarge: {
      fontSize: 11.5,
      fontWeight: '700',
    },
    compassRowExpandedPanel: {
      paddingHorizontal: 10,
      paddingBottom: 10,
      gap: 8,
    },
    compassRowExpandedAdvice: {
      color: P.textSecondary,
      fontSize: 11.5,
      lineHeight: 16,
      fontWeight: '600',
      letterSpacing: -0.05,
    },
    compassRowExpandedProgressTrack: {
      height: 4,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(123,107,206,0.10)',
      overflow: 'hidden',
    },
    compassRowExpandedProgressFill: {
      height: '100%',
      borderRadius: 999,
    },
    compassRowExpandedActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      flexWrap: 'wrap',
      gap: 8,
    },
    compassExpandedTypePill: {
      minHeight: 24,
      borderRadius: 12,
      paddingHorizontal: 9,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      marginRight: 'auto',
    },
    compassExpandedTypePill_opportunity: {
      backgroundColor: isDark ? 'rgba(180,148,255,0.10)' : 'rgba(122,91,234,0.06)',
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(122,91,234,0.08)',
    },
    compassExpandedTypePill_warning: {
      backgroundColor: isDark ? 'rgba(132,70,94,0.16)' : 'rgba(146,139,164,0.07)',
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(146,139,164,0.10)',
    },
    compassExpandedTypePillText: {
      fontSize: 10,
      fontWeight: '700',
    },
    compassExpandedTypePillText_opportunity: {
      color: P.accent,
    },
    compassExpandedTypePillText_warning: {
      color: isDark ? P.badgeRiskText : P.textSecondary,
    },
    compassSecondaryActionBtn: {
      minHeight: 26,
      borderRadius: 13,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.72)',
      borderWidth: 1,
      borderColor: P.rowStroke,
    },
    compassSecondaryActionText: {
      color: P.textSecondary,
      fontSize: 10.5,
      fontWeight: '700',
    },
    compassPrimaryActionBtn: {
      minHeight: 26,
      borderRadius: 13,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: isDark ? 'rgba(180,148,255,0.10)' : 'rgba(122,91,234,0.07)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(122,91,234,0.08)',
    },
    compassPrimaryActionText: {
      color: P.accent,
      fontSize: 10.5,
      fontWeight: '700',
    },
    compassExpandedSubList: {
      gap: 6,
    },
    compassExpandedSubDivider: {
      height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#EEEAF7',
    },
    compassExpandedSubTitle: {
      color: P.textTertiary,
      fontSize: 10.5,
      fontWeight: '800',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    compassExpandedSubRow: {
      minHeight: 28,
      borderRadius: 10,
      paddingHorizontal: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.55)',
      borderWidth: 1,
      borderColor: P.rowStroke,
    },
    compassExpandedSubDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
    compassExpandedSubLabel: {
      flex: 1,
      color: P.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: -0.05,
    },
    compassExpandedSubScorePill: {
      minHeight: 20,
      borderRadius: 10,
      paddingHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    compassExpandedSubScoreText: {
      fontSize: 10,
      fontWeight: '800',
    },
    compassSettingsBackdropRoot: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    compassSettingsBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(5,7,12,0.34)',
    },
    compassSettingsSheet: {
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      backgroundColor: isDark ? 'rgba(14,19,28,0.98)' : 'rgba(252,251,255,0.98)',
      borderTopWidth: 1,
      borderColor: P.surfaceStroke,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: Platform.OS === 'ios' ? 26 : 16,
      maxHeight: '72%',
      gap: 10,
    },
    compassSettingsHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    compassSettingsHeaderTextWrap: {
      flex: 1,
      gap: 2,
    },
    compassSettingsKicker: {
      color: P.textTertiary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.1,
    },
    compassSettingsTitle: {
      color: P.text,
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: -0.2,
    },
    compassSettingsSubtitle: {
      color: P.textSecondary,
      fontSize: 11.5,
      lineHeight: 16,
      fontWeight: '600',
    },
    compassSettingsCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.90)',
      borderWidth: 1,
      borderColor: P.rowStroke,
    },
    compassSettingsScroll: {
      marginHorizontal: -2,
    },
    compassSettingsScrollContent: {
      paddingHorizontal: 2,
      paddingBottom: 2,
      gap: 8,
    },
    compassSettingsRow: {
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.76)',
      borderWidth: 1,
      borderColor: P.rowStroke,
      paddingHorizontal: 10,
      paddingVertical: 9,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    compassSettingsIconBubble: {
      width: 28,
      height: 28,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    compassSettingsRowTextWrap: {
      flex: 1,
      minWidth: 0,
      gap: 1,
    },
    compassSettingsRowTitle: {
      color: P.text,
      fontSize: 12.5,
      fontWeight: '700',
      letterSpacing: -0.1,
    },
    compassSettingsRowMeta: {
      color: P.textTertiary,
      fontSize: 10.5,
      fontWeight: '700',
    },
    compassSettingsFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingTop: 2,
    },
    compassSettingsResetBtn: {
      minHeight: 28,
      borderRadius: 14,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(180,148,255,0.12)' : 'rgba(122,91,234,0.08)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(122,91,234,0.08)',
    },
    compassSettingsResetText: {
      color: P.accent,
      fontSize: 11,
      fontWeight: '700',
    },

    weeklyListWrap: {
      gap: 8,
    },
    weeklyRow: {
      minHeight: 50,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : P.surfaceSoft,
      borderWidth: 1,
      borderColor: P.rowStroke,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      gap: 8,
      overflow: 'hidden',
    },
    weeklyRowExpanded: {
      alignItems: 'flex-start',
      paddingTop: 10,
      paddingBottom: 10,
    },
    weeklyRowTopGlow: {
      position: 'absolute',
      top: 0,
      left: 10,
      right: 10,
      height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.9)',
    },
    weeklyIconBubble: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(122,91,234,0.03)',
    },
    weeklyTextWrap: {
      flex: 1,
      gap: 2,
    },
    weeklyTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    weeklyTitle: {
      flex: 1,
      color: P.text,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: -0.15,
    },
    weeklyBadge: {
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    weeklyBadgeText: {
      fontSize: 10,
      fontWeight: '700',
    },
    weeklyPreview: {
      color: P.textTertiary,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: -0.1,
    },
    weeklyExpandedPanel: {
      marginTop: 6,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.58)',
      borderWidth: 1,
      borderColor: P.rowStroke,
      padding: 8,
      gap: 8,
    },
    weeklyExpandedText: {
      color: P.textSecondary,
      fontSize: 11.5,
      lineHeight: 16,
      fontWeight: '600',
      letterSpacing: -0.05,
    },
    weeklyExpandedActionRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    weeklyExpandedActionChip: {
      minHeight: 24,
      borderRadius: 12,
      paddingHorizontal: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    weeklyExpandedActionText: {
      fontSize: 10.5,
      fontWeight: '700',
      flexShrink: 1,
    },

    footerStatusWrap: {
      alignItems: 'center',
      paddingTop: 2,
      paddingBottom: 8,
    },
    footerStatusPill: {
      minHeight: 28,
      borderRadius: 14,
      paddingHorizontal: 14,
      backgroundColor: isDark ? 'rgba(18,23,34,0.72)' : 'rgba(255,255,255,0.90)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#ECE9F6',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      shadowColor: isDark ? '#000' : P.cardShadow,
      shadowOpacity: isDark ? 0.20 : 0.10,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    footerStatusDotHalo: {
      position: 'absolute',
      left: 14,
      width: 10,
      height: 10,
      borderRadius: 5,
      opacity: 0.16,
    },
    footerStatusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    footerStatusText: {
      color: P.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },

    pressed: {
      opacity: 0.88,
      transform: [{ scale: 0.995 }],
    },
    loadingText: {
      opacity: 0.68,
    },
  });

  return Object.assign(styles, { __palette: P as Palette });
}
