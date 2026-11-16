import { createClient } from "npm:@supabase/supabase-js@2";

// Receives Safaricom's result for an STK push (plans, promotions and tickets). verify_jwt is off because Safaricom
// cannot send a login; instead the URL carries a secret token (?t=...) and the database re-checks the checkout id,
// the amount and the M-Pesa receipt before anything is credited. Disabled until MPESA_CALLBACK_TOKEN is set.
const ok = () => new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), { headers: { "Content-Type": "application/json" } });

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
  const given = new URL(req.url).searchParams.get("t") || "";
  if (!same(given, token)) return new Response("forbidden", { status: 403 });

  const payload = await req.json().catch(() => null);
  const cb = payload?.Body?.stkCallback;
  if (!cb?.CheckoutRequestID) return ok(); // nothing usable; do not make Safaricom retry

  const items: any[] = Array.isArray(cb.CallbackMetadata?.Item) ? cb.CallbackMetadata.Item : [];
  const pick = (name: string) => items.find((i) => i?.Name === name)?.Value;
  // do not keep the customer's phone number in our logs
  const safeRaw = { ...cb, CallbackMetadata: { Item: items.filter((i) => i?.Name !== "PhoneNumber") } };
  const checkout = String(cb.CheckoutRequestID);
  const receipt = pick("MpesaReceiptNumber") ? String(pick("MpesaReceiptNumber")) : null;
  const amount = pick("Amount") != null ? Number(pick("Amount")) : null;

  const url = Deno.env.get("SUPABASE_URL")!;
  const sb = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // 1) a ticket purchase?
  const t = await sb.rpc("ticket_complete_payment", {
    p_checkout: checkout, p_code: Number(cb.ResultCode), p_failure: cb.ResultDesc ? String(cb.ResultDesc) : null,
    p_receipt: receipt, p_amount: amount,
  });
  if (t.error) {
    console.error("ticket_complete_payment failed:", t.error.message);
    return new Response("retry", { status: 500 }); // let Safaricom try again
  }
  if (t.data !== "unknown") {
    console.log("mpesa ticket callback:", checkout, t.data);
    if (t.data === "succeeded") {
      // pay the host straight away (the minute-by-minute job is the safety net)
      const run = fetch(`${url}/functions/v1/ticket-payout`, { method: "POST" }).catch((e) => console.error("payout kick failed", e));
      // @ts-ignore EdgeRuntime is provided by Supabase
      if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) EdgeRuntime.waitUntil(run); else await run;
    }
    return ok();
  }

  // 2) a plan or promotion payment
  const { data, error } = await sb.rpc("complete_payment", {
    p_checkout_id: checkout, p_result_code: Number(cb.ResultCode), p_failure: cb.ResultDesc ? String(cb.ResultDesc) : null,
    p_receipt: receipt, p_amount: amount, p_raw: safeRaw,
  });
  if (error) {
    console.error("complete_payment failed:", error.message);
    return new Response("retry", { status: 500 });
  }
  console.log("mpesa callback:", checkout, data);
  return ok();
});
