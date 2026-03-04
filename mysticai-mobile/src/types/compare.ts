export type RelationshipType = 'love' | 'work' | 'friend' | 'family' | 'rival';

export type Label = 'Uyumlu' | 'Gelişim' | 'Dikkat';

export type ThemeGroup =
  | 'Aşk & Çekim'
  | 'İletişim'
  | 'Güven'
  | 'Duygusal Tempo'
  | 'Karar & Plan'
  | 'Aile Bağı'
  | 'Destek & Sadakat'
  | 'İş Bölümü'
  | 'Rekabet & Strateji'
  | 'Sınırlar'
  | 'Krizi Yönetme';

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

export interface TechnicalAspectDTO {
  id: string;
  aspectName: string;
  type: 'supportive' | 'challenging';
  orb: number;
  themeGroup: ThemeGroup;
  plainMeaning: string;
  advicePlain: string;
  planets?: string[];
  houses?: string[];
}

export interface ComparisonResponseDTO {
  relationshipType: RelationshipType;
  overallScore: number;
  summaryPlain: {
    headline: string;
    body: string;
  };
  counts: {
    supportive: number;
    challenging: number;
  };
  themeScores: Array<{ themeGroup: ThemeGroup; score: number }>;
  cards: ComparisonCardDTO[];
  technicalAspects: TechnicalAspectDTO[];
}

export interface ComparisonRequestDTO {
  relationshipType: RelationshipType;
  leftName: string;
  rightName: string;
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
