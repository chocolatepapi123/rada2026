/**
 * Retention features: offer claims and redemptions, owner replies to reviews.
 * Every rule (limits, who may redeem, who may reply) is enforced by the database functions;
 * this file only calls them and turns the replies into plain data.
 */
import { supabase, isSupabaseConfigured } from './supabase';

export interface Redemption {
  id: string;
  listing_id: string;
  offer_ref: string;
  code: string;
  status: 'claimed' | 'redeemed' | 'cancelled' | 'expired';
  claimed_at: string;
  redeemed_at: string | null;
}

export interface MyRedemption {
  id: string;
  code: string;
  status: string;
  claimed_at: string;
  redeemed_at: string | null;
  offer_ref: string;
  offer_title: string;
  business_name: string | null;
}

export interface OfferStats {
  claimed: number;
  redeemed: number;
  cap: number | null;
  recent: { code: string; status: string; claimed_at: string; redeemed_at: string | null }[];
}

export interface ReviewReply {
  review_id: string;
  spot_id: string;
  owner_id: string;
  body: string;
  created_at: string;
  updated_at: string;
}

const need = () => {
  if (!isSupabaseConfigured) throw new Error('This needs a connection to RADA. Try again online.');
};

export async function claimOffer(offerId: string): Promise<Redemption> {
  need();
  const { data, error } = await supabase.rpc('claim_offer', { p_offer: offerId });
  if (error) throw new Error(error.message);
  return data as Redemption;
}

export async function redeemOfferCode(code: string): Promise<{ code: string; status: string; redeemed_at: string; offer_title: string }> {
  need();
  const { data, error } = await supabase.rpc('redeem_offer', { p_code: code });
  if (error) throw new Error(error.message);
  return data as any;
}

export async function fetchMyRedemptions(): Promise<MyRedemption[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.rpc('get_my_redemptions');
  if (error) return [];
  return (data as MyRedemption[]) || [];
}

export async function fetchOfferStats(offerId: string): Promise<OfferStats | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc('get_offer_stats', { p_offer: offerId });
  if (error) return null;
  return data as OfferStats;
}

// ---- review replies: one batched query for all the reviews on screen -------------------------------
const replyCache = new Map<string, ReviewReply | null>();
const waiters = new Map<string, ((r: ReviewReply | null) => void)[]>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function flushReplies() {
  timer = null;
  const ids = Array.from(waiters.keys());
  const pending = new Map(waiters);
  waiters.clear();
  let rows: ReviewReply[] = [];
  if (isSupabaseConfigured && ids.length) {
    const { data } = await supabase.from('review_replies').select('*').in('review_id', ids);
    rows = (data as ReviewReply[]) || [];
  }
  const byId = new Map(rows.map((r) => [r.review_id, r]));
  ids.forEach((id) => {
    const reply = byId.get(id) || null;
    replyCache.set(id, reply);
    (pending.get(id) || []).forEach((cb) => cb(reply));
  });
}

export function getReplyForReview(reviewId: string): Promise<ReviewReply | null> {
  if (replyCache.has(reviewId)) return Promise.resolve(replyCache.get(reviewId) || null);
  return new Promise((resolve) => {
    waiters.set(reviewId, [...(waiters.get(reviewId) || []), resolve]);
    if (!timer) timer = setTimeout(flushReplies, 25);
  });
}

export async function replyToReview(reviewId: string, body: string): Promise<ReviewReply> {
  need();
  const { data, error } = await supabase.rpc('reply_to_review', { p_review_id: reviewId, p_body: body });
  if (error) throw new Error(error.message);
  replyCache.set(reviewId, data as ReviewReply);
  return data as ReviewReply;
}

export async function deleteReviewReply(reviewId: string): Promise<void> {
  need();
  const { error } = await supabase.rpc('delete_review_reply', { p_review_id: reviewId });
  if (error) throw new Error(error.message);
  replyCache.set(reviewId, null);
}
