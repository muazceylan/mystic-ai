import type { ReminderType } from '../../services/reminder.service';
import type { PlannerCategoryId } from './plannerEngine';

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

interface BuildPlannerReminderCopyInput {
  t: TranslateFn;
  categoryId?: PlannerCategoryId | null;
  categoryLabel: string;
  reminderType: ReminderType;
  time: string;
}

export function buildPlannerReminderCopy({
  t,
  categoryId,
  categoryLabel,
  reminderType,
  time,
}: BuildPlannerReminderCopyInput): { title: string; body: string } {
  const hookKey = categoryId
    ? `calendar.reminderNotificationHooks.${categoryId}`
    : 'calendar.reminderNotificationHooks.default';
  const hook = t(hookKey, { defaultValue: t('calendar.reminderNotificationHooks.default') });
  const params = {
    category: categoryLabel,
    hook,
    time,
  };

  if (reminderType === 'DO') {
    return {
      title: t('calendar.reminderNotificationTitleDo', params),
      body: t('calendar.reminderNotificationBodyDo', params),
    };
  }

  if (reminderType === 'AVOID') {
    return {
      title: t('calendar.reminderNotificationTitleAvoid', params),
      body: t('calendar.reminderNotificationBodyAvoid', params),
    };
  }

  return {
    title: t('calendar.reminderNotificationTitleWindow', params),
    body: t('calendar.reminderNotificationBodyWindow', params),
  };
}
