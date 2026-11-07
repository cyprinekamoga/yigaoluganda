import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import type { Chapter } from '../content/types';
import { useT } from '../i18n';
import type { TileStatus } from '../logic/unlock';
import { PressCard } from './Card';
import { ProgressRing } from './ProgressRing';
import { Scene } from './Scene';
import { C, F, HUES, R, S } from './theme';
import { Txt } from './Txt';

export function StatusPill({ status, hue }: { status: TileStatus; hue: Chapter['hue'] }) {
  const { t } = useT();
  const h = HUES[hue];
  const look: Record<TileStatus, { bg: string; fg: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
    locked: { bg: C.paperDeep, fg: C.ink2, icon: 'lock-closed' },
    unlocked: { bg: C.neon, fg: C.onNeon, icon: 'sparkles' },
    ready: { bg: C.paperDeep, fg: C.ink, icon: 'play' },
    active: { bg: h.soft, fg: h.deep, icon: 'play-circle' },
    unfinished: { bg: C.tomatoSoft, fg: C.tomatoDeep, icon: 'time' },
    completed: { bg: C.leafSoft, fg: C.leafDeep, icon: 'checkmark-circle' },
  };
  const l = look[status];
  return (
    <View style={[styles.pill, { backgroundColor: l.bg }]}>
      <Ionicons name={l.icon} size={13} color={l.fg} />
      <Txt style={[styles.pillText, { color: l.fg }]} numberOfLines={1}>
        {t(`status.${status}`)}
      </Txt>
    </View>
  );
}

export function ChapterTile({
  chapter,
  status,
  done,
  width,
  onPress,
}: {
  chapter: Chapter;
  status: TileStatus;
  done: number;
  width: number;
  onPress: () => void;
}) {
  const { t, tr } = useT();
  const h = HUES[chapter.hue];
  const ring = Math.min(width - S.lg * 2, 150);
  const stroke = 7;
  const locked = status === 'locked';
  const total = chapter.lessons.length;
  const a11y = [
    t('home.chapter', { n: chapter.n }),
    tr(chapter.title),
    tr(chapter.scenario),
    t(`status.${status}`),
    t('home.lessons', { done, total }),
  ].join('. ');
  return (
    <PressCard
      testID={`tile-${chapter.id}`}
      onPress={onPress}
      accessibilityLabel={a11y}
      style={[styles.tile, { width }, status === 'active' && { borderColor: h.base, borderWidth: 2 }]}
    >
      <View style={styles.ringWrap}>
        <ProgressRing size={ring} stroke={stroke} segments={total} done={done} color={locked ? C.line : h.base} track={locked ? C.paperDeep : h.track}>
          <Scene scene={chapter.scene} hue={chapter.hue} size={ring - stroke * 2 - 8} muted={locked} />
        </ProgressRing>
        {locked && (
          <View style={styles.lock}>
            <Ionicons name="lock-closed" size={18} color={C.ink2} />
          </View>
        )}
        {chapter.checkpoint && (
          <View style={[styles.flag, { backgroundColor: locked ? C.paperDeep : C.neon }]}>
            <Ionicons name="flag" size={14} color={locked ? C.ink2 : C.onNeon} />
          </View>
        )}
      </View>
      <Txt variant="caption" numberOfLines={1} style={{ color: locked ? C.ink2 : h.deep }}>
        {t('home.chapter', { n: chapter.n })} · {chapter.lgTitle}
      </Txt>
      <Txt variant="h3" numberOfLines={2} style={styles.title}>
        {tr(chapter.title)}
      </Txt>
      <Txt variant="small" numberOfLines={1}>
        {tr(chapter.scenario)}
      </Txt>
      <View style={styles.foot}>
        <StatusPill status={status} hue={chapter.hue} />
        <Txt variant="caption" style={styles.count}>
          {done}/{total}
        </Txt>
      </View>
    </PressCard>
  );
}

const styles = StyleSheet.create({
  tile: { padding: S.md, paddingTop: S.lg, gap: 3, borderRadius: R.xl },
  ringWrap: { alignItems: 'center', marginBottom: S.sm },
  lock: { position: 'absolute', bottom: 2, right: '18%', backgroundColor: C.card, borderRadius: 16, width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line },
  flag: { position: 'absolute', top: 0, right: '14%', borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  title: { minHeight: 46 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.xs, gap: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.pill, flexShrink: 1 },
  pillText: { ...F.semi, fontSize: 11.5, lineHeight: 15 },
  count: { ...F.semi },
});
