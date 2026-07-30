import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from '../ui/BottomSheet';
import { useTheme } from '../../context/ThemeContext';
import { trackEvent } from '../../services/analytics';
import {
  dreamService,
  type DreamExpansionConfig,
  type DreamExpansionResponse,
  type DreamExpansionType,
} from '../../services/dream.service';
import { useGuruWalletStore } from '../../features/monetization/store/useGuruWalletStore';

const OPTIONS: Array<{ type: DreamExpansionType; icon: React.ComponentProps<typeof Ionicons>['name'] }> = [
  { type: 'PERSON_MEANING', icon: 'person-outline' },
  { type: 'SYMBOL_MEANING', icon: 'sparkles-outline' },
  { type: 'EMOTIONAL_ANALYSIS', icon: 'heart-outline' },
  { type: 'RELATIONSHIP_ANALYSIS', icon: 'people-outline' },
  { type: 'COMPARE_WITH_HISTORY', icon: 'git-compare-outline' },
];

const TARGET_TYPES = new Set<DreamExpansionType>([
  'PERSON_MEANING',
  'SYMBOL_MEANING',
  'RELATIONSHIP_ANALYSIS',
]);

export type DreamExpansionPaymentStatus =
  | 'IDLE'
  | 'CHECKING_BALANCE'
  | 'AWAITING_CONFIRMATION'
  | 'RESERVING_TOKEN'
  | 'GENERATING'
  | 'COMPLETED'
  | 'FAILED'
  | 'TOKEN_NOT_SPENT'
  | 'REFUNDED';

interface DreamExpansionSheetProps {
  visible: boolean;
  dreamId: number;
  isPremium: boolean;
  onClose: () => void;
  onShowPurchase: () => void;
  onShowEarn: (expansionType: DreamExpansionType) => void;
  onShowPremium: () => void;
}

export function DreamExpansionSheet({
  visible,
  dreamId,
  isPremium,
  onClose,
  onShowPurchase,
  onShowEarn,
  onShowPremium,
}: DreamExpansionSheetProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const setBalance = useGuruWalletStore((state) => state.setBalance);
  const [config, setConfig] = useState<DreamExpansionConfig | null>(null);
  const [saved, setSaved] = useState<DreamExpansionResponse[]>([]);
  const [selected, setSelected] = useState<DreamExpansionType>('EMOTIONAL_ANALYSIS');
  const [target, setTarget] = useState('');
  const [activeResult, setActiveResult] = useState<DreamExpansionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [, setPaymentStatus] = useState<DreamExpansionPaymentStatus>('IDLE');
  const requestKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    trackEvent('dream_expansion_sheet_viewed');
    Promise.all([
      dreamService.getExpansionConfig(),
      dreamService.getExpansions(dreamId),
    ]).then(([nextConfig, results]) => {
      setConfig(nextConfig);
      setSaved(results);
      setBalance(nextConfig.currentBalance);
    }).catch(() => {
      Alert.alert(t('dreams.analysis.expansion.errorTitle'), t('dreams.analysis.expansion.loadError'));
    }).finally(() => setLoading(false));
  }, [dreamId, setBalance, t, visible]);

  const cost = config?.costs?.[selected] ?? 0;
  const requiresTarget = TARGET_TYPES.has(selected);

  const submit = (regenerate = false) => {
    setPaymentStatus('CHECKING_BALANCE');
    if (!isPremium || !config?.premiumActive) {
      Alert.alert(
        t('dreams.analysis.expansion.premiumTitle'),
        t('dreams.analysis.expansion.premiumBody'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('dreams.analysis.expansion.openPremium'), onPress: onShowPremium },
        ],
      );
      return;
    }
    if (requiresTarget && !target.trim()) {
      Alert.alert(
        t('dreams.analysis.expansion.targetRequiredTitle'),
        t('dreams.analysis.expansion.targetRequiredBody'),
      );
      return;
    }
    if (config.currentBalance < cost) {
      trackEvent('dream_expansion_insufficient_balance', {
        expansion_type: selected,
        cost,
        balance: config.currentBalance,
      });
      const actions: Array<{ text: string; style?: 'cancel'; onPress?: () => void }> = [
        { text: t('common.cancel'), style: 'cancel' },
      ];
      if (config.rewardedAvailable) {
        actions.push({
          text: t('dreams.analysis.expansion.earnTokens'),
          onPress: () => onShowEarn(selected),
        });
      }
      if (config.purchaseAvailable) {
        actions.push({
          text: t('dreams.analysis.expansion.buyTokens'),
          onPress: onShowPurchase,
        });
      }
      Alert.alert(
        t('dreams.analysis.expansion.insufficientTitle'),
        t('dreams.analysis.expansion.insufficientBody', { cost, balance: config.currentBalance }),
        actions,
      );
      return;
    }

    setPaymentStatus('AWAITING_CONFIRMATION');
    trackEvent('dream_expansion_payment_confirmation_viewed', {
      expansion_type: selected,
      token_cost: cost,
      premium_status: isPremium,
      balance_range: balanceRange(config.currentBalance),
    });
    Alert.alert(
      t('dreams.analysis.expansion.confirmTitle'),
      t('dreams.analysis.expansion.confirmBody', {
        cost,
        balance: config.currentBalance,
        remaining: config.currentBalance - cost,
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('dreams.analysis.expansion.confirmCta', { cost }),
          onPress: () => {
            trackEvent('dream_expansion_payment_confirmed', {
              expansion_type: selected,
              token_cost: cost,
              premium_status: isPremium,
              balance_range: balanceRange(config.currentBalance),
            });
            void execute(regenerate);
          },
        },
      ],
    );
  };

  const execute = async (regenerate: boolean, pricingVersionOverride?: string) => {
    const idempotencyKey = requestKeyRef.current
      ?? `${dreamId}-${selected}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    requestKeyRef.current = idempotencyKey;
    setSubmitting(true);
    setPaymentStatus('RESERVING_TOKEN');
    try {
      const expansionPromise = dreamService.expandAnalysis(dreamId, {
        expansionType: selected,
        targetElement: target.trim() || undefined,
        idempotencyKey,
        pricingVersion: pricingVersionOverride ?? config?.pricingVersion ?? '',
        regenerate,
        locale: i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'tr',
      });
      setPaymentStatus('GENERATING');
      const result = await expansionPromise;
      requestKeyRef.current = null;
      setActiveResult(result);
      setSaved((current) => [
        ...current.filter((item) => item.id !== result.id),
        result,
      ]);
      setConfig((current) => current ? { ...current, currentBalance: result.currentBalance } : current);
      setBalance(result.currentBalance);
      setPaymentStatus('COMPLETED');
      trackEvent('dream_expansion_token_reserved', {
        expansion_type: selected,
        token_cost: result.tokenCost,
        premium_status: isPremium,
        balance_range: balanceRange(result.currentBalance + result.tokenCost),
      });
      trackEvent('dream_expansion_token_spent', {
        expansion_type: selected,
        token_cost: result.tokenCost,
        premium_status: isPremium,
        balance_range: balanceRange(result.currentBalance),
        prompt_version: result.promptVersion,
      });
      trackEvent('dream_expansion_completed', {
        expansion_type: selected,
        token_cost: result.tokenCost,
        premium_status: isPremium,
        balance_range: balanceRange(result.currentBalance),
        prompt_version: result.promptVersion,
        used_existing_result: result.usedExistingResult,
      });
    } catch (error: any) {
      const code = error?.response?.data?.code as string | undefined;
      if (code === 'DREAM_EXPANSION_PRICE_CHANGED') {
        try {
          const nextConfig = await dreamService.getExpansionConfig();
          setConfig(nextConfig);
          setBalance(nextConfig.currentBalance);
          const nextCost = nextConfig.costs[selected];
          setPaymentStatus('AWAITING_CONFIRMATION');
          if (nextConfig.currentBalance < nextCost) {
            const actions: Array<{ text: string; style?: 'cancel'; onPress?: () => void }> = [
              { text: t('common.cancel'), style: 'cancel' },
            ];
            if (nextConfig.rewardedAvailable) {
              actions.push({
                text: t('dreams.analysis.expansion.earnTokens'),
                onPress: () => onShowEarn(selected),
              });
            }
            if (nextConfig.purchaseAvailable) {
              actions.push({
                text: t('dreams.analysis.expansion.buyTokens'),
                onPress: onShowPurchase,
              });
            }
            Alert.alert(
              t('dreams.analysis.expansion.insufficientTitle'),
              t('dreams.analysis.expansion.insufficientBody', {
                cost: nextCost,
                balance: nextConfig.currentBalance,
              }),
              actions,
            );
            requestKeyRef.current = null;
            return;
          }
          Alert.alert(
            t('dreams.analysis.expansion.priceChangedTitle'),
            t('dreams.analysis.expansion.priceChangedBody', {
              cost: nextCost,
              balance: nextConfig.currentBalance,
              remaining: nextConfig.currentBalance - nextCost,
            }),
            [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('dreams.analysis.expansion.confirmCta', { cost: nextCost }),
                onPress: () => void execute(regenerate, nextConfig.pricingVersion),
              },
            ],
          );
          return;
        } catch {
          requestKeyRef.current = null;
        }
      }
      if (code !== 'EXPANSION_ALREADY_PROCESSING') {
        requestKeyRef.current = null;
      }
      if (code === 'INSUFFICIENT_GURU_BALANCE') {
        setConfig((current) => current
          ? { ...current, currentBalance: Math.min(current.currentBalance, cost - 1) }
          : current);
      }
      const refunded = code === 'TOKEN_REFUNDED';
      setPaymentStatus(refunded ? 'REFUNDED' : 'TOKEN_NOT_SPENT');
      if (refunded) {
        trackEvent('dream_expansion_token_refunded', {
          expansion_type: selected,
          token_cost: cost,
          premium_status: isPremium,
          failure_reason: code,
        });
      }
      trackEvent('dream_expansion_generation_failed', {
        expansion_type: selected,
        token_cost: cost,
        premium_status: isPremium,
        failure_reason: code ?? 'UNKNOWN',
      });
      Alert.alert(
        t('dreams.analysis.expansion.errorTitle'),
        t(`dreams.analysis.expansion.errors.${code ?? 'UNKNOWN'}`),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('dreams.analysis.expansion.title')}
      contentStyle={styles.sheetContent}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>{t('dreams.analysis.expansion.balance')}</Text>
              <Text style={styles.balanceValue}>{config?.currentBalance ?? 0} Guru</Text>
            </View>

            {saved.length > 0 ? (
              <View style={styles.savedBlock}>
                <Text style={styles.sectionLabel}>{t('dreams.analysis.expansion.savedTitle')}</Text>
                {saved.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.savedButton}
                    onPress={() => {
                      setSelected(item.expansionType);
                      setActiveResult(item);
                      requestKeyRef.current = null;
                      trackEvent('dream_expansion_existing_result_opened', {
                        expansion_type: item.expansionType,
                        token_cost: item.tokenCost,
                        premium_status: isPremium,
                        prompt_version: item.promptVersion,
                        used_existing_result: true,
                      });
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={18} color={colors.green} />
                    <Text style={styles.savedText}>
                      {t(`dreams.analysis.expansion.types.${item.expansionType}`)}
                    </Text>
                    <Text style={styles.freeLabel}>{t('dreams.analysis.expansion.openFree')}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>{t('dreams.analysis.expansion.chooseTitle')}</Text>
            <View style={styles.optionGrid}>
              {OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.type}
                  style={[styles.option, selected === option.type && styles.optionSelected]}
                  onPress={() => {
                    setSelected(option.type);
                    setActiveResult(null);
                    requestKeyRef.current = null;
                    trackEvent('dream_expansion_option_selected', {
                      expansion_type: option.type,
                      token_cost: config?.costs?.[option.type] ?? 0,
                      premium_status: isPremium,
                      balance_range: balanceRange(config?.currentBalance ?? 0),
                    });
                  }}
                >
                  <Ionicons
                    name={option.icon}
                    size={19}
                    color={selected === option.type ? colors.primary : colors.subtext}
                  />
                  <Text style={[styles.optionText, selected === option.type && styles.optionTextSelected]}>
                    {t(`dreams.analysis.expansion.types.${option.type}`)}
                  </Text>
                  <Text style={styles.costText}>{config?.costs?.[option.type] ?? '–'} Guru</Text>
                </TouchableOpacity>
              ))}
            </View>

            {requiresTarget ? (
              <TextInput
                value={target}
                onChangeText={(value) => {
                  setTarget(value);
                  requestKeyRef.current = null;
                }}
                placeholder={t(`dreams.analysis.expansion.targetPlaceholder.${selected}`)}
                placeholderTextColor={colors.subtext}
                style={styles.input}
                maxLength={300}
              />
            ) : null}

            {activeResult ? (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>{activeResult.result.title}</Text>
                <Text style={styles.resultSummary}>{activeResult.result.summary}</Text>
                {activeResult.result.insights.map((insight, index) => (
                  <View key={`${activeResult.id}-${index}`} style={styles.insightRow}>
                    <View style={styles.dot} />
                    <Text style={styles.insightText}>{insight}</Text>
                  </View>
                ))}
                <Text style={styles.reflection}>{activeResult.result.reflectionPrompt}</Text>
                <TouchableOpacity
                  style={styles.regenerateButton}
                  onPress={() => {
                    trackEvent('dream_expansion_regeneration_requested', {
                      expansion_type: selected,
                      token_cost: cost,
                      premium_status: isPremium,
                    });
                    submit(true);
                  }}
                >
                  <Text style={styles.regenerateText}>
                    {t('dreams.analysis.expansion.regenerate', { cost })}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.disabled]}
                disabled={submitting}
                onPress={() => submit(false)}
              >
                {submitting ? <ActivityIndicator color={colors.white} /> : (
                  <>
                    <Ionicons name="sparkles" size={18} color={colors.white} />
                    <Text style={styles.submitText}>
                      {t('dreams.analysis.expansion.submit', { cost })}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  sheetContent: { paddingBottom: 8 },
  loader: { marginVertical: 40 },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 13,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    marginBottom: 16,
  },
  balanceLabel: { color: colors.subtext, fontSize: 13, fontWeight: '700' },
  balanceValue: { color: colors.text, fontSize: 14, fontWeight: '900' },
  sectionLabel: { color: colors.text, fontSize: 13, fontWeight: '900', marginBottom: 10 },
  savedBlock: { marginBottom: 16 },
  savedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  savedText: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '700' },
  freeLabel: { color: colors.green, fontSize: 11, fontWeight: '800' },
  optionGrid: { gap: 8, marginBottom: 14 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoftBg },
  optionText: { flex: 1, color: colors.body, fontSize: 13, fontWeight: '700' },
  optionTextSelected: { color: colors.primary },
  costText: { color: colors.subtext, fontSize: 11, fontWeight: '800' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: colors.text,
    backgroundColor: colors.surface,
    marginBottom: 14,
  },
  submitButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  disabled: { opacity: 0.6 },
  submitText: { color: colors.white, fontSize: 14, fontWeight: '900' },
  resultCard: {
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderRadius: 18,
    padding: 16,
    backgroundColor: colors.primarySoftBg,
    marginBottom: 14,
  },
  resultTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginBottom: 8 },
  resultSummary: { color: colors.body, fontSize: 14, lineHeight: 21, marginBottom: 10 },
  insightRow: { flexDirection: 'row', gap: 9, marginVertical: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginTop: 7 },
  insightText: { flex: 1, color: colors.body, fontSize: 13, lineHeight: 20 },
  reflection: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  regenerateButton: { alignSelf: 'flex-start', marginTop: 14 },
  regenerateText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
});

function balanceRange(balance: number): '0' | '1-5' | '6-20' | '21+' {
  if (balance <= 0) return '0';
  if (balance <= 5) return '1-5';
  if (balance <= 20) return '6-20';
  return '21+';
}
