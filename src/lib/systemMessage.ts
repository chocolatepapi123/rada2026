// Friendly wording for the automatic messages RADA posts inside chats.

/** "2026-10-24" + "18:00"  ->  "Sat 24 Oct, 6:00 PM". Falls back to whatever text it was given. */
export function friendlyWhen(date?: string, time?: string): string {
  let day = '';
  if (date) {
    const d = new Date(`${date}T12:00:00`);
    day = Number.isNaN(d.getTime())
      ? date
      : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
  }
  let clock = '';
  const m = (time || '').match(/^(\d{1,2}):(\d{2})/);
  if (m) {
    const h = parseInt(m[1], 10);
    clock = `${h % 12 || 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`;
  } else if (time) {
    clock = time;
  }
  return [day, clock].filter(Boolean).join(', ');
}

export function unlockMessageText(title: string, date: string | undefined, time: string | undefined, host: string): string {
  const when = friendlyWhen(date, time);
  return `Group chat is open for "${title}"${when ? ` on ${when}` : ''}. Hosted by ${host}.`;
}

export interface UnlockInfo { title: string; when: string; host: string }

/** Reads both the old wording ("Temporary Group Chat unlocked ...") and the new one, so old chats look right too. */
export function parseUnlockMessage(text: string): UnlockInfo | null {
  const old = text.match(/^Temporary Group Chat unlocked for "(.+?)"(?: on (\S+) at (\S+))?! Hosted by (.+?)\.?$/);
  if (old) return { title: old[1], when: friendlyWhen(old[2], old[3]), host: old[4] };
  const cur = text.match(/^Group chat is open for "(.+?)"(?: on (.+?))?\. Hosted by (.+?)\.?$/);
  if (cur) return { title: cur[1], when: cur[2] || '', host: cur[3] };
  return null;
}
