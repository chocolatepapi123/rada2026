import { supabase, isSupabaseConfigured } from './supabase';

export type MilestoneKind = 'outings' | 'spots' | 'photo_reviews';

export interface MilestoneData {
  thresholds: number[];
  counts: Record<MilestoneKind, number>;
  levels: Partial<Record<MilestoneKind, number>>;
}

export const MILESTONE_META: Record<MilestoneKind, { title: string; unit: string; names: string[]; emoji: string }> = {
  outings: {
    title: 'Outings', unit: 'outings', emoji: '🎉',
    names: ['Newcomer', 'Regular', 'Social Butterfly', 'Outing Pro', 'Nairobi Legend', 'RADA Icon'],
  },
  spots: {
    title: 'Spots visited', unit: 'spots', emoji: '📍',
    names: ['Spot Starter', 'Local Explorer', 'Neighborhood Scout', 'City Wanderer', 'Spot Hunter', 'Nairobi Navigator'],
  },
  photo_reviews: {
    title: 'Reviews with photos', unit: 'reviews', emoji: '📸',
    names: ['First Snap', 'Photo Reviewer', 'Shutterbug', 'Visual Storyteller', 'Photo Pro', 'Review Legend'],
  },
};

/** Badge progress for a user (yourself when no id is given). Rules and awards live in the database. */
export async function fetchMilestones(userId?: string | null): Promise<MilestoneData | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('get_milestones', { p_user: userId ?? null });
  if (error || !data) return null;
  return data as MilestoneData;
}
