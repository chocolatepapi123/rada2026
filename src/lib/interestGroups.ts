/** Interest groups (hiking, board games...). All changes go through database functions. */
import { supabase } from './supabase';
import { isCloudReady } from './socialsCloud';

export interface InterestGroup {
  id: string; name: string; emoji: string; blurb: string;
  members: number; joined: boolean;
  next_title: string | null; next_place: string | null; next_starts: string | null; next_id: string | null;
}
const clean = (m?: string) => String(m || 'Something went wrong. Please try again.').replace(/^.*?:\s*/, '').trim();

export async function fetchGroups(): Promise<InterestGroup[]> {
  if (!isCloudReady()) return [];
  const { data, error } = await supabase.rpc('interest_groups_overview');
  return error ? [] : ((data as InterestGroup[]) || []);
}
export async function setGroupMembership(groupId: string, join: boolean): Promise<string | null> {
  const { error } = await supabase.rpc('join_interest_group', { p_group: groupId, p_join: join });
  return error ? clean(error.message) : null;
}
export async function postMeetup(groupId: string, title: string, place: string, startsAt: Date): Promise<string | null> {
  if (title.trim().length < 3) return 'Give the meetup a short title.';
  if (place.trim().length < 2) return 'Where are you meeting?';
  const { error } = await supabase.rpc('create_group_meetup', { p_group: groupId, p_title: title, p_place: place, p_starts: startsAt.toISOString() });
  return error ? clean(error.message) : null;
}
export interface Meetup { id: string; title: string; place: string; starts_at: string }
export async function fetchMeetups(groupId: string): Promise<Meetup[]> {
  const { data } = await supabase.from('interest_group_meetups').select('id,title,place,starts_at')
    .eq('group_id', groupId).gt('starts_at', new Date().toISOString()).order('starts_at').limit(10);
  return (data as Meetup[]) || [];
}
/** My own spot visits this month, for the recap card. */
export async function fetchMyMonthVisits(): Promise<{ spot_title: string | null; visited_on: string }[]> {
  if (!isCloudReady()) return [];
  const first = new Date(); first.setDate(1);
  const { data } = await supabase.from('spot_visits').select('spot_title,visited_on')
    .gte('visited_on', first.toISOString().slice(0, 10)).order('visited_on', { ascending: false });
  return (data as any[]) || [];
}
