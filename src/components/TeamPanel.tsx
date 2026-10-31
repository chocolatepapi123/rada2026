import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Mail, Trash2, UserPlus, Users, X } from 'lucide-react';
import {
  ROLE_HELP, ROLE_LABEL, TEAM_SEATS, acceptTeamInvite, fetchMyTeamInvites, fetchTeam, inviteTeamMember,
  removeTeamMember, setTeamRole,
  type TeamInfo, type TeamInvite, type TeamRole,
} from '../lib/team';

const cardCls = 'rounded-3xl p-4 bg-white dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3';
const inputCls = 'w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 text-[13px] font-semibold outline-none';

/** Invitations sent to the signed-in user's email. Renders nothing when there are none. */
export const TeamInvitesCard: React.FC<{ signedIn: boolean; onChanged?: () => void }> = ({ signedIn, onChanged }) => {
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    if (!signedIn) return setInvites([]);
    try { setInvites(await fetchMyTeamInvites()); } catch { setInvites([]); }
  }, [signedIn]);
  useEffect(() => { load(); }, [load]);

  const act = async (id: string, accept: boolean) => {
    setBusy(id); setErr('');
    try {
      if (accept) await acceptTeamInvite(id); else await removeTeamMember(id);
      await load();
      onChanged?.();
    } catch (e: any) { setErr(e?.message || 'Something went wrong'); }
    setBusy('');
  };

  if (!invites.length) return null;
  return (
    <div className={cardCls}>
      <div className="flex items-center gap-2 text-[13px] font-black text-slate-900 dark:text-white"><Mail className="w-4 h-4" /> Team invitations</div>
      {invites.map((i) => (
        <div key={i.id} className="flex items-center gap-2 rounded-2xl bg-slate-50 dark:bg-slate-900/60 p-3">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black truncate text-slate-900 dark:text-white">{i.business_name}</p>
            <p className="text-[11px] font-semibold text-slate-500">Join as {ROLE_LABEL[i.role]}</p>
          </div>
          <button type="button" disabled={busy === i.id} onClick={() => act(i.id, true)} className="p-2 rounded-xl bg-emerald-600 text-white cursor-pointer" aria-label="Accept"><Check className="w-4 h-4" /></button>
          <button type="button" disabled={busy === i.id} onClick={() => act(i.id, false)} className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer" aria-label="Decline"><X className="w-4 h-4" /></button>
        </div>
      ))}
      {err && <p className="text-[11px] font-bold text-rose-600">{err}</p>}
    </div>
  );
};

/** Owner and managers: invite people, change roles, remove people. Other members get a read-only list. */
export const TeamPanel: React.FC<{ businessId: string; businessName?: string; signedIn: boolean }> = ({ businessId, businessName, signedIn }) => {
  const [info, setInfo] = useState<TeamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>('editor');
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    if (!signedIn || !businessId) { setLoading(false); return; }
    try { setInfo(await fetchTeam(businessId)); setErr(''); }
    catch (e: any) { setErr(e?.message || 'Could not load your team'); }
    setLoading(false);
  }, [businessId, signedIn]);
  useEffect(() => { setLoading(true); load(); }, [load]);

  const run = async (key: string, fn: () => Promise<unknown>, done?: string) => {
    setBusy(key); setErr(''); setNote('');
    try { await fn(); if (done) setNote(done); await load(); }
    catch (e: any) { setErr(e?.message || 'Something went wrong'); }
    setBusy('');
  };

  const myRole = info?.my_role;
  const canManage = myRole === 'owner' || myRole === 'manager';
  const full = info ? info.seats_used >= info.seats_limit : false;
  const roleOptions: TeamRole[] = myRole === 'owner' ? ['manager', 'editor', 'staff'] : ['editor', 'staff'];

  const invite = () => run('invite', async () => {
    const r = await inviteTeamMember(businessId, email, role);
    setEmail('');
    setNote(r.account_found ? 'Invitation sent. They will see it in their notifications and Plan tab.' : 'Invitation saved. They need to sign up to RADA with this email, then accept it in the Plan tab.');
  });

  if (!signedIn) return null;
  return (
    <div className={cardCls}>
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-slate-700 dark:text-slate-200" />
        <h3 className="text-[14px] font-black text-slate-900 dark:text-white flex-1">Your team{businessName ? ` · ${businessName}` : ''}</h3>
        {info && <span className="text-[11px] font-black text-slate-500">{info.seats_used} of {info.seats_limit} seats</span>}
      </div>

      {loading && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>}
      {err && <p className="text-[11px] font-bold text-rose-600">{err}</p>}
      {note && <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">{note}</p>}

      {info && info.seats_limit === 0 && myRole === 'owner' && (
        <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300">
          Team members start on Pro (up to {TEAM_SEATS.pro}) and Elite (up to {TEAM_SEATS.elite}). Upgrade to give your staff their own logins.
        </p>
      )}

      {info && canManage && info.seats_limit > 0 && (
        <div className="space-y-2">
          <input type="email" inputMode="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Their RADA email" className={inputCls} />
          <div className="flex gap-2">
            <select value={role} onChange={(e) => setRole(e.target.value as TeamRole)} className={inputCls + ' flex-1'}>
              {roleOptions.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
            <button type="button" disabled={busy === 'invite' || !email.trim() || full} onClick={invite}
              className="px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[12px] font-black flex items-center gap-1.5 disabled:opacity-40 cursor-pointer">
              <UserPlus className="w-4 h-4" /> Invite
            </button>
          </div>
          <p className="text-[11px] font-semibold text-slate-500">{ROLE_HELP[role]}</p>
          {full && <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">All seats are in use. Remove someone or upgrade for more.</p>}
        </div>
      )}

      {info && info.members.length > 0 && (
        <div className="space-y-2">
          {info.members.map((m) => {
            const editable = myRole === 'owner' || (myRole === 'manager' && m.role !== 'manager');
            return (
              <div key={m.id} className="flex items-center gap-2 rounded-2xl bg-slate-50 dark:bg-slate-900/60 p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black truncate text-slate-900 dark:text-white">{m.name}</p>
                  <p className="text-[11px] font-semibold text-slate-500 truncate">
                    {m.email ? `${m.email} · ` : ''}{m.status === 'pending' ? 'Invited' : ROLE_LABEL[m.role]}
                  </p>
                </div>
                {editable && (
                  <>
                    <select value={m.role} disabled={busy === m.id}
                      onChange={(e) => run(m.id, () => setTeamRole(m.id, e.target.value as TeamRole))}
                      className="rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-black px-2 py-1.5">
                      {(myRole === 'owner' ? (['manager', 'editor', 'staff'] as TeamRole[]) : (['editor', 'staff'] as TeamRole[])).map((r) => (
                        <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                      ))}
                    </select>
                    <button type="button" disabled={busy === m.id}
                      onClick={() => { if (window.confirm(`Remove ${m.name} from the team?`)) run(m.id, () => removeTeamMember(m.id)); }}
                      className="p-2 rounded-xl text-rose-600 bg-rose-50 dark:bg-rose-950/40 cursor-pointer" aria-label={`Remove ${m.name}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {info && info.members.length === 0 && info.seats_limit > 0 && (
        <p className="text-[12px] font-semibold text-slate-500">No team members yet. Invite someone by the email they use on RADA.</p>
      )}

      {info && myRole && myRole !== 'owner' && (
        <button type="button" disabled={busy === 'leave'}
          onClick={() => {
            const me = info.members.find((m) => m.is_me);
            if (me && window.confirm('Leave this team?')) run('leave', () => removeTeamMember(me.id), 'You left the team.');
          }}
          className="text-[11px] font-black text-rose-600 cursor-pointer">Leave this team</button>
      )}
    </div>
  );
};
