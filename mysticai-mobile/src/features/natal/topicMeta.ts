/**
 * Icon and ordering for each thematic card.
 *
 * The backend decides what a topic <em>says</em>; this decides how it looks and where it sits.
 * Order is fixed here rather than taken from the response so the screen stays stable between
 * generations — a card that moves every time the interpretation is regenerated feels broken even
 * when the content is right.
 */

export const ABOUT_ME_ORDER = [
  'core_character',
  'emotional_world',
  'social_image',
  'strengths',
  'challenges',
  'inner_conflicts',
] as const;

export const LIFE_AREA_ORDER = [
  'love',
  'career',
  'money',
  'social',
  'family',
  'life_direction',
  'talents',
] as const;

const TOPIC_ICONS: Record<string, string> = {
  core_character: 'person-outline',
  emotional_world: 'heart-outline',
  social_image: 'eye-outline',
  strengths: 'sparkles-outline',
  challenges: 'flash-outline',
  inner_conflicts: 'git-compare-outline',
  love: 'heart-circle-outline',
  career: 'briefcase-outline',
  money: 'wallet-outline',
  social: 'people-outline',
  family: 'home-outline',
  life_direction: 'compass-outline',
  talents: 'star-outline',
};

export function topicIcon(id: string): string {
  return TOPIC_ICONS[id] ?? 'ellipse-outline';
}

/**
 * Sorts topics into the fixed display order, keeping any unknown ids at the end rather than
 * dropping them — a new topic added server-side should appear, not vanish.
 */
export function sortTopics<T extends { id: string }>(topics: T[], order: readonly string[]): T[] {
  if (!topics?.length) return [];
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...topics].sort((a, b) => {
    const left = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const right = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return left - right;
  });
}
