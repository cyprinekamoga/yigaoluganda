import type { Lang } from '../content/types';

/** Hours the learner can pick for the daily reminder (local time). */
export const REMINDER_HOURS = [7, 12, 18, 21] as const;
export const DEFAULT_REMINDER_HOUR = 18;

/**
 * When to remind: at `hour` o'clock on each of the next `days` days. Today is skipped when the
 * learner has already practised, or when the hour has passed.
 */
export function reminderDates(now: Date, hour: number, practicedToday: boolean, days = 7): Date[] {
  const out: Date[] = [];
  for (let d = 0; d <= days; d++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, hour, 0, 0, 0);
    if (d === 0 && (practicedToday || at.getTime() <= now.getTime())) continue;
    out.push(at);
    if (out.length === days) break;
  }
  return out;
}

const MESSAGES: Record<Lang, string[]> = {
  en: [
    'Your drum is waiting, {name}! One short lesson keeps the beat.',
    'Ngaali has a new phrase for you. Gyebale ko!',
    'Five minutes of Luganda today? Jjajja would be proud.',
    'A quick review keeps your water pots full.',
    'Oli otya, {name}? Time for today’s Luganda.',
    'Keep the rhythm going: one lesson is enough today.',
    'Weebale for learning! Ngaali is ready when you are.',
  ],
  sv: [
    'Trumman väntar, {name}! En kort lektion håller takten.',
    'Ngaali har en ny fras åt dig. Gyebale ko!',
    'Fem minuter luganda i dag? Jjajja skulle bli stolt.',
    'En snabb repetition håller vattenkrukorna fulla.',
    'Oli otya, {name}? Dags för dagens luganda.',
    'Håll rytmen: en lektion räcker i dag.',
    'Weebale för att du lär dig! Ngaali är redo när du är.',
  ],
};

/** The reminder text for a given day (rotates, so it isn't the same every day). */
export function reminderMessage(date: Date, lang: Lang, name: string): string {
  const list = MESSAGES[lang];
  const day = Math.floor(date.getTime() / 86_400_000);
  return list[((day % list.length) + list.length) % list.length].replace('{name}', name || (lang === 'sv' ? 'du' : 'friend'));
}

/** "18:00" */
export const formatHour = (hour: number) => `${String(hour).padStart(2, '0')}:00`;
