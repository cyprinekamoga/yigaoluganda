import { ACCOUNTS } from '../account/config';
import type { Lang } from '../content/types';

/**
 * Web: daily reminders are e-mails, sent by the server (Supabase function `reminders`) to
 * learners who have an account and haven't practised that day. Nothing to schedule here;
 * the settings are saved to the account by the progress sync.
 */
export const remindersAvailable = ACCOUNTS;
export const reminderChannel: 'email' | 'notification' = 'email';

export async function allowReminders(): Promise<boolean> {
  return ACCOUNTS;
}

export async function scheduleReminders(_opts: { on: boolean; hour: number; practicedToday: boolean; lang: Lang; name: string }): Promise<void> {}
