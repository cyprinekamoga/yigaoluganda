import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FormMessage } from '../account/AuthShell';
import { createClass, handleSchoolRequest, ownerClasses, schoolRequests, updateClass, validDate, type OwnerClass, type SchoolRequest } from '../account/schools';
import { useT, type Key } from '../i18n';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { TextField } from '../ui/TextField';
import { C, F, S } from '../ui/theme';
import { Txt } from '../ui/Txt';

/** In a year, as YYYY-MM-DD (the default licence length). */
const inAYear = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};

/**
 * The owner's Schools tab: requests from the website's form, creating a class for a teacher
 * (who needs an account), and changing a class's seats or end date.
 */
export function Schools() {
  const { t, lang } = useT();
  const [requests, setRequests] = useState<SchoolRequest[] | null | 'error'>(null);
  const [classes, setClasses] = useState<OwnerClass[] | null | 'error'>(null);
  const load = useCallback(() => {
    schoolRequests().then((r) => setRequests(r ?? 'error'));
    ownerClasses().then((c) => setClasses(c ?? 'error'));
  }, []);
  useEffect(load, [load]);
  const day = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={{ gap: S.md }} testID="schools">
      <Txt variant="label">{t('schools.requests')}</Txt>
      {requests === 'error' && <FormMessage text={t('auth.errNetwork')} />}
      {Array.isArray(requests) && requests.length === 0 && <Txt variant="small">{t('schools.noRequests')}</Txt>}
      {Array.isArray(requests) &&
        requests.map((r) => (
          <Card key={r.id} style={[styles.item, r.status === 'new' && { borderColor: C.neon }]} testID="school-request">
            <Txt variant="strong">{r.school}</Txt>
            <Txt variant="small" selectable>
              {r.name} · {r.email}
              {r.students ? ` · ${t('schools.students', { n: r.students })}` : ''}
            </Txt>
            {r.message ? <Txt variant="body">“{r.message}”</Txt> : null}
            <Txt variant="caption" style={{ color: C.ink3 }}>
              {day(r.created_at)} · {r.lang.toUpperCase()}
            </Txt>
            {r.status === 'new' && (
              <Button small kind="secondary" label={t('schools.handled')} onPress={async () => (await handleSchoolRequest(r.id)) && load()} />
            )}
          </Card>
        ))}

      <NewClass onCreated={load} />

      <Txt variant="label">{t('schools.classes')}</Txt>
      {classes === 'error' && <FormMessage text={t('auth.errNetwork')} />}
      {Array.isArray(classes) && classes.length === 0 && <Txt variant="small">{t('schools.noClasses')}</Txt>}
      {Array.isArray(classes) && classes.map((c) => <ClassRow key={c.id} c={c} onSaved={load} day={day} />)}
    </View>
  );
}

function NewClass({ onCreated }: { onCreated: () => void }) {
  const { t } = useT();
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [teacher, setTeacher] = useState('');
  const [seats, setSeats] = useState('30');
  const [until, setUntil] = useState(inAYear);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const create = async () => {
    const n = parseInt(seats, 10);
    if (!name.trim() || !teacher.includes('@') || !(n > 0) || !validDate(until)) return setMsg({ text: t('schools.errForm'), ok: false });
    setBusy(true);
    setMsg(null);
    const r = await createClass({ name, school, teacherEmail: teacher, seats: n, until });
    setBusy(false);
    if ('error' in r) return setMsg({ text: t(r.error === 'no_account' ? 'schools.errTeacher' : 'auth.errNetwork'), ok: false });
    setMsg({ text: t('schools.created', { code: r.code }), ok: true });
    setName('');
    setTeacher('');
    onCreated();
  };

  return (
    <Card style={styles.item}>
      <Txt variant="h3">{t('schools.newClass')}</Txt>
      <TextField testID="new-class-name" label={t('schools.className')} value={name} onChangeText={setName} />
      <TextField testID="new-class-school" label={t('schools.school')} value={school} onChangeText={setSchool} />
      <TextField testID="new-class-teacher" label={t('schools.teacher')} hint={t('schools.teacherHint')} value={teacher} onChangeText={setTeacher} autoCapitalize="none" keyboardType="email-address" inputMode="email" />
      <View style={styles.pair}>
        <View style={{ flex: 1 }}>
          <TextField testID="new-class-seats" label={t('schools.seats')} value={seats} onChangeText={setSeats} keyboardType="number-pad" inputMode="numeric" />
        </View>
        <View style={{ flex: 1.4 }}>
          <TextField testID="new-class-until" label={t('schools.until')} value={until} onChangeText={setUntil} autoCapitalize="none" />
        </View>
      </View>
      <FormMessage text={msg?.text ?? null} tone={msg?.ok ? 'ok' : 'error'} />
      <Button testID="new-class-create" label={t('schools.create')} loading={busy} onPress={create} />
    </Card>
  );
}

function ClassRow({ c, onSaved, day }: { c: OwnerClass; onSaved: () => void; day: (iso: string) => string }) {
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [seats, setSeats] = useState(String(c.seats));
  const [until, setUntil] = useState(c.licence_until);
  const [error, setError] = useState<Key | null>(null);
  const save = async () => {
    const n = parseInt(seats, 10);
    if (!(n > 0) || !validDate(until)) return setError('schools.errForm');
    if (!(await updateClass(c.id, n, until))) return setError('auth.errNetwork');
    setEditing(false);
    onSaved();
  };
  return (
    <Card style={styles.item} testID="owner-class">
      <Txt variant="strong">
        {c.name}
        {c.school ? ` · ${c.school}` : ''}
      </Txt>
      <Txt variant="small" selectable>
        {c.teacher_email}
      </Txt>
      <Txt variant="small">
        {t('schools.classLine', { n: c.members, seats: c.seats, date: day(c.licence_until) })} · <Txt style={styles.code}>{c.join_code}</Txt>
      </Txt>
      {editing ? (
        <View style={{ gap: S.sm }}>
          <View style={styles.pair}>
            <View style={{ flex: 1 }}>
              <TextField label={t('schools.seats')} value={seats} onChangeText={setSeats} keyboardType="number-pad" inputMode="numeric" />
            </View>
            <View style={{ flex: 1.4 }}>
              <TextField label={t('schools.until')} value={until} onChangeText={setUntil} autoCapitalize="none" />
            </View>
          </View>
          <FormMessage text={error ? t(error) : null} />
          <Button small label={t('learners.save')} onPress={save} />
        </View>
      ) : (
        <Button small kind="ghost" label={t('schools.change')} onPress={() => setEditing(true)} />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  item: { gap: S.sm },
  pair: { flexDirection: 'row', gap: S.sm },
  code: { ...F.semi, color: C.neon, letterSpacing: 1 },
});
