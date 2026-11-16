-- "Download my data" includes the mistakes a learner reported, so they may read their own reports.
create policy "Learners read their own reports" on public.reports
  for select to authenticated using ((select auth.uid()) = user_id);
