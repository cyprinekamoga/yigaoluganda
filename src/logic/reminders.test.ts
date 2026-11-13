import { describe, expect, it } from 'vitest';
import { reminderDates, reminderMessage } from './reminders';

describe('daily reminders', () => {
  const morning = new Date(2026, 10, 13, 9, 30);
  const evening = new Date(2026, 10, 13, 19, 0);

  it('reminds today at the chosen hour if the learner has not practised yet', () => {
    const d = reminderDates(morning, 18, false);
    expect(d).toHaveLength(7);
    expect(d[0]).toEqual(new Date(2026, 10, 13, 18, 0));
    expect(d[6]).toEqual(new Date(2026, 10, 19, 18, 0));
  });

  it('skips today once the learner has practised, or the hour has passed', () => {
    expect(reminderDates(morning, 18, true)[0]).toEqual(new Date(2026, 10, 14, 18, 0));
    expect(reminderDates(evening, 18, false)[0]).toEqual(new Date(2026, 10, 14, 18, 0));
  });

  it('crosses month ends correctly', () => {
    const d = reminderDates(new Date(2026, 10, 29, 20, 0), 7, false, 3);
    expect(d.map((x) => [x.getMonth(), x.getDate()])).toEqual([[10, 30], [11, 1], [11, 2]]);
  });

  it('writes a friendly message in the learner’s language', () => {
    for (let i = 0; i < 7; i++) {
      const day = new Date(2026, 10, 13 + i, 18);
      expect(reminderMessage(day, 'en', 'Sara')).not.toContain('{name}');
      expect(reminderMessage(day, 'sv', 'Sara').length).toBeGreaterThan(10);
    }
  });
});
