import { createClient } from "npm:@supabase/supabase-js@2";

// Receives Safaricom's final answer for a host payout (B2C). Protected by the secret token in the URL.
const ok = () => new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), { headers: { "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  const token = Deno.env.get("MPESA_CALLBACK_TOKEN");
  if (!token) return new Response("disabled", { status: 503 });
  if (req.method !== "POST") return new Response("POST only", { status: 405 });
  const u = new URL(req.url);
  if (!same(u.searchParams.get("t") || "", token)) return new Response("forbidden", { status: 403 });
  // M-Pesa gave up waiting: we do not know if it was paid, so a person checks (the database flags it after 10 minutes)
  if (u.searchParams.get("timeout")) return ok();

  const payload = await req.json().catch(() => null);
  const r = payload?.Result;
  const orderId = String(r?.OriginatorConversationID || "");
  if (!UUID.test(orderId)) return ok();

  const params: any[] = Array.isArray(r?.ResultParameters?.ResultParameter) ? r.ResultParameters.ResultParameter : [];
  const receipt = params.find((p) => p?.Key === "TransactionReceipt")?.Value;
  const success = Number(r?.ResultCode) === 0 && !!receipt;

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await sb.rpc("ticket_payout_result", {
    p_order: orderId, p_ok: success, p_conversation: r?.ConversationID ? String(r.ConversationID) : null,
    p_receipt: success ? String(receipt) : null, p_error: success ? null : String(r?.ResultDesc || "Payout failed"),
  });
  if (error) {
    console.error("ticket_payout_result failed:", error.message);
    return new Response("retry", { status: 500 });
  }
  return ok();
});
