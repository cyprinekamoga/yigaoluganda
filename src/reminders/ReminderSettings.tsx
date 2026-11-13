import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useT } from '../i18n';
import { formatHour, REMINDER_HOURS } from '../logic/reminders';
import { useApp } from '../state/store';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Ngaali } from '../ui/Ngaali';
import { C, F, R, S } from '../ui/theme';
import { Txt } from '../ui/Txt';
import { allowReminders, reminderChannel, remindersAvailable } from './schedule';

/** react-native-web paints the 'on' thumb teal unless told otherwise. */
const WEB_SWITCH = { activeThumbColor: C.ink } as object;

/** Turns the reminder on, asking for notification permission on phones. */
export function useTurnOnReminder() {
  const setSetting = useApp((s) => s.setSetting);
  const [denied, setDenied] = useState(false);
  const turnOn = async (hour: number) => {
    const ok = await allowReminders();
    setDenied(!ok);
    if (ok) setSetting('reminder', { on: true, hour });
    setSetting('reminderAsked', true);
    return ok;
  };
  return { turnOn, denied };
}

/** Settings card: daily reminder on/off and the hour. */
export function ReminderSettings() {
  const { t } = useT();
  const reminder = useApp((s) => s.settings.reminder) ?? { on: false, hour: 18 };
  const setSetting = useApp((s) => s.setSetting);
  const { turnOn, denied } = useTurnOnReminder();
  if (!remindersAvailable) return null;
  const time = formatHour(reminder.hour);
  return (
    <Card style={{ gap: S.md }} testID="reminder-settings">
      <View style={styles.row}>
        <Txt variant="strong" style={{ flex: 1 }}>
          {t('settings.reminder')}
        </Txt>
        <Switch
          testID="reminder-switch"
          accessibilityLabel={t('settings.reminder')}
          value={reminder.on}
          onValueChange={(v) => {
            if (v) turnOn(reminder.hour);
            else setSetting('reminder', { ...reminder, on: false });
          }}
          trackColor={{ true: C.tomato, false: C.line }}
          thumbColor={C.ink}
          {...WEB_SWITCH}
        />
      </View>
      <Txt variant="small">{reminderChannel === 'email' ? t('settings.reminderEmail', { time }) : t('settings.reminderPush', { time })}</Txt>
      {reminder.on && (
        <View style={{ gap: S.xs }}>
          <Txt variant="label">{t('settings.reminderTime')}</Txt>
          <View style={styles.seg} accessibilityRole="radiogroup">
            {REMINDER_HOURS.map((h) => (
              <Pressable
                key={h}
                testID={`reminder-hour-${h}`}
                onPress={() => setSetting('reminder', { on: true, hour: h })}
                accessibilityRole="radio"
                accessibilityState={{ selected: reminder.hour === h }}
                style={[styles.segBtn, reminder.hour === h && styles.segOn]}
              >
                <Txt style={[styles.segText, reminder.hour === h && { color: C.onTomato }]}>{formatHour(h)}</Txt>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      {denied && (
        <Txt variant="small" style={{ color: C.tomatoDeep }}>
          {t('settings.reminderDenied')}
        </Txt>
      )}
    </Card>
  );
}

/** Home-screen offer after the first lesson: "Want a daily nudge?" */
export function ReminderOffer() {
  const { t } = useT();
  const asked = useApp((s) => s.settings.reminderAsked ?? false);
  const on = useApp((s) => s.settings.reminder?.on ?? false);
  const lessons = useApp((s) => Object.keys(s.done).length);
  const setSetting = useApp((s) => s.setSetting);
  const { turnOn, denied } = useTurnOnReminder();
  if (!remindersAvailable || asked || on || lessons === 0) return null;
  const time = formatHour(18);
  return (
    <Card style={styles.offer} testID="reminder-offer">
      <View style={styles.offerRow}>
        <Ngaali mood="wave" size={58} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="h3">{t('remind.title')}</Txt>
          <Txt variant="small">{reminderChannel === 'email' ? t('remind.bodyEmail', { time }) : t('remind.bodyPush', { time })}</Txt>
        </View>
      </View>
      {denied && (
        <Txt variant="small" style={{ color: C.tomatoDeep }}>
          {t('settings.reminderDenied')}
        </Txt>
      )}
      <View style={styles.offerButtons}>
        <Button small kind="neon" testID="reminder-yes" label={t('remind.yes', { time })} onPress={() => turnOn(18)} style={{ flex: 1 }} />
        <Button small kind="ghost" testID="reminder-no" label={t('remind.no')} onPress={() => setSetting('reminderAsked', true)} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 44 },
  seg: { flexDirection: 'row', backgroundColor: C.paperDeep, borderRadius: R.md, padding: 4, gap: 4 },
  segBtn: { flex: 1, minHeight: 40, borderRadius: R.sm + 2, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: C.tomato },
  segText: { ...F.semi, fontSize: 14, color: C.ink },
  offer: { gap: S.md, borderColor: C.neon },
  offerRow: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  offerButtons: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
});
