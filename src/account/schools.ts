import { supabase } from './supabase';

/** Class licences for schools: the teacher's classes, and the owner's tools. */

export interface TeacherClass {
  id: string;
  name: string;
  school: string;
  join_code: string;
  seats: number;
  licence_until: string;
}

export interface StudentProgress {
  name: string;
  joined_at: string;
  last_active_day: string | null;
  lessons: number;
  phrases: number;
}

/** The link a teacher gives the class: sign up, and the class code joins them. */
export const classLink = (appUrl: string, code: string, lang: 'en' | 'sv') => `${appUrl}/sign-up?class=${code}&lang=${lang}`;

export async function myClasses(uid: string): Promise<TeacherClass[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('classes').select('id, name, school, join_code, seats, licence_until').eq('teacher_id', uid).order('created_at');
  return error ? null : (data as TeacherClass[]);
}

export async function classProgress(classId: string): Promise<StudentProgress[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('class_progress', { p_class: classId });
  return error ? null : (data as StudentProgress[]);
}

export interface SchoolRequest {
  id: string;
  name: string;
  school: string;
  email: string;
  students: number | null;
  message: string | null;
  lang: 'en' | 'sv';
  status: 'new' | 'handled';
  created_at: string;
}

export interface OwnerClass {
  id: string;
  name: string;
  school: string;
  teacher_email: string;
  seats: number;
  members: number;
  licence_until: string;
  join_code: string;
}

export async function schoolRequests(): Promise<SchoolRequest[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('owner_school_requests');
  return error ? null : (data as SchoolRequest[]);
}

export async function handleSchoolRequest(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc('handle_school_request', { p_id: id });
  return !error;
}

export async function ownerClasses(): Promise<OwnerClass[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('owner_classes');
  return error ? null : (data as OwnerClass[]);
}

export async function createClass(p: { name: string; school: string; teacherEmail: string; seats: number; until: string }): Promise<{ code: string } | { error: 'no_account' | 'failed' }> {
  if (!supabase) return { error: 'failed' };
  const { data, error } = await supabase.rpc('create_class', { p_name: p.name, p_school: p.school, p_teacher_email: p.teacherEmail, p_seats: p.seats, p_until: p.until });
  if (error) return { error: 'failed' };
  const r = (data ?? {}) as { ok?: boolean; code?: string; error?: string };
  if (!r.ok || !r.code) return { error: r.error === 'no_account' ? 'no_account' : 'failed' };
  return { code: r.code };
}

export async function updateClass(id: string, seats: number, until: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.rpc('update_class', { p_id: id, p_seats: seats, p_until: until });
  return !error;
}

/** A date typed as YYYY-MM-DD that exists. */
export function validDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
