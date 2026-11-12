# Switching paid tickets on

Free tickets already work. Do these in order. Stop at the first step that fails.

## 1. Before you start
- [ ] You have a Safaricom **Paybill or Till** registered on Daraja (Pochi la Biashara cannot do STK push or payouts).
- [ ] You have checked whether holding other people's money for a few minutes needs a payment-provider licence in Kenya.
- [ ] `npm install` and `npm run build` pass on your machine (added packages: `qrcode`, `jsqr`).

## 2. Supabase secrets (Edge Functions, Secrets)
Payments: `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_TOKEN`
Payouts: `MPESA_B2C_INITIATOR`, `MPESA_B2C_SECURITY_CREDENTIAL`, `MPESA_B2C_SHORTCODE`
Keep `MPESA_ENV=sandbox` for the test, then set `MPESA_ENV=production`.
- [ ] Daraja callback and result URLs point at the deployed `mpesa-callback` and payout result functions, including the callback token.

## 3. Sandbox test (use a KES 50 ticket)
1. Admin, Ticket money: switch **Paid tickets** on.
2. Host account (Pro or Elite): save a payout number, publish an event or outing, add a KES 50 ticket.
3. Buyer account: open the share link, pay with M-Pesa.
   - [ ] PIN prompt arrives, then "You are in!" appears.
   - [ ] My Tickets shows the QR code.
   - [ ] Host sees the sale and "You earn" (price minus commission).
4. Host: Check in guests, scan the QR.
   - [ ] "Let them in". Scanning again says "Already checked in".
5. Wait a few minutes.
   - [ ] Host gets "Payout sent" and the money arrives. Admin, Ticket money shows nothing stuck.
6. Failure cases:
   - [ ] Cancel the PIN prompt: buyer sees a clear message, no ticket, nothing charged.
   - [ ] Outing with "Approved guests must buy a ticket": request to join, approve, pay in time, you are in. Let a second one run out of time, the approval cancels.

## 4. Go live
- [ ] Set `MPESA_ENV=production` and the real shortcodes. Repeat step 3 once with a real KES 50 ticket.
- [ ] Check the first few payouts by hand against the M-Pesa statement.

## 5. Every day
- Admin, Ticket money: send any **Refunds** (M-Pesa portal, then paste the reference), look at **Payouts that need a person**.
- A payout with no answer from M-Pesa is never retried by itself. Check the statement first, retry only if the money did not leave.
