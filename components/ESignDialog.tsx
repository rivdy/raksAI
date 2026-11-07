'use client';
import { useEffect, useRef, useState } from 'react';
import { Fingerprint, X } from 'lucide-react';
import { Button } from './ui';
import { useStore } from '@/lib/store';

export default function ESignDialog({ decision, title, onClose, onSigned }: { decision: 'APPROVED' | 'REJECTED'; title: string; onClose: () => void; onSigned: (comment: string | null) => Promise<void> }) {
  const { t, persona } = useStore();
  const [pin, setPin] = useState(''); const [comment, setComment] = useState(''); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (decision === 'REJECTED' && !comment.trim()) return setErr(t('reason_required'));
    if (pin !== '2468') return setErr(t('pin_wrong'));
    setBusy(true); await onSigned(comment.trim() || null); setBusy(false);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal aria-labelledby="esig-title">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <form onSubmit={submit} className="rise relative w-full max-w-[460px] rounded-2xl bg-white p-6 shadow-pop">
        <button type="button" onClick={onClose} aria-label={t('cancel')} className="absolute right-4 top-4 text-steel"><X className="h-5 w-5" /></button>
        <div className="flex items-center gap-2 text-teal"><Fingerprint className="h-5 w-5" /><h2 id="esig-title" className="text-[17px] font-semibold text-ink">{t('esig_title')}</h2></div>
        <p className="mt-1 text-[13px] text-steel">{title}</p>
        <p className="mt-4 rounded-lg bg-mist p-3 text-[13.5px]">{t(decision === 'APPROVED' ? 'esig_meaning_APPROVED' : 'esig_meaning_REJECTED')}</p>
        <div className="mt-4 text-[13px]"><span className="text-steel">Signer: </span><b>{persona?.full_name}</b> · {persona?.role}</div>
        {decision === 'REJECTED' && (
          <label className="mt-4 block text-[13px] font-medium">{t('esig_reason')}
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border border-line p-2 text-[13.5px]" />
          </label>
        )}
        <label className="mt-4 block text-[13px] font-medium">{t('esig_pin')}
          <input ref={ref} value={pin} onChange={(e) => { setPin(e.target.value); setErr(null); }} type="password" inputMode="numeric" autoComplete="off"
            className="mt-1 w-full rounded-lg border border-line p-2 text-[15px] tracking-[0.3em]" aria-describedby="pin-hint" />
          <span id="pin-hint" className="mt-1 block text-[12px] text-steel">{t('esig_hint')}</span>
        </label>
        {err && <p role="alert" className="mt-3 text-[13px] font-medium text-hold">{err}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>{t('cancel')}</Button>
          <Button type="submit" variant={decision === 'REJECTED' ? 'danger' : 'primary'} disabled={busy}>{t(decision === 'APPROVED' ? 'esig_sign' : 'esig_sign_reject')}</Button>
        </div>
      </form>
    </div>
  );
}
