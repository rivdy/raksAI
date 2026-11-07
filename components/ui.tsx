'use client';
import clsx from 'clsx';
import { CircleCheck, CirclePause, OctagonX, Eye, Hand, RefreshCw, Loader2 } from 'lucide-react';
import type { Decision, Mode } from '@/lib/data';
import { useStore } from '@/lib/store';

export function Card({ className, children, as: As = 'section', ...rest }: any) {
  return <As className={clsx('rounded-xl bg-white shadow-card', className)} {...rest}>{children}</As>;
}
export function CardHead({ title, sub, right }: { title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
      <div>
        <h2 className="text-[15px] font-semibold leading-tight">{title}</h2>
        {sub && <p className="mt-1 text-[13px] text-steel">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

const ST = {
  LULUS: { cls: 'bg-pass-bg text-pass-ink ring-pass/30', icon: CircleCheck },
  TINJAU: { cls: 'bg-review-bg text-review-ink ring-review/40', icon: CirclePause },
  TAHAN: { cls: 'bg-hold-bg text-hold-ink ring-hold/30', icon: OctagonX },
};
export function StatusBadge({ s, size = 'md', className }: { s: Decision; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const { t } = useStore();
  const { cls, icon: Icon } = ST[s];
  return (
    <span role="status" aria-label={t(`status_${s}` as any)}
      className={clsx('inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset', cls,
        size === 'sm' && 'px-2 py-0.5 text-[11.5px]', size === 'md' && 'px-2.5 py-1 text-[12.5px]', size === 'lg' && 'px-3 py-1.5 text-sm', className)}>
      <Icon aria-hidden className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />{t(`status_${s}` as any)}
    </span>
  );
}
const MD: Record<string, { cls: string; icon: any }> = {
  SHADOW: { cls: 'bg-mist text-steel', icon: Eye }, ADVISORY: { cls: 'bg-teal-50 text-teal', icon: Hand },
  BMS_FALLBACK: { cls: 'bg-review-bg text-review-ink', icon: RefreshCw }, SEMI_AUTO: { cls: 'bg-info-bg text-info', icon: Hand }, FULL_AUTO: { cls: 'bg-info-bg text-info', icon: Hand },
};
export function ModeChip({ m, className }: { m: Mode; className?: string }) {
  const { t } = useStore();
  const { cls, icon: Icon } = MD[m];
  return <span className={clsx('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-medium', cls, className)}><Icon aria-hidden className="h-3.5 w-3.5" />{t(`mode_${m}` as any)}</span>;
}
export function Stat({ label, value, unit, sub, tone }: { label: string; value: React.ReactNode; unit?: string; sub?: React.ReactNode; tone?: 'teal' | 'hold' | 'review' | 'ink' }) {
  return (
    <div className="min-w-0">
      <div className="text-[12.5px] text-steel">{label}</div>
      <div className={clsx('mt-1 flex items-baseline gap-1 num text-[26px] font-semibold leading-none', tone === 'teal' && 'text-teal', tone === 'hold' && 'text-hold', tone === 'review' && 'text-review-ink')}>
        {value}{unit && <span className="text-[14px] font-medium text-steel">{unit}</span>}
      </div>
      {sub && <div className="mt-1.5 text-[12px] text-steel">{sub}</div>}
    </div>
  );
}
export function Button({ variant = 'primary', className, ...rest }: any) {
  return (
    <button className={clsx('inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-[13.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
      variant === 'primary' && 'bg-teal text-white hover:bg-teal-600', variant === 'ghost' && 'bg-white text-ink ring-1 ring-line hover:bg-mist',
      variant === 'danger' && 'bg-white text-hold ring-1 ring-hold/40 hover:bg-hold-bg', variant === 'dark' && 'bg-ink text-white hover:bg-ink-2', className)} {...rest} />
  );
}
export function Loading() {
  const { t } = useStore();
  return <div className="flex items-center gap-2 p-8 text-steel"><Loader2 className="h-4 w-4 animate-spin" />{t('loading')}</div>;
}
export function ErrorNote({ msg }: { msg: string }) {
  const { t } = useStore();
  return <div className="m-6 rounded-lg bg-hold-bg p-4 text-hold-ink">{t('load_error')} <span className="opacity-70">({msg})</span></div>;
}
export function PageHead({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.01em]">{title}</h1>
        {sub && <p className="mt-1 max-w-[70ch] text-[14px] text-steel">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
export function Kv({ k, v, mono }: { k: string; v: React.ReactNode; mono?: boolean }) {
  return <div className="flex justify-between gap-3 py-1.5 text-[13px]"><span className="text-steel">{k}</span><span className={clsx('text-right font-medium num', mono && 'break-all text-[12px]')}>{v}</span></div>;
}
