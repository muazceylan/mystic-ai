export type RelationshipType = 'love' | 'work' | 'friend' | 'family' | 'rival';

export type CompareModuleCode = 'LOVE' | 'WORK' | 'FRIEND' | 'FAMILY' | 'RIVAL';

export type Label = 'Uyumlu' | 'Gelişim' | 'Dikkat';

export type ThemeGroup =
  | 'Aşk & Çekim'
  | 'İletişim'
  | 'Güven'
  | 'Duygusal Tempo'
  | 'Sevgi Dili'
  | 'Duygusal Bağ'
  | 'Tutku'
  | 'Romantik Akış'
  | 'Yakınlık Dengesi'
  | 'Karar & Plan'
  | 'Plan Uyumu'
  | 'Görev Uyumu'
  | 'Karar Hızı'
  | 'Aile Bağı'
  | 'Bağlılık'
  | 'Şefkat'
  | 'Sorumluluk'
  | 'Onarım'
  | 'Destek & Sadakat'
  | 'Sohbet Akışı'
  | 'Eğlence'
  | 'İş Bölümü'
  | 'Rekabet & Strateji'
  | 'Rekabet Dili'
  | 'Strateji'
  | 'Gerilim'
  | 'Baskı Altı Performans'
  | 'Sınırlar'
  | 'Krizi Yönetme';

export type DistributionWarningKey =
  | 'scores_clustered'
  | 'low_confidence_damped'
  | 'house_precision_limited'
  | null;

export type MetricStatus = 'strong' | 'balanced' | 'watch' | 'growth' | 'intense';

export interface CompareOverallDTO {
  score: number;
  levelLabel: string;
  confidence: number;
  confidenceLabel: string;
  percentile: number;
}

export interface CompareSummaryDTO {
  headline: string;
  shortNarrative: string;
  dailyLifeHint: string;
}

export interface CompareMetricCardDTO {
  id: string;
  title: string;
  score: number;
  status: MetricStatus;
  insight: string;
}

export interface CompareDriverDTO {
  title: string;
  impact: number;
  why: string;
  hint: string;
}

export interface CompareTopDriversDTO {
  supportive: CompareDriverDTO[];
  challenging: CompareDriverDTO[];
  growth: CompareDriverDTO[];
}

export interface CompareThemeSectionCardDTO {
  title: string;
  description: string;
  actionHint: string;
}

export interface CompareThemeSectionV3DTO {
  theme: string;
  score: number;
  miniInsight: string;
  cards: CompareThemeSectionCardDTO[];
}

export interface CompareExplainabilityDTO {
  calculationVersion: string;
  factorsUsed: string[];
  dataQuality: string;
  generatedAt: string;
  distributionWarning: DistributionWarningKey;
  missingBirthTimeImpact: string | null;
  moduleScoringProfile: string;
}

export interface TechnicalAspectDTO {
  id: string;
  aspectName: string;
  type: 'supportive' | 'challenging';
  orb: number;
  orbLabel: string;
  orbMicrocopy: string;
  orbInsight: string;
  themeGroup: ThemeGroup;
  shortInterpretation: string;
  comparisonInsight: string;
  practicalMeaning: string;
  technicalKey: string;
  usageHint: string;
  planets?: string[];
  houses?: string[];
}

export interface ComparisonResponseDTO {
  module: CompareModuleCode;
  relationshipType: RelationshipType;
  overall: CompareOverallDTO;
  summary: CompareSummaryDTO;
  moduleIntro: string;
  metricCards: CompareMetricCardDTO[];
  topDrivers: CompareTopDriversDTO;
  themeSections: CompareThemeSectionV3DTO[];
  explainability: CompareExplainabilityDTO;
  warningText: string | null;
  technicalAspects: TechnicalAspectDTO[];
}

// Legacy compare types kept for existing reusable components.
export interface ComparisonCardDTO {
  id: string;
  relationshipType: RelationshipType;
  themeGroup: ThemeGroup;
  title: string;
  leftPerson: { name: string; trait: string };
  intersection: { plain: string };
  rightPerson: { name: string; trait: string };
  label: Label;
  intensity: number;
  leftValue?: number;
  rightValue?: number;
  advicePlain: string;
  technical?: {
    aspectName?: string;
    orb?: number;
    planets?: string[];
    houses?: string[];
  };
}

export interface CompareThemeSectionDTO {
  themeGroup: ThemeGroup;
  score: number;
  totalCount: number;
  cards: ComparisonCardDTO[];
}

export interface MiniCategoryScoreDTO {
  id: string;
  label: string;
  score: number;
}

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  love: 'Aşk',
  work: 'İş',
  friend: 'Arkadaş',
  family: 'Aile',
  rival: 'Rakip',
};

export const MODULE_TO_RELATIONSHIP: Record<CompareModuleCode, RelationshipType> = {
  LOVE: 'love',
  WORK: 'work',
  FRIEND: 'friend',
  FAMILY: 'family',
  RIVAL: 'rival',
};

export const RELATIONSHIP_TO_MODULE: Record<RelationshipType, CompareModuleCode> = {
  love: 'LOVE',
  work: 'WORK',
  friend: 'FRIEND',
  family: 'FAMILY',
  rival: 'RIVAL',
};
