import { createClient } from "npm:@supabase/supabase-js@2";

// Sends host ticket money by M-Pesa (Daraja B2C). It takes no input: it only pays orders the database has
// already marked "due" to the number the host saved, so it is safe to call as often as we like
// (right after a sale, and every minute as a safety net).
// Does nothing until the MPESA_B2C_* secrets are set; until then payouts stay "due" for the admin to send by hand.
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (_req) => {
  const need = ["MPESA_B2C_INITIATOR", "MPESA_B2C_SECURITY_CREDENTIAL", "MPESA_B2C_SHORTCODE", "MPESA_CALLBACK_TOKEN"];
  const key = Deno.env.get("MPESA_B2C_CONSUMER_KEY") || Deno.env.get("MPESA_CONSUMER_KEY");
  const secret = Deno.env.get("MPESA_B2C_CONSUMER_SECRET") || Deno.env.get("MPESA_CONSUMER_SECRET");
  const missing = need.filter((k) => !Deno.env.get(k)).concat(!key ? ["MPESA_CONSUMER_KEY"] : [], !secret ? ["MPESA_CONSUMER_SECRET"] : []);
  if (missing.length) return json({ skipped: "automatic payouts are not switched on", missing });

  const url = Deno.env.get("SUPABASE_URL")!;
  const sb = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const base = Deno.env.get("MPESA_ENV") === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
  const path = Deno.env.get("MPESA_B2C_PATH") || "/mpesa/b2c/v3/paymentrequest";
  const t = encodeURIComponent(Deno.env.get("MPESA_CALLBACK_TOKEN")!);
  const resultUrl = `${url}/functions/v1/ticket-payout-result?t=${t}`;
  const timeoutUrl = `${url}/functions/v1/ticket-payout-result?t=${t}&timeout=1`;

  const { data: batch, error } = await sb.rpc("ticket_payout_claim", { p_limit: 10 });
  if (error) return json({ error: error.message }, 500);
  const jobs: { order_id: string; amount: number; phone: string }[] = Array.isArray(batch) ? batch : [];
  if (!jobs.length) return json({ sent: 0 });

  let token = "";
  try {
    const tokRes = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${btoa(`${key}:${secret}`)}` } });
    const tok = await tokRes.json().catch(() => ({}));
    if (!tokRes.ok || !tok.access_token) throw new Error("auth with M-Pesa failed");
    token = tok.access_token;
  } catch (e) {
    // nothing was sent, so it is safe to put them back
    for (const j of jobs) await sb.rpc("ticket_payout_result", { p_order: j.order_id, p_ok: false, p_conversation: null, p_receipt: null, p_error: String((e as Error).message || e) });
    return json({ error: "could not sign in to M-Pesa" }, 502);
  }

  let accepted = 0;
  for (const j of jobs) {
    try {
      const res = await fetch(`${base}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          OriginatorConversationID: j.order_id, // lets us match the result to the order, and stops double payment
          InitiatorName: Deno.env.get("MPESA_B2C_INITIATOR"),
          SecurityCredential: Deno.env.get("MPESA_B2C_SECURITY_CREDENTIAL"),
          CommandID: "BusinessPayment",
          Amount: j.amount,
          PartyA: Deno.env.get("MPESA_B2C_SHORTCODE"),
          PartyB: j.phone,
          Remarks: "RADA ticket sales",
          QueueTimeOutURL: timeoutUrl,
          ResultURL: resultUrl,
          Occasion: "RADA",
        }),
      });
      const r = await res.json().catch(() => ({}));
      if (res.ok && String(r.ResponseCode) === "0") {
        accepted++;
        await sb.rpc("ticket_payout_result", { p_order: j.order_id, p_ok: false, p_conversation: r.ConversationID || j.order_id, p_receipt: null, p_error: null });
      } else {
        // M-Pesa clearly refused it, so nothing was sent
        await sb.rpc("ticket_payout_result", { p_order: j.order_id, p_ok: false, p_conversation: null, p_receipt: null, p_error: String(r.errorMessage || r.ResponseDescription || `HTTP ${res.status}`) });
      }
    } catch (_e) {
      // no answer: it may or may not have gone through, so leave it as "sending". It is flagged for a person after 10 minutes.
    }
  }
  return json({ sent: accepted, tried: jobs.length });
});
