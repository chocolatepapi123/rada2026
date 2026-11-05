import { supabase, isSupabaseConfigured } from './supabase';

// A person's public "look": the colour theme of their profile page and their tags.
// Stored in the database so everyone who opens their profile sees the same thing.
// (Needs profile_look.sql to be run once in Supabase.)

export const THEMES = [
  { id: 'terracotta', name: 'Terracotta', color: '#E0533C' },
  { id: 'sage', name: 'Sage', color: '#2D6A4F' },
  { id: 'ocean', name: 'Ocean', color: '#2563EB' },
  { id: 'violet', name: 'Violet', color: '#7C3AED' },
  { id: 'rose', name: 'Rose', color: '#E11D48' },
  { id: 'amber', name: 'Amber', color: '#D97706' },
  { id: 'slate', name: 'Slate', color: '#475569' },
] as const;

export const DEFAULT_THEME = 'terracotta';
export const MAX_TAGS = 8;
export const MAX_TAG_LEN = 20;

export const themeColor = (id?: string | null): string =>
  (THEMES.find((t) => t.id === id) || THEMES[0]).color;

export interface ProfileLook {
  theme: string;
  tags: string[];
}

export const cleanTag = (raw: string): string =>
  raw.replace(/^#+/, '').replace(/\s+/g, ' ').trim().slice(0, MAX_TAG_LEN);

/** Look of any user. Returns null when it cannot be read (e.g. the SQL has not been run yet). */
export async function fetchProfileLook(userId?: string | null): Promise<ProfileLook | null> {
  if (!userId || !isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.rpc('get_profile_look', { p_user: userId });
    if (error) return null;
    const row: any = Array.isArray(data) ? data[0] : data;
    if (!row) return { theme: DEFAULT_THEME, tags: [] };
    return {
      theme: THEMES.some((t) => t.id === row.profile_theme) ? row.profile_theme : DEFAULT_THEME,
      tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    };
  } catch {
    return null;
  }
}

/** Saves YOUR look. Returns an error message, or null on success. */
export async function saveMyProfileLook(look: ProfileLook): Promise<string | null> {
  if (!isSupabaseConfigured) return 'Not connected.';
  try {
    const tags = Array.from(new Set(look.tags.map(cleanTag).filter(Boolean))).slice(0, MAX_TAGS);
    const { error } = await supabase.rpc('set_my_profile_look', { p_theme: look.theme, p_tags: tags });
    return error ? error.message : null;
  } catch (e: any) {
    return e?.message || 'Could not save.';
  }
}
