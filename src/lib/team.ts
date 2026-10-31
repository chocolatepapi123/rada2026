/**
 * Business team members and roles. Source of truth is public.business_team_members in Supabase.
 * Every change goes through RPCs (invite_team_member, accept_team_invite, remove_team_member,
 * set_team_role); the same rules are enforced in Postgres, this file only calls and displays.
 */
import { supabase, isSupabaseConfigured } from './supabase';

export type TeamRole = 'manager' | 'editor' | 'staff';
export type MyRole = TeamRole | 'owner';

/** Extra people a business can add besides the owner. Mirrors public.team_seat_limit(). */
export const TEAM_SEATS = { free: 0, pro: 3, elite: 10 } as const;

export const ROLE_LABEL: Record<MyRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  editor: 'Editor',
  staff: 'Staff',
};

export const ROLE_HELP: Record<TeamRole, string> = {
  manager: 'Edit spots, events and offers, redeem codes, and invite editors and staff.',
  editor: 'Edit spots, events and offers, and redeem codes.',
  staff: 'Redeem offer codes at the door. Cannot edit anything.',
};

export interface TeamMember {
  id: string;
  role: TeamRole;
  status: 'pending' | 'active';
  /** True for the signed-in user's own row. */
  is_me: boolean;
  /** Only visible to the owner and managers. */
  email: string | null;
  name: string;
  joined_at: string | null;
}

export interface TeamInfo {
  my_role: MyRole | null;
  plan: 'free' | 'pro' | 'elite';
  seats_limit: number;
  seats_used: number;
  members: TeamMember[];
}

export interface TeamInvite {
  id: string;
  role: TeamRole;
  business_id: string;
  business_name: string;
}

export interface MyTeam {
  business_id: string;
  business_name: string;
  role: TeamRole;
}

const need = () => {
  if (!isSupabaseConfigured) throw new Error('This needs a connection to RADA. Try again online.');
};

const call = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => {
  need();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
};

export const fetchTeam = (businessId: string) => call<TeamInfo>('list_team', { p_business: businessId });
export const fetchMyTeamInvites = () => call<TeamInvite[]>('get_my_team_invites');
export const fetchMyTeams = () => call<MyTeam[]>('get_my_teams');
export const inviteTeamMember = (businessId: string, email: string, role: TeamRole) =>
  call<{ id: string; account_found: boolean }>('invite_team_member', { p_business: businessId, p_email: email, p_role: role });
export const acceptTeamInvite = (id: string) => call<{ business_id: string; role: TeamRole }>('accept_team_invite', { p_id: id });
export const removeTeamMember = (id: string) => call<void>('remove_team_member', { p_id: id });
export const setTeamRole = (id: string, role: TeamRole) => call<void>('set_team_role', { p_id: id, p_role: role });
