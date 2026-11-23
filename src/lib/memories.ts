import { isSupabaseConfigured } from './supabase';
import { fetchUserData, saveUserData } from './cloudSync';

export type MemoryMood =
  | 'Golden Hour'
  | 'Late Night'
  | 'First Time'
  | 'Core Memory'
  | 'Rainy Day'
  | 'Road Trip';

export interface RadaMemory {
  id: string;
  userId: string;
  title: string;
  story: string;
  spotId?: string | number;
  spotTitle?: string;
  area?: string;
  date: string; // YYYY-MM-DD
  mood: MemoryMood;
  companions?: string[];
  song?: string;
  photoUrl?: string;
  createdAt: string;
}

export const MEMORY_MOODS: MemoryMood[] = [
  'Golden Hour',
  'Core Memory',
  'First Time',
  'Late Night',
  'Road Trip',
  'Rainy Day',
];

const LOCAL_KEY = 'rada_memories_v1';

const isUuid = (v?: string | null): boolean =>
  Boolean(v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v));

function readAll(): Record<string, RadaMemory[]> {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, RadaMemory[]>): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(map));
  } catch {
    // ignore quota issues
  }
}

function daysBackIso(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
}

const DEFAULT_NOSTALGIC_MEMORIES = (userId: string): RadaMemory[] => [
  {
    id: 'mem-seed-1',
    userId,
    title: 'Golden hour at K1 & rooftop laughs',
    story: 'Remember when we swore we were only staying for one drink and ended up watching the whole Nairobi skyline turn amber till midnight? Best playlist of the year.',
    spotTitle: 'K1 Klub House',
    area: 'Parklands, Nairobi',
    date: daysBackIso(92),
    mood: 'Golden Hour',
    companions: ['@amani_j', '@kevo_254'],
    song: 'Sauti Sol — Midnight Train',
    photoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=900&auto=format&fit=crop',
    createdAt: new Date(Date.now() - 92 * 86400000).toISOString(),
  },
  {
    id: 'mem-seed-2',
    userId,
    title: 'Early morning Karura waterfall walk',
    story: 'That misty Saturday morning after heavy rains — hot Kenyan chai & mandazi by the river gate while everyone else was still asleep.',
    spotTitle: 'Karura Forest Trail',
    area: 'Limuru Road, Nairobi',
    date: daysBackIso(148),
    mood: 'Core Memory',
    companions: ['@wanjiru_m', '@nina_w'],
    song: 'Nyashinski — Malaika',
    photoUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=900&auto=format&fit=crop',
    createdAt: new Date(Date.now() - 148 * 86400000).toISOString(),
  },
  {
    id: 'mem-seed-3',
    userId,
    title: 'First rooftop amapiano night',
    story: 'Met half the crew through a RADA hangout and felt like we had known each other for years by the second chorus.',
    spotTitle: 'The Alchemist',
    area: 'Westlands, Nairobi',
    date: daysBackIso(46),
    mood: 'First Time',
    companions: ['@caro_a', '@dennis_m'],
    song: 'Bensoul — Nairobi',
    photoUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&auto=format&fit=crop',
    createdAt: new Date(Date.now() - 46 * 86400000).toISOString(),
  },
];

export function getMemories(userId = 'guest'): RadaMemory[] {
  const key = userId || 'guest';
  const all = readAll();
  if (!(key in all)) {
    const seeded = DEFAULT_NOSTALGIC_MEMORIES(key);
    all[key] = seeded;
    writeAll(all);
    return seeded;
  }
  return [...(all[key] || [])].sort((a, b) => b.date.localeCompare(a.date));
}

export async function loadMemoriesSynced(userId = 'guest'): Promise<RadaMemory[]> {
  const local = getMemories(userId);
  if (isSupabaseConfigured && isUuid(userId)) {
    try {
      const data = await fetchUserData(userId);
      const remote = (data as any)?.memories;
      if (Array.isArray(remote) && remote.length > 0) {
        const all = readAll();
        all[userId] = remote;
        writeAll(all);
        return [...remote].sort((a, b) => String(b.date).localeCompare(String(a.date)));
      }
    } catch {
      // keep local fallback
    }
  }
  return local;
}

export async function addMemory(
  userId: string,
  input: Omit<RadaMemory, 'id' | 'userId' | 'createdAt'>
): Promise<RadaMemory[]> {
  const key = userId || 'guest';
  const current = getMemories(key);
  const entry: RadaMemory = {
    ...input,
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId: key,
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...current].sort((a, b) => b.date.localeCompare(a.date));
  const all = readAll();
  all[key] = next;
  writeAll(all);

  if (isSupabaseConfigured && isUuid(key)) {
    saveUserData(key, { memories: next } as any).catch(() => {});
  }
  return next;
}

export async function deleteMemory(userId: string, memoryId: string): Promise<RadaMemory[]> {
  const key = userId || 'guest';
  const current = getMemories(key);
  const next = current.filter((m) => m.id !== memoryId);
  const all = readAll();
  all[key] = next;
  writeAll(all);

  if (isSupabaseConfigured && isUuid(key)) {
    saveUserData(key, { memories: next } as any).catch(() => {});
  }
  return next;
}

export function formatMemoryDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function getTimeAgoNostalgia(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  if (isNaN(d.getTime())) return 'A while back';
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  if (days < 365) {
    const months = Math.max(1, Math.round(days / 30));
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }
  const years = Math.max(1, Math.floor(days / 365));
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

export function pickThrowbackMemory(memories: RadaMemory[]): RadaMemory | null {
  if (!memories.length) return null;
  const older = memories.filter((m) => {
    const d = new Date(`${m.date}T12:00:00`);
    return !isNaN(d.getTime()) && Date.now() - d.getTime() >= 14 * 86400000;
  });
  const pool = older.length ? older : memories;
  const daySeed = Math.floor(Date.now() / 86400000);
  return pool[daySeed % pool.length] || pool[0];
}
