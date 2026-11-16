import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { FormMessage } from '@/account/AuthShell';
import { ACCOUNTS } from '@/account/config';
import { createChildProfile, deleteChildProfile, renameChildProfile } from '@/account/sync';
import { useT, type Key } from '@/i18n';
import { Avatar } from '@/learners/LearnerChip';
import { useGrownUpCheck } from '@/learners/ParentGate';
import { addChildLocal, localId, MAIN, MAX_CHILDREN, removeChildLocal, renameChildLocal, switchLearner, useLearners, type ChildProfile } from '@/learners/store';
import { useApp } from '@/state/store';
import { BackBar } from '@/ui/BackBar';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Screen } from '@/ui/Screen';
import { Sheet } from '@/ui/Sheet';
import { C, F, R, S } from '@/ui/theme';
import { Txt } from '@/ui/Txt';

/**
 * "Who's learning?": the account holder and up to four children, each with their own progress.
 * Anyone can switch to a child; leaving a child's profile, and adding or changing profiles,
 * needs a grown-up.
 */
export default function Learners() {
  const { t } = useT();
  const router = useRouter();
  const active = useLearners((s) => s.active);
  const children = useLearners((s) => s.children);
  const saved = useLearners((s) => s.saved);
  const profile = useApp((s) => s.profile);
  const { ask, gate } = useGrownUpCheck();
  const [editing, setEditing] = useState<ChildProfile | 'new' | null>(null);
  const [name, setName] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Key | null>(null);

  const kid = active !== MAIN;
  const mainName = (active === MAIN ? profile?.name : saved[MAIN]?.profile?.name) ?? '';

  const choose = (id: string) => {
    if (id === active) return router.back();
    const go = () => {
      switchLearner(id);
      router.dismissTo('/');
    };
    // Leaving a child's profile needs a grown-up; switching into one doesn't.
    if (kid) ask(go);
    else go();
  };

  const openEditor = (target: ChildProfile | 'new') =>
    ask(() => {
      setEditing(target);
      setName(target === 'new' ? '' : target.name);
      setConfirmRemove(false);
      setError(null);
    });

  const save = async () => {
    const clean = name.trim();
    if (!clean || !editing) return;
    setBusy(true);
    setError(null);
    if (editing === 'new') {
      if (ACCOUNTS) {
        const r = await createChildProfile(clean);
        if ('error' in r) {
          setBusy(false);
          return setError(r.error === 'limit' ? 'learners.errLimit' : r.error === 'family' ? 'learners.errFamily' : 'auth.errNetwork');
        }
        addChildLocal({ id: r.id, name: clean, createdAt: r.createdAt });
      } else addChildLocal({ id: localId(), name: clean, createdAt: Date.now() });
    } else {
      if (ACCOUNTS && !(await renameChildProfile(editing.id, clean))) {
        setBusy(false);
        return setError('auth.errNetwork');
      }
      renameChildLocal(editing.id, clean);
    }
    setBusy(false);
    setEditing(null);
  };

  const remove = async () => {
    if (!editing || editing === 'new') return;
    setBusy(true);
    setError(null);
    if (ACCOUNTS && !(await deleteChildProfile(editing.id))) {
      setBusy(false);
      return setError('auth.errNetwork');
    }
    removeChildLocal(editing.id);
    setBusy(false);
    setEditing(null);
  };

  const row = (id: string, label: string, index: number, child?: ChildProfile) => (
    <Card key={id} style={[styles.row, id === active && styles.rowOn]}>
      <Pressable testID={`learner-${child ? child.name : 'main'}`} onPress={() => choose(id)} accessibilityRole="button" accessibilityState={{ selected: id === active }} style={styles.rowMain}>
        <Avatar name={label} index={index} size={48} />
        <View style={{ flex: 1 }}>
          <Txt variant="h3" numberOfLines={1}>
            {label}
          </Txt>
          <Txt variant="small">{id === active ? t('learners.learningNow') : child ? t('learners.kidProfile') : t('learners.grownUp')}</Txt>
        </View>
        {id === active && <Ionicons name="checkmark-circle" size={26} color={C.neon} />}
      </Pressable>
      {child && (
        <Pressable testID={`learner-edit-${child.name}`} onPress={() => openEditor(child)} accessibilityRole="button" accessibilityLabel={t('learners.edit', { name: child.name })} hitSlop={8} style={styles.edit}>
          <Ionicons name="create-outline" size={22} color={C.ink2} />
        </Pressable>
      )}
    </Card>
  );

  return (
    <Screen header={<BackBar title={t('learners.title')} />} testID="screen-learners">
      <Txt variant="body" style={{ color: C.ink2 }}>
        {t('learners.lead')}
      </Txt>
      {row(MAIN, mainName, 0)}
      {children.map((c, i) => row(c.id, c.name, i + 1, c))}
      {children.length < MAX_CHILDREN ? (
        <Button testID="learner-add" kind="secondary" label={t('learners.add')} onPress={() => openEditor('new')} />
      ) : (
        <Txt variant="small">{t('learners.full', { n: MAX_CHILDREN })}</Txt>
      )}
      <Card style={styles.note}>
        <Txt variant="h3">{t('learners.kidsTitle')}</Txt>
        <Txt variant="small">{t('learners.kidsBody')}</Txt>
      </Card>

      <Sheet visible={editing !== null} onClose={() => !busy && setEditing(null)} testID="learner-sheet">
        <Txt variant="h2">{editing === 'new' ? t('learners.add') : t('learners.editTitle')}</Txt>
        <Txt variant="label">{t('learners.childName')}</Txt>
        <TextInput
          testID="learner-name"
          accessibilityLabel={t('learners.childName')}
          value={name}
          onChangeText={setName}
          maxLength={24}
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={save}
          style={styles.input}
        />
        <Txt variant="small">{t('learners.nameHint')}</Txt>
        <FormMessage text={error ? t(error) : null} />
        <Button testID="learner-save" label={t('learners.save')} onPress={save} loading={busy} disabled={!name.trim()} />
        {editing !== 'new' && editing !== null && !confirmRemove && <Button kind="ghost" label={t('learners.remove')} onPress={() => setConfirmRemove(true)} disabled={busy} />}
        {confirmRemove && editing !== 'new' && editing !== null && (
          <>
            <Txt variant="body">{t('learners.removeBody', { name: editing.name })}</Txt>
            <Button testID="learner-remove" kind="danger" label={t('learners.removeConfirm')} onPress={remove} loading={busy} />
          </>
        )}
      </Sheet>
      {gate}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: S.sm, padding: S.md },
  rowOn: { borderColor: C.neon, borderWidth: 1.5 },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 56 },
  edit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  note: { gap: S.xs, backgroundColor: C.paperDeep },
  input: { ...F.medium, fontSize: 17, color: C.ink, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, paddingHorizontal: S.lg, minHeight: 52, outlineWidth: 0 },
});
