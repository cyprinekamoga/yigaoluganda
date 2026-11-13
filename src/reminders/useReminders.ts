import { useEffect } from 'react';
import { dayKey } from '../logic/dates';
import { useApp } from '../state/store';
import { scheduleReminders } from './schedule';

/** Keeps the phone's scheduled reminders in step with the settings and today's progress. */
export function useReminderSchedule() {
  const on = useApp((s) => s.settings.reminder?.on ?? false);
  const hour = useApp((s) => s.settings.reminder?.hour ?? 18);
  const lastActive = useApp((s) => s.stats.lastActiveDay);
  const lang = useApp((s) => s.profile?.lang ?? 'en');
  const name = useApp((s) => s.profile?.name ?? '');
  useEffect(() => {
    scheduleReminders({ on, hour, practicedToday: lastActive === dayKey(), lang, name }).catch(() => undefined);
  }, [on, hour, lastActive, lang, name]);
}
