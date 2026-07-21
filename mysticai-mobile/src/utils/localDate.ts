// Timezone-safe YYYY-MM-DD handling for calendar dates (birth dates etc.).
// toISOString() and new Date('YYYY-MM-DD') both operate in UTC and shift the
// calendar day in non-UTC timezones — always use these helpers instead.

export function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;
}

export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}
