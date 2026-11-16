import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { FormMessage } from '../account/AuthShell';
import { ACCOUNTS } from '../account/config';
import { REPORT_KINDS, sendReport, type ReportItem, type ReportKind } from '../account/feedback';
import { DIALOGUES, PHRASES, SENTENCES, TIPS } from '../content';
import { useT, type Key } from '../i18n';
import { useIsKid } from '../learners/store';
import type { Step } from '../logic/generator';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { C, F, R, S } from '../ui/theme';
import { Txt } from '../ui/Txt';

/** What a lesson step is about, for a report. */
export function itemForStep(step: Step, lessonId?: string): ReportItem {
  switch (step.kind) {
    case 'intro':
    case 'choice':
    case 'speak':
    case 'type':
      return { type: 'phrase', id: step.phraseId, lessonId };
    case 'match':
      return { type: 'phrase', id: step.phraseIds.join(','), lessonId };
    case 'build':
    case 'dictation':
      return { type: 'sentence', id: step.sentenceId, lessonId };
    case 'tip':
      return { type: 'tip', id: step.tipId, lessonId };
    case 'dialogue':
      return { type: 'dialogue', id: step.dialogueId, lessonId };
  }
}

/** A short line naming the item ("Weebale · Thank you"). */
export function useItemLabel(item: ReportItem): string {
  const { tr } = useT();
  const id = item.id ?? '';
  if (item.type === 'phrase') {
    const ps = id.split(',').map((x) => PHRASES[x]).filter(Boolean);
    return ps.length === 1 ? `${ps[0].lg} · ${tr(ps[0].tr)}` : ps.map((p) => p.lg).join(', ');
  }
  if (item.type === 'sentence' && SENTENCES[id]) return `${SENTENCES[id].lg} · ${tr(SENTENCES[id].tr)}`;
  if (item.type === 'tip' && TIPS[id]) return tr(TIPS[id].title);
  if (item.type === 'dialogue' && DIALOGUES[id]) return tr(DIALOGUES[id].title);
  return id;
}

const KIND_KEY: Record<ReportKind, Key> = {
  translation: 'report.kindTranslation',
  luganda: 'report.kindLuganda',
  audio: 'report.kindAudio',
  typo: 'report.kindTypo',
  other: 'report.kindOther',
};
export const reportKindKey = (k: ReportKind): Key => KIND_KEY[k];

/**
 * "Report a mistake": a flag (in a lesson) or a text link (on a phrase's page) that opens a
 * short form. Not shown in a child's profile, or without accounts.
 */
export function ReportButton({ item, look = 'icon' }: { item: ReportItem; look?: 'icon' | 'link' }) {
  const { t } = useT();
  const kid = useIsKid();
  const [open, setOpen] = useState(false);
  if (!ACCOUNTS || kid) return null;
  return (
    <>
      {look === 'icon' ? (
        <Pressable testID="report-open" onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={t('report.title')} hitSlop={10} style={styles.flag}>
          <Ionicons name="flag-outline" size={20} color={C.ink2} />
        </Pressable>
      ) : (
        <Pressable testID="report-open" onPress={() => setOpen(true)} accessibilityRole="button" style={styles.link} hitSlop={6}>
          <Ionicons name="flag-outline" size={16} color={C.ink2} />
          <Txt variant="small" style={{ color: C.ink2 }}>
            {t('report.title')}
          </Txt>
        </Pressable>
      )}
      {open && <ReportSheet item={item} onClose={() => setOpen(false)} />}
    </>
  );
}

function ReportSheet({ item, onClose }: { item: ReportItem; onClose: () => void }) {
  const { t, lang } = useT();
  const label = useItemLabel(item);
  const [kind, setKind] = useState<ReportKind | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  const send = async () => {
    if (!kind) return;
    setBusy(true);
    setError(false);
    const ok = await sendReport(item, kind, note, lang);
    setBusy(false);
    if (ok) setSent(true);
    else setError(true);
  };

  return (
    <Sheet visible onClose={() => !busy && onClose()} testID="report-sheet">
      {sent ? (
        <View style={{ gap: S.md }} testID="report-sent">
          <Txt variant="h2">{t('report.thanks')}</Txt>
          <Txt variant="body">{t('report.thanksBody')}</Txt>
          <Button label={t('common.close')} onPress={onClose} />
        </View>
      ) : (
        <View style={{ gap: S.md }}>
          <View style={{ gap: 2 }}>
            <Txt variant="h2">{t('report.title')}</Txt>
            {label ? (
              <Txt variant="small" numberOfLines={2}>
                {label}
              </Txt>
            ) : null}
          </View>
          <Txt variant="label">{t('report.what')}</Txt>
          <View style={{ gap: S.xs }} accessibilityRole="radiogroup">
            {REPORT_KINDS.map((k) => (
              <Pressable
                key={k}
                testID={`report-kind-${k}`}
                onPress={() => setKind(k)}
                accessibilityRole="radio"
                accessibilityState={{ checked: kind === k }}
                style={[styles.kind, kind === k && styles.kindOn]}
              >
                <Ionicons name={kind === k ? 'radio-button-on' : 'radio-button-off'} size={20} color={kind === k ? C.neon : C.ink3} />
                <Txt variant="strong">{t(KIND_KEY[k])}</Txt>
              </Pressable>
            ))}
          </View>
          <TextInput
            testID="report-note"
            value={note}
            onChangeText={setNote}
            placeholder={t('report.notePlaceholder')}
            placeholderTextColor={C.ink3}
            multiline
            maxLength={1000}
            accessibilityLabel={t('report.notePlaceholder')}
            style={styles.note}
          />
          <FormMessage text={error ? t('auth.errNetwork') : null} />
          <Button testID="report-send" label={t('report.send')} disabled={!kind} loading={busy} onPress={send} />
          <Button kind="ghost" label={t('common.cancel')} onPress={onClose} />
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flag: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingVertical: S.sm },
  kind: { flexDirection: 'row', alignItems: 'center', gap: S.sm, minHeight: 46, paddingHorizontal: S.md, borderRadius: R.md, borderWidth: 1, borderColor: C.line },
  kindOn: { borderColor: C.neon, backgroundColor: C.paperDeep },
  note: { ...F.body, minHeight: 80, color: C.ink, fontSize: 16, padding: S.md, borderRadius: R.md, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, textAlignVertical: 'top' },
});
