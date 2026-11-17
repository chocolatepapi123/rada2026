/**
 * Demo Mode entries for the Vault tab: saved plans plus a few tickets, so the Vault looks lived-in.
 * Shown only in Demo Mode (see lib/demoMode.ts). Ids start with "demo-vault-", never saved to the device or Supabase.
 * The plans match the demo outings, the date invite in chat and the sample events, so the story stays consistent.
 */
import type { VaultTicket } from '../types.ts';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** e.g. "Sat 21 Nov 2026" for a day `ahead` days from today. */
function day(ahead: number): string {
  const d = new Date(Date.now() + ahead * 86400000);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function buildDemoVaultTickets(): VaultTicket[] {
  return [
    // Cinema pass for today, so the "happening today" badge shows
    { id: 'demo-vault-movie', title: 'Project Hail Mary (IMAX)', dateStr: 'Today, 6:10 PM', locationStr: 'Century Cinemax, Garden City', type: 'Cinema Movie Pass' },
    { id: 'demo-vault-rooftop-ticket', title: 'Sunset Rooftop Sessions', dateStr: `${day(1)}, 5:00 PM`, locationStr: 'The Alchemist, Westlands', type: 'Verified Ticket Pass' },
    { id: 'demo-vault-jazz-ticket', title: 'Jazz in the Park', dateStr: `${day(3)}, 2:00 PM`, locationStr: 'Karura Forest Picnic Lawn', type: 'Verified Ticket Pass' },
    // Saved plans
    { id: 'demo-vault-plan-paint', title: 'Paint & Sip Night', dateStr: `${day(2)} (6:30 PM)`, locationStr: 'Kilimani, Nairobi', type: 'Vault Synced Outing' },
    { id: 'demo-vault-plan-date', title: 'Date with @mwende_k @ Pallet Cafe Lavington', dateStr: `${day(3)} (4:00 PM)`, locationStr: 'Lavington, Nairobi', type: 'Vault Synced Outing' },
    { id: 'demo-vault-plan-sundowners', title: 'Sundowners at Ole Sereni Rooftop', dateStr: `${day(4)} (5:30 PM)`, locationStr: 'Mombasa Road, Nairobi', type: 'Vault Synced Outing' },
    { id: 'demo-vault-plan-karura', title: 'Karura Forest Sunday Hike & Brunch', dateStr: `${day(6)} (7:00 AM)`, locationStr: 'Karura Forest, Limuru Road', type: 'Vault Synced Outing' },
  ];
}
