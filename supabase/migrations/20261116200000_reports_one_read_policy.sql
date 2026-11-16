-- One read rule for reports instead of two (Supabase performance advisor): a learner reads their
-- own, and reviewers read all.
drop policy if exists "Learners read their own reports" on public.reports;
drop policy if exists "Reviewers read reports" on public.reports;
create policy "Learners read their own reports, reviewers read all" on public.reports
  for select to authenticated using ((select auth.uid()) = user_id or (select public.is_reviewer()));
