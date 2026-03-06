export const comparePresentationFixtures = {
  warningMappings: [
    {
      key: 'scores_clustered' as const,
      expected:
        'Bu eşleşmede alanlar birbirine yakın görünüyor; sonuç daha çok genel ritimden etkileniyor.',
    },
    {
      key: 'low_confidence_damped' as const,
      expected: 'Veri netliği sınırlı olduğu için skorlar daha temkinli yorumlanmıştır.',
    },
    {
      key: 'house_precision_limited' as const,
      expected: 'Doğum saati belirsizliği ev bazlı hassasiyeti düşürebilir.',
    },
  ],
  confidenceLabels: [
    { label: 'high', confidence: 0.9, expected: 'Yüksek' },
    { label: 'medium', confidence: 0.7, expected: 'Orta' },
    { label: 'limited', confidence: 0.4, expected: 'Sınırlı' },
    { label: '', confidence: 0.78, expected: 'Yüksek' },
    { label: '', confidence: 0.56, expected: 'Orta' },
    { label: '', confidence: 0.45, expected: 'Sınırlı' },
  ],
  dataQualityLabels: [
    { value: 'high', expected: 'Yüksek' },
    { value: 'medium', expected: 'Orta' },
    { value: 'limited', expected: 'Sınırlı' },
  ],
};

