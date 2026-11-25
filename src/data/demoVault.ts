/**
 * Demo Mode entries for the Vault tab: saved plans synced to your calendar.
 * Shown only in Demo Mode (see lib/demoMode.ts). Ids start with "demo-vault-", never saved to the device or Supabase.
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
    { id: 'demo-vault-plan-paint', title: 'Paint & Sip Night', dateStr: `${day(2)} (6:30 PM)`, locationStr: 'Kilimani, Nairobi', type: 'Vault Synced Outing' },
    { id: 'demo-vault-plan-date', title: 'Date with @mwende_k @ Pallet Cafe Lavington', dateStr: `${day(3)} (4:00 PM)`, locationStr: 'Lavington, Nairobi', type: 'Vault Synced Outing' },
    { id: 'demo-vault-plan-ankole', title: 'Date with @njeri_wa @ Ankole Grill Kilimani', dateStr: `${day(4)} (7:30 PM)`, locationStr: 'Kilimani, Nairobi', type: 'Vault Synced Outing' },
    { id: 'demo-vault-plan-sundowners', title: 'Sundowners at Ole Sereni Rooftop', dateStr: `${day(4)} (5:30 PM)`, locationStr: 'Mombasa Road, Nairobi', type: 'Vault Synced Outing' },
    { id: 'demo-vault-plan-karura', title: 'Karura Forest Sunday Hike & Brunch', dateStr: `${day(6)} (7:00 AM)`, locationStr: 'Karura Forest, Limuru Road', type: 'Vault Synced Outing' },
  ];
}
