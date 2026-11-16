import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FormMessage } from '../account/AuthShell';
import { ownerStats, type OwnerStats } from '../account/feedback';
import { useT } from '../i18n';
import { countByPlan, monthlyRevenue } from '../logic/revenue';
import { formatMoney } from '../pricing/pricing';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { C, F, R, S } from '../ui/theme';
import { Txt } from '../ui/Txt';
import { useItemLabel } from './Report';

/**
 * The owner's overview: accounts, paying learners, cancellations and what gets reported most,
 * counted from the app's own database (no tracking).
 */
export function Dashboard() {
  const { t, lang } = useT();
  const [stats, setStats] = useState<OwnerStats | null | 'error'>(null);
  const load = useCallback(() => {
    ownerStats().then((s) => setStats(s ?? 'error'));
  }, []);
  useEffect(load, [load]);

  if (stats === 'error') return <FormMessage text={t('auth.errNetwork')} />;
  if (!stats) return <Txt variant="small">{t('dash.loading')}</Txt>;
  const revenue = monthlyRevenue(stats.paying_by_plan ?? stats.paying_by_currency);
  const plans = countByPlan(stats.paying_by_plan ?? []);
  const maxDay = Math.max(1, ...stats.signups_by_day.map((d) => d.n));

  return (
    <View style={{ gap: S.md }} testID="dashboard">
      <View style={styles.grid}>
        <Tile label={t('dash.accounts')} value={stats.accounts} note={t('dash.newWeek', { n: stats.new_7d })} testID="dash-accounts" />
        <Tile label={t('dash.paying')} value={stats.paying} note={t('dash.newSubs', { n: stats.new_subs_30d })} testID="dash-paying" accent />
        <Tile label={t('dash.active')} value={stats.active_7d} note={t('dash.activeNote')} />
        <Tile label={t('dash.cancelled')} value={stats.cancelled_30d} note={t('dash.ending', { n: stats.ending })} />
      </View>

      <Card style={{ gap: S.xs }} testID="dash-revenue">
        <Txt variant="label">{t('dash.revenue')}</Txt>
        {revenue.length ? (
          revenue.map((r) => (
            <Txt key={r.currency} style={styles.money}>
              {formatMoney(r.amount, r.currency, lang === 'sv' ? 'sv-SE' : 'en-GB')}
            </Txt>
          ))
        ) : (
          <Txt variant="body">–</Txt>
        )}
        <Txt variant="small">{t('dash.revenueNote')}</Txt>
        {plans.length > 0 && (
          <View style={{ gap: 2, marginTop: S.xs }} testID="dash-plans">
            <Txt variant="label">{t('dash.plans')}</Txt>
            {plans.map((p) => (
              <Txt key={p.plan} variant="body">
                {t('dash.planLine', { plan: t(`plan.name.${p.plan}`), n: p.n })}
              </Txt>
            ))}
            {(stats.family_members ?? 0) > 0 && <Txt variant="small">{t('dash.familyMembers', { n: stats.family_members ?? 0 })}</Txt>}
          </View>
        )}
        {stats.past_due > 0 && (
          <Txt variant="small" style={{ color: C.tomatoDeep }}>
            {t('dash.pastDue', { n: stats.past_due })}
          </Txt>
        )}
      </Card>

      <Card style={{ gap: S.sm }}>
        <Txt variant="label">{t('dash.signups')}</Txt>
        <View style={styles.bars} accessible accessibilityLabel={stats.signups_by_day.map((d) => `${d.day}: ${d.n}`).join(', ')}>
          {stats.signups_by_day.map((d) => (
            <View key={d.day} style={styles.barCol}>
              <View style={[styles.bar, { height: 4 + (d.n / maxDay) * 64, backgroundColor: d.n ? C.neon : C.line }]} />
            </View>
          ))}
        </View>
        <Txt variant="small">{t('dash.signupsNote', { today: stats.new_today, month: stats.new_30d })}</Txt>
      </Card>

      <Card style={{ gap: 4 }}>
        <Txt variant="label">{t('dash.learning')}</Txt>
        <Line label={t('dash.reminders')} value={stats.reminders_on} />
        <Line label={t('dash.certificates')} value={stats.certificates} />
        <Line label={t('dash.children')} value={stats.children} />
        <Line label={t('dash.feedback')} value={`${stats.answered_feedback} / ${stats.open_feedback}`} />
        <Line label={t('dash.reportsOpen')} value={stats.open_reports} />
      </Card>

      <Card style={{ gap: 4 }}>
        <Txt variant="label">{t('dash.topReported')}</Txt>
        {stats.top_reported.length ? stats.top_reported.map((r, i) => <Reported key={i} r={r} />) : <Txt variant="body">–</Txt>}
      </Card>

      <Button kind="ghost" label={t('dash.refresh')} onPress={load} />
    </View>
  );
}

function Tile({ label, value, note, accent, testID }: { label: string; value: number; note: string; accent?: boolean; testID?: string }) {
  return (
    <Card style={[styles.tile, accent && { borderColor: C.neon }]} testID={testID}>
      <Txt variant="caption">{label}</Txt>
      <Txt style={[styles.big, accent && { color: C.neon }]}>{value}</Txt>
      <Txt variant="caption" style={{ color: C.ink3 }}>
        {note}
      </Txt>
    </Card>
  );
}

function Line({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.line}>
      <Txt variant="body" style={{ flex: 1 }}>
        {label}
      </Txt>
      <Txt variant="strong">{value}</Txt>
    </View>
  );
}

function Reported({ r }: { r: OwnerStats['top_reported'][number] }) {
  const { t } = useT();
  const label = useItemLabel({ type: r.item_type, id: r.item_id ?? undefined });
  return (
    <View style={styles.line}>
      <Txt variant="body" style={{ flex: 1 }} numberOfLines={1}>
        {label || `${r.item_type} ${r.item_id ?? ''}`}
      </Txt>
      <Txt variant="small">{t('dash.reportCount', { n: r.n, open: r.open })}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  tile: { flexGrow: 1, flexBasis: '45%', gap: 2, padding: S.md },
  big: { ...F.heading, fontSize: 30, lineHeight: 36, color: C.ink },
  money: { ...F.semi, fontSize: 22, color: C.neon },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 72 },
  barCol: { flex: 1, justifyContent: 'flex-end' },
  bar: { borderRadius: R.sm / 2, minHeight: 4 },
  line: { flexDirection: 'row', alignItems: 'center', gap: S.sm, minHeight: 32 },
});
