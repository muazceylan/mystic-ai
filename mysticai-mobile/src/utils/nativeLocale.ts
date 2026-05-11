export function resolveNativePickerLocale(language?: string | null): 'tr-TR' | 'en-US' {
  return language?.toLowerCase().startsWith('en') ? 'en-US' : 'tr-TR';
}
