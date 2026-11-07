'use client';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { translate, type Lang, type TKey } from './i18n';
import type { AuditEvent, Persona } from './data';

export interface LocalDecision { approvalId: string; decision: 'APPROVED' | 'REJECTED'; comment: string | null; at: string; by: string; esigHash: string }
interface Ctx {
  lang: Lang; setLang: (l: Lang) => void; t: (k: TKey, v?: Record<string, string>) => string;
  persona: Persona | null; setPersona: (p: Persona) => void;
  replayK: number | null; setReplayK: (k: number | null) => void;
  decisions: Record<string, LocalDecision>; addDecision: (d: LocalDecision) => void;
  localAudit: AuditEvent[]; addAudit: (e: AuditEvent) => void;
  toast: string | null; showToast: (s: string) => void;
}
const C = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');
  const [persona, setPersona] = useState<Persona | null>(null);
  const [replayK, setReplayK] = useState<number | null>(null);
  const [decisions, setDecisions] = useState<Record<string, LocalDecision>>({});
  const [localAudit, setLocalAudit] = useState<AuditEvent[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const t = useCallback((k: TKey, v?: Record<string, string>) => translate(lang, k, v), [lang]);
  const showToast = useCallback((s: string) => { setToast(s); window.setTimeout(() => setToast(null), 4200); }, []);
  const value = useMemo<Ctx>(() => ({
    lang, setLang, t, persona, setPersona, replayK, setReplayK, decisions,
    addDecision: (d) => setDecisions((x) => ({ ...x, [d.approvalId]: d })),
    localAudit, addAudit: (e) => setLocalAudit((x) => [...x, e]), toast, showToast,
  }), [lang, t, persona, replayK, decisions, localAudit, toast, showToast]);
  return <C.Provider value={value}>{children}</C.Provider>;
}
export function useStore() {
  const c = useContext(C);
  if (!c) throw new Error('useStore outside provider');
  return c;
}
