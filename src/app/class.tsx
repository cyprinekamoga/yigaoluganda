import { useEffect, useState } from 'react';
import { Platform, Share, StyleSheet, View } from 'react-native';
import { FormMessage } from '@/account/AuthShell';
import { classLink, classProgress, myClasses, type StudentProgress, type TeacherClass } from '@/account/schools';
import { useAccount } from '@/account/store';
import { useT, type Key } from '@/i18n';
import { BackBar } from '@/ui/BackBar';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';
import { C, F, R, S } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

const APP_URL = 'https://app.yigaoluganda.com';

/** "Your classes", for teachers with a school licence: the class link, and each student's progress. */
export default function Classes() {
  const { t } = useT();
  const uid = useAccount((s) => s.session?.user.id ?? null);
  const [classes, setClasses] = useState<TeacherClass[] | null | 'error'>(null);

  useEffect(() => {
    if (!uid) return;
    myClasses(uid).then((c) => setClasses(c ?? 'error'));
  }, [uid]);

  return (
    <Screen header={<BackBar title={t('teacher.title')} />} testID="screen-classes">
      <Txt variant="body" style={{ color: C.ink2 }}>
        {t('teacher.lead')}
      </Txt>
      {classes === 'error' && <FormMessage text={t('auth.errNetwork')} />}
      {Array.isArray(classes) && classes.length === 0 && <Txt variant="body">{t('teacher.none')}</Txt>}
      {Array.isArray(classes) && classes.map((c) => <ClassCard key={c.id} c={c} />)}
    </Screen>
  );
}

function ClassCard({ c }: { c: TeacherClass }) {
  const { t, lang } = useT();
  const [students, setStudents] = useState<StudentProgress[] | null | 'error'>(null);
  const [msg, setMsg] = useState<{ key: Key; ok: boolean } | null>(null);
  const link = classLink(APP_URL, c.join_code, lang);
  const day = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  useEffect(() => {
    classProgress(c.id).then((s) => setStudents(s ?? 'error'));
  }, [c.id]);

  const share = async () => {
    setMsg(null);
    const text = t('teacher.shareText', { name: c.name });
    if (Platform.OS !== 'web') {
      await Share.share({ message: `${text} ${link}`, url: link }).catch(() => undefined);
      return;
    }
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string; url?: string }) => Promise<void> };
    if (typeof nav.share === 'function') {
      await nav.share({ title: c.name, text, url: link }).catch(() => undefined);
      return;
    }
    try {
      await nav.clipboard.writeText(link);
      setMsg({ key: 'teacher.copied', ok: true });
    } catch {
      setMsg({ key: 'auth.errGeneric', ok: false });
    }
  };

  const count = Array.isArray(students) ? students.length : 0;
  return (
    <Card style={{ gap: S.md }} testID={`class-${c.join_code}`}>
      <View>
        <Txt variant="h3">{c.name}</Txt>
        {c.school ? <Txt variant="small">{c.school}</Txt> : null}
        <Txt variant="caption" style={{ color: C.ink3 }}>
          {t('teacher.licence', { date: day(c.licence_until), n: count, seats: c.seats })}
        </Txt>
      </View>
      <View style={styles.codeBox}>
        <Txt variant="caption">{t('teacher.code')}</Txt>
        <Txt style={styles.code} selectable testID="class-join-code">
          {c.join_code}
        </Txt>
      </View>
      <Button testID="class-share" label={t('teacher.share')} onPress={share} />
      <FormMessage text={msg ? t(msg.key) : null} tone={msg?.ok ? 'ok' : 'error'} />
      <Txt variant="label">{t('teacher.students')}</Txt>
      {students === 'error' && <FormMessage text={t('auth.errNetwork')} />}
      {Array.isArray(students) && students.length === 0 && <Txt variant="small">{t('teacher.noStudents')}</Txt>}
      {Array.isArray(students) &&
        students.map((s, i) => (
          <View key={i} style={[styles.row, i > 0 && styles.rule]} testID="class-student">
            <View style={{ flex: 1 }}>
              <Txt variant="strong">{s.name || '–'}</Txt>
              <Txt variant="caption" style={{ color: C.ink3 }}>
                {s.last_active_day ? t('teacher.lastActive', { date: day(s.last_active_day) }) : t('teacher.notYet')}
              </Txt>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Txt variant="strong">{t('teacher.lessons', { n: s.lessons })}</Txt>
              <Txt variant="caption" style={{ color: C.ink3 }}>
                {t('teacher.phrases', { n: s.phrases })}
              </Txt>
            </View>
          </View>
        ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  codeBox: { alignItems: 'center', paddingVertical: S.sm, borderRadius: R.md, borderWidth: 1, borderStyle: 'dashed', borderColor: C.neon },
  code: { ...F.semi, fontSize: 24, letterSpacing: 3, color: C.neon },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.sm },
  rule: { borderTopWidth: 1, borderTopColor: C.line },
});
