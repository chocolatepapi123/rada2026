import React, { useState } from 'react';
import { Calendar, QrCode, Ticket, CheckCircle2 } from 'lucide-react';
import { VaultTicket } from '../types.ts';

interface VaultTabProps {
  tickets: VaultTicket[];
  onShowQrCode: (title: string) => void;
}

export const VaultTab: React.FC<VaultTabProps> = ({ tickets, onShowQrCode }) => {
  const [selectedMonth, setSelectedMonth] = useState(9); // October
  const [selectedYear, setSelectedYear] = useState(2026);

  // Calendar calculations
  const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  const emptyCells = Array.from({ length: firstDay });
  const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Check if a day has outings
  const hasOuting = (day: number) => {
    if (selectedMonth === 9 && selectedYear === 2026 && (day === 13 || day === 30 || day === 31)) {
      return true;
    }
    return false;
  };

  return (
    <section className="px-4 py-4 space-y-6">
      {/* Calendar Card */}
      <div className="bg-[#F1F1EE] dark:bg-[#1C1A1E] border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 font-black text-xs px-2.5 py-1.5 rounded-xl focus:outline-none"
            >
              {[
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
              ].map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-white dark:bg-[#121113] border border-slate-200 dark:border-slate-800 font-black text-xs px-2.5 py-1.5 rounded-xl focus:outline-none"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
            Outings Vault
          </p>
        </div>

        {/* Days of Week */}
        <div className="grid grid-cols-7 text-center text-[10px] font-black text-slate-400 uppercase">
          <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
          {emptyCells.map((_, i) => (
            <div key={`empty-${i}`} className="py-2.5" />
          ))}

          {dayCells.map((day) => {
            const isSpecial = hasOuting(day);
            return (
              <div
                key={`day-${day}`}
                className={`py-2 rounded-xl transition cursor-pointer ${
                  isSpecial
                    ? 'font-black bg-[#E0533C] text-white shadow-sm ring-2 ring-[#E0533C]/30'
                    : 'font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200 dark:border-slate-800 text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E0533C]" />
            <span>Outing / Event Scheduled</span>
          </span>
          <span>Vault Sync Active</span>
        </div>
      </div>

      {/* Digital Wallet Passes & Tickets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black tracking-wider uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Ticket className="w-3.5 h-3.5 text-[#E0533C]" />
            <span>Digital Passes & Synced Outings ({tickets.length})</span>
          </h2>
          <span className="text-[10px] text-slate-400 font-bold">Fast-Track Entry</span>
        </div>

        <div className="space-y-3">
          {tickets.map((t) => (
            <div
              key={t.id}
              className={`rounded-3xl p-4 shadow-md flex items-center justify-between text-white transition ${
                t.type === 'Verified Ticket Pass'
                  ? 'bg-gradient-to-r from-[#E0533C] to-[#E9C46A]'
                  : 'bg-gradient-to-r from-[#2D6A4F] to-emerald-700'
              }`}
            >
              <div>
                <span className="text-[9px] uppercase font-black tracking-wider bg-white/20 px-2 py-0.5 rounded-md inline-block">
                  {t.type}
                </span>
                <h4 className="font-black text-base mt-1 text-white">{t.title}</h4>
                <p className="text-xs text-slate-100 mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{t.dateStr} • {t.locationStr}</span>
                </p>
              </div>

              <button
                onClick={() => onShowQrCode(t.title)}
                className="px-3.5 py-2.5 bg-white text-slate-900 rounded-xl text-xs font-black shadow-md hover:bg-slate-100 transition flex items-center gap-1.5 shrink-0"
              >
                <QrCode className="w-4 h-4" />
                <span>QR Pass</span>
              </button>
            </div>
          ))}

          {tickets.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400 bg-[#F1F1EE] dark:bg-[#1C1A1E] rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
              No passes in vault yet. RSVP to events, book movies, or accept date invites to sync here!
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
