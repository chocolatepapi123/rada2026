import { supabase } from './supabase';

export interface ChecklistItem {
  key: string;
  title: string;
  detail: string;
  severity: 'high' | 'medium' | 'low' | string;
  sort: number;
  done: boolean;
  done_at: string | null;
}

export async function fetchAdminChecklist(): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from('admin_checklist')
    .select('key,title,detail,severity,sort,done,done_at')
    .order('sort', { ascending: true });
  if (error) throw new Error(error.message);
  return (data as ChecklistItem[]) || [];
}

export async function setChecklistDone(key: string, done: boolean): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('admin_checklist')
    .update({ done, done_at: done ? new Date().toISOString() : null, done_by: done ? u.user?.id ?? null : null })
    .eq('key', key);
  if (error) throw new Error(error.message);
}
