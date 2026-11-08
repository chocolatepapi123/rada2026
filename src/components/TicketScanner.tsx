import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Keyboard, XCircle, X } from 'lucide-react';
import jsQR from 'jsqr';
import { checkInTicket, type CheckInResult } from '../lib/ticketsBuyer';

/** Host door scanner. Scans a ticket QR with the camera, or accepts a typed code. */
export const TicketScanner: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const video = useRef<HTMLVideoElement>(null);
  const [res, setRes] = useState<(CheckInResult & { error?: string }) | null>(null);
  const [camErr, setCamErr] = useState('');
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState('');
  const busy = useRef(false);
  const last = useRef({ text: '', at: 0 });

  const submit = async (text: string) => {
    if (busy.current) return;
    busy.current = true;
    try { setRes(await checkInTicket(text)); }
    catch (e: any) { setRes({ result: 'invalid', error: e?.message || 'Could not check this ticket.' }); }
    finally { setTimeout(() => { busy.current = false; }, 1500); }
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (stopped || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const tick = () => {
          const v = video.current;
          if (stopped || !v || !ctx) return;
          if (v.readyState === v.HAVE_ENOUGH_DATA && !busy.current) {
            canvas.width = v.videoWidth; canvas.height = v.videoHeight;
            ctx.drawImage(v, 0, 0);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
            if (hit?.data && (hit.data !== last.current.text || Date.now() - last.current.at > 4000)) {
              last.current = { text: hit.data, at: Date.now() };
              submit(hit.data);
            }
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setCamErr('The camera is not available. Allow camera access, or type the ticket code instead.');
        setManual(true);
      }
    })();

    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const ok = res?.result === 'ok';
  const label =
    res?.result === 'ok' ? 'Let them in'
    : res?.result === 'already_used' ? 'Already checked in'
    : res?.result === 'not_allowed' ? 'Not your event'
    : 'Invalid ticket';

  return (
    <div className="fixed inset-0 z-[220] bg-black text-white flex flex-col" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between p-4">
        <p className="font-extrabold">Check in guests</p>
        <div className="flex gap-1">
          <button onClick={() => setManual((m) => !m)} aria-label="Type a code" className="p-2 rounded-full bg-white/10"><Keyboard className="w-5 h-5" /></button>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-white/10"><X className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0">
        <video ref={video} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        {!camErr && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-64 h-64 rounded-3xl border-4 border-white/70" /></div>}
        {camErr && <p className="absolute inset-x-6 top-10 text-center text-sm text-white/80">{camErr}</p>}

        {res && (
          <div className={`absolute inset-x-4 bottom-6 rounded-3xl p-5 text-center shadow-xl ${ok ? 'bg-emerald-600' : res.result === 'already_used' ? 'bg-amber-600' : 'bg-red-600'}`}>
            {ok ? <CheckCircle2 className="w-9 h-9 mx-auto" /> : <XCircle className="w-9 h-9 mx-auto" />}
            <p className="text-xl font-extrabold mt-1">{label}</p>
            {res.name && <p className="text-sm opacity-90">{res.name}{res.type ? ` · ${res.type}` : ''}</p>}
            {res.result === 'already_used' && res.checked_in_at && <p className="text-xs opacity-90">at {new Date(res.checked_in_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}</p>}
            {res.error && <p className="text-xs opacity-90">{res.error}</p>}
            <button onClick={() => setRes(null)} className="mt-3 w-full rounded-2xl bg-white/20 py-2.5 font-bold">Scan next</button>
          </div>
        )}
      </div>

      {manual && (
        <div className="p-4 flex gap-2 bg-black">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Paste or type ticket code" autoCapitalize="off"
            className="flex-1 min-w-0 rounded-xl bg-white/10 px-3 py-2.5 text-sm outline-none" />
          <button onClick={() => { if (code.trim()) { submit(code.trim()); setCode(''); } }} className="px-4 rounded-xl bg-white text-black font-bold text-sm">Check</button>
        </div>
      )}
    </div>
  );
};

export default TicketScanner;
