import { createClient } from "npm:@supabase/supabase-js@2";

// Starts an M-Pesa STK push (the PIN prompt on the customer's phone) for a RADA plan, an approved promotion,
// or a ticket purchase. Requires a signed-in user (verify_jwt = true).
// Disabled until the MPESA_* secrets are set.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

const REQUIRED = ["MPESA_CONSUMER_KEY", "MPESA_CONSUMER_SECRET", "MPESA_SHORTCODE", "MPESA_PASSKEY", "MPESA_CALLBACK_TOKEN"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const pad = (n: number) => String(n).padStart(2, "0");
function stamp() {
  const d = new Date();
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

async function stkPush(amount: number, phone: string, desc: string) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const base = Deno.env.get("MPESA_ENV") === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
  const shortcode = Deno.env.get("MPESA_SHORTCODE")!;
  const partyB = Deno.env.get("MPESA_PARTYB") || shortcode;
  const txType = Deno.env.get("MPESA_TRANSACTION_TYPE") || "CustomerPayBillOnline";
  const auth = btoa(`${Deno.env.get("MPESA_CONSUMER_KEY")}:${Deno.env.get("MPESA_CONSUMER_SECRET")}`);
  const tokRes = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, { headers: { Authorization: `Basic ${auth}` } });
  const tok = await tokRes.json().catch(() => ({}));
  if (!tokRes.ok || !tok.access_token) throw new Error("auth with M-Pesa failed");
  const ts = stamp();
  const password = btoa(`${shortcode}${Deno.env.get("MPESA_PASSKEY")}${ts}`);
  const callback = `${url}/functions/v1/mpesa-callback?t=${encodeURIComponent(Deno.env.get("MPESA_CALLBACK_TOKEN")!)}`;
  const stkRes = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: shortcode, Password: password, Timestamp: ts, TransactionType: txType,
      Amount: amount, PartyA: phone, PartyB: partyB, PhoneNumber: phone, CallBackURL: callback,
      AccountReference: "RADA", TransactionDesc: desc,
    }),
  });
  const stk = await stkRes.json().catch(() => ({}));
  if (!stkRes.ok || String(stk.ResponseCode) !== "0" || !stk.CheckoutRequestID) {
    throw new Error(stk.errorMessage || stk.ResponseDescription || "M-Pesa did not accept the request");
  }
  return stk as { CheckoutRequestID: string; MerchantRequestID?: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const missing = REQUIRED.filter((k) => !Deno.env.get(k));
  if (missing.length) return json({ error: "Payments are not switched on yet." }, 503);

  const url = Deno.env.get("SUPABASE_URL")!;
  const sb = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // who is paying (never trust a user id sent in the body)
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u, error: uErr } = await sb.auth.getUser(jwt);
  if (uErr || !u?.user) return json({ error: "Please sign in first." }, 401);

  const body = await req.json().catch(() => ({}));
  const kind = String(body.kind || "");
  const phone = String(body.phone || "");

  // ---------------- tickets ----------------
  if (kind === "ticket") {
    const typeId = String(body.ticket_type_id || "");
    const qty = Math.floor(Number(body.qty || 1));
    if (!UUID.test(typeId) || !(qty >= 1 && qty <= 20)) return json({ error: "Choose a ticket and how many." }, 400);

    // buy as the signed-in person so the database rules (stock, limits, price, commission) run as them
    const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: order, error: oErr } = await asUser.rpc("ticket_buy", { p_type: typeId, p_qty: qty, p_phone: phone || null });
    if (oErr || !order) return json({ error: oErr?.message || "Could not start the purchase." }, 400);
    if (order.status === "paid") return json({ order_id: order.id, free: true, message: "Your tickets are ready." });

    try {
      const stk = await stkPush(order.gross_kes, order.phone, "RADA ticket");
      await sb.rpc("ticket_attach_checkout", { p_order: order.id, p_checkout: stk.CheckoutRequestID, p_mreq: stk.MerchantRequestID || null });
      return json({ order_id: order.id, amount_kes: order.gross_kes, phone: order.phone, message: "Check your phone and enter your M-Pesa PIN." });
    } catch (e) {
      await sb.rpc("ticket_fail_order", { p_order: order.id, p_reason: String((e as Error)?.message || e) });
      return json({ error: "We could not reach M-Pesa. Please try again in a moment." }, 502);
    }
  }

  // ---------------- plans and promotions ----------------
  const plan = String(body.plan || "");
  const period = String(body.period || "monthly");
  const promotionId = kind === "promotion" ? String(body.promotion_id || "") : null;
  if (kind === "promotion" && !UUID.test(promotionId || "")) return json({ error: "Choose a promotion to pay for." }, 400);

  // price + all rules come from the database, never from the client.
  const { data: pay, error: pErr } = await sb.rpc("create_pending_payment", {
    p_user: u.user.id, p_kind: kind, p_plan: kind === "promotion" ? "promo" : plan, p_phone: phone,
    p_period: period, p_promotion_id: promotionId,
  });
  if (pErr || !pay) return json({ error: pErr?.message || "Could not start the payment." }, 400);

  try {
    const stk = await stkPush(pay.amount_kes, pay.phone, kind === "promotion" ? "RADA promo" : "RADA plan");
    await sb.rpc("attach_checkout", { p_id: pay.id, p_checkout: stk.CheckoutRequestID, p_merchant_req: stk.MerchantRequestID || null });
    return json({ payment_id: pay.id, amount_kes: pay.amount_kes, phone: pay.phone, message: "Check your phone and enter your M-Pesa PIN." });
  } catch (e) {
    await sb.rpc("fail_payment", { p_id: pay.id, p_reason: String((e as Error)?.message || e) });
    return json({ error: "We could not reach M-Pesa. Please try again in a moment." }, 502);
  }
});
