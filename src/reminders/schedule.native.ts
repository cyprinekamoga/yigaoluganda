import * as Notifications from 'expo-notifications';
import type { Lang } from '../content/types';
import { reminderDates, reminderMessage } from '../logic/reminders';

/**
 * Phones: daily reminders are local notifications, no server needed. We schedule one for each
 * of the next 7 days at the chosen hour, skipping today once the learner has practised, and
 * refresh them whenever the app opens or progress changes.
 */
export const remindersAvailable = true;
export const reminderChannel: 'email' | 'notification' = 'notification';

export async function allowReminders(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function scheduleReminders(opts: { on: boolean; hour: number; practicedToday: boolean; lang: Lang; name: string }): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!opts.on) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  for (const date of reminderDates(new Date(), opts.hour, opts.practicedToday)) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Yiga Oluganda', body: reminderMessage(date, opts.lang, opts.name) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
  }
}
