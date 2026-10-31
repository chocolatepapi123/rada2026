import { supabase, isSupabaseConfigured } from './supabase';

const BUCKET = 'rada-video';

export interface VideoAllowance {
  plan: 'free' | 'pro' | 'elite';
  max_mb: number;
  max_seconds: number;
  max_count: number;
  slots_left: number;
}

export interface HostVideo {
  name: string;
  path: string;
  url: string;
  created_at?: string;
}

export async function fetchVideoAllowance(): Promise<VideoAllowance | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('get_my_video_allowance');
  if (error) return null;
  return data as VideoAllowance;
}

export async function listHostVideos(hostId: string): Promise<HostVideo[]> {
  if (!isSupabaseConfigured || !hostId) return [];
  const { data, error } = await supabase.storage.from(BUCKET).list(hostId, {
    limit: 50,
    sortBy: { column: 'created_at', order: 'desc' },
  });
  if (error || !data) return [];
  return data
    .filter((f) => f.name && !f.name.startsWith('.'))
    .map((f) => {
      const path = `${hostId}/${f.name}`;
      return { name: f.name, path, url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, created_at: f.created_at };
    });
}

/** Reads a video's length in seconds in the browser (the server cannot). */
export function readVideoSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    const url = URL.createObjectURL(file);
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(v.duration);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read this video. Try an MP4.'));
    };
    v.src = url;
  });
}

/** Checks the plan limits in the browser, then uploads. Throws a readable message on any problem. */
export async function uploadHostVideo(userId: string, file: File, allowance: VideoAllowance): Promise<void> {
  if (allowance.max_count === 0) throw new Error('Video uploads need the Pro or Elite creator plan.');
  if (allowance.slots_left <= 0) throw new Error(`You have reached your limit of ${allowance.max_count} videos. Delete one to add another.`);
  if (!['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) throw new Error('Use an MP4, WebM or MOV video.');
  if (file.size > allowance.max_mb * 1024 * 1024) throw new Error(`Videos can be up to ${allowance.max_mb} MB on your plan.`);
  const secs = await readVideoSeconds(file);
  if (secs > allowance.max_seconds + 0.5) throw new Error(`Videos can be up to ${allowance.max_seconds} seconds on your plan.`);
  const ext = file.type === 'video/webm' ? 'webm' : file.type === 'video/quicktime' ? 'mov' : 'mp4';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
}

export async function deleteHostVideo(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}
