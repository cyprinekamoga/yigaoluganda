-- Indexes for the foreign keys on the feedback and report tables (Supabase performance advisor).
create index if not exists feedback_requests_reviewer on public.feedback_requests (reviewer_id);
create index if not exists reports_user on public.reports (user_id);
create index if not exists reports_resolved_by on public.reports (resolved_by);
