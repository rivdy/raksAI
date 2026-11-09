'use client';
import { useEffect, useRef } from 'react';

/**
 * Ruang bersih 3D: wireframe dengan aliran udara laminar.
 * Udara turun dari panel HEPA di plafon, lalu berbelok ke grill return di dinding dekat lantai.
 * Canvas 2D + proyeksi perspektif sederhana, tanpa library 3D.
 *
 * Semua prop dibaca lewat ref, jadi mengubah `speed` atau warna tidak mengulang animasi.
 */
type V3 = [number, number, number];
type P = { x: number; y: number; z: number; px: number; py: number; v: number; hot: boolean };

const W = 8, D = 5.6, H = 3.2;           // ukuran ruang
const COLS = 4, ROWS = 3;                // panel HEPA di plafon
const N = 240;                            // jumlah partikel

export type AirflowProps = {
  className?: string;
  /** posisi horizontal pusat ruang (0–1) pada layar lebar */
  center?: number;
  scale?: number;
  lineAlpha?: number;
  particleAlpha?: number;
  /** warna garis dan partikel dalam format "r,g,b" */
  ink?: string;
  accent?: string;
  /** pengali kecepatan aliran udara, mis. Hz / Hz nominal */
  speed?: number;
  /** besar ayunan kamera */
  sway?: number;
  /** Hentikan gerak partikel dan kamera tanpa menghilangkan gambar. */
  paused?: boolean;
};

export default function AirflowBackdrop(props: AirflowProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const opts = useRef(props);
  opts.current = props;
  const redraw = useRef<() => void>(() => {});

  useEffect(() => { redraw.current(); });

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const o = () => {
      const p = opts.current;
      return {
        center: p.center ?? 0.5, scale: p.scale ?? 1, lineAlpha: p.lineAlpha ?? 0.16, particleAlpha: p.particleAlpha ?? 0.3,
        ink: p.ink ?? '30,33,32', accent: p.accent ?? '180,71,31', speed: p.speed ?? 1, sway: p.sway ?? 0.55,
      };
    };

    let w = 0, h = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(lastT);
    };

    // --- partikel -------------------------------------------------------
    const panelW = W / COLS, panelD = D / ROWS;
    const spawn = (p: P, anyHeight = false) => {
      const c = Math.floor(Math.random() * COLS), r = Math.floor(Math.random() * ROWS);
      p.x = -W / 2 + panelW * (c + 0.12 + Math.random() * 0.76);
      p.z = -D / 2 + panelD * (r + 0.12 + Math.random() * 0.76);
      p.y = anyHeight ? Math.random() * H : H - 0.02;
      p.px = p.x; p.py = p.y;
      p.v = 0.55 + Math.random() * 0.25;
      p.hot = Math.random() < 0.14;
    };
    const parts: P[] = Array.from({ length: N }, () => { const p = { x: 0, y: 0, z: 0, px: 0, py: 0, v: 0, hot: false }; spawn(p, true); return p; });

    const step = (dt: number) => {
      const s = o().speed;
      for (const p of parts) {
        p.px = p.x; p.py = p.y;
        const side = p.x >= 0 ? 1 : -1;
        // Di atas ~0,9 m aliran hampir vertikal; di bawahnya ditarik ke dinding samping (grill return).
        const low = Math.max(0, 1 - p.y / 0.9);
        p.y -= p.v * s * dt * (1 - low * 0.75);
        p.x += side * p.v * s * dt * low * 2.2;
        if (p.y <= 0.12 || Math.abs(p.x) >= W / 2 - 0.02) spawn(p);
      }
    };

    // --- kamera & proyeksi -----------------------------------------------
    let yaw = 0, pitch = 0.42, mx = 0, my = 0;
    let cfg = o();
    const proj = ([x, y, z]: V3): [number, number, number] => {
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const x1 = cy * x - sy * z, z1 = sy * x + cy * z;
      const yy = y - H / 2;
      const cp = Math.cos(pitch), sp = Math.sin(pitch);
      const y2 = cp * yy - sp * z1, z2 = sp * yy + cp * z1 + 12.5;
      const f = Math.min(w, h * 1.6) * 1.05 * cfg.scale;
      const cx = w < 920 ? 0.5 : cfg.center; // layar sempit: selalu di tengah
      return [w * cx + (f * x1) / z2, h * 0.5 - (f * y2) / z2, z2];
    };
    const line = (a: V3, b: V3) => { const p = proj(a), q = proj(b); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
    const rect = (pts: V3[]) => { for (let i = 0; i < pts.length; i++) line(pts[i], pts[(i + 1) % pts.length]); };

    const draw = (t: number) => {
      cfg = o();
      const ink = (a: number) => `rgba(${cfg.ink},${a})`;
      const la = cfg.lineAlpha;
      yaw = Math.sin(t * 0.00006) * cfg.sway - 0.35 + mx * 0.08;
      pitch = 0.42 + my * 0.04;
      ctx.clearRect(0, 0, w, h);
      const x0 = -W / 2, x1 = W / 2, z0 = -D / 2, z1 = D / 2;

      // lantai: ubin
      ctx.beginPath(); ctx.strokeStyle = ink(la * 0.45); ctx.lineWidth = 1;
      for (let i = 1; i < 8; i++) { const x = x0 + (W / 8) * i; line([x, 0, z0], [x, 0, z1]); }
      for (let i = 1; i < 6; i++) { const z = z0 + (D / 6) * i; line([x0, 0, z], [x1, 0, z]); }
      ctx.stroke();

      // kerangka ruang
      ctx.beginPath(); ctx.strokeStyle = ink(la);
      rect([[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1]]);
      rect([[x0, H, z0], [x1, H, z0], [x1, H, z1], [x0, H, z1]]);
      for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] as const) line([x, 0, z], [x, H, z]);
      ctx.stroke();

      // panel HEPA di plafon
      ctx.beginPath(); ctx.strokeStyle = ink(la * 0.85);
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
        const ax = x0 + panelW * (c + 0.1), bx = x0 + panelW * (c + 0.9);
        const az = z0 + panelD * (r + 0.1), bz = z0 + panelD * (r + 0.9);
        rect([[ax, H, az], [bx, H, az], [bx, H, bz], [ax, H, bz]]);
      }
      ctx.stroke();

      // grill return di dinding kiri & kanan, dekat lantai
      ctx.beginPath(); ctx.strokeStyle = ink(la * 1.1);
      for (const x of [x0, x1]) for (const zc of [-1.6, 0, 1.6]) {
        rect([[x, 0.12, zc - 0.45], [x, 0.12, zc + 0.45], [x, 0.5, zc + 0.45], [x, 0.5, zc - 0.45]]);
        for (let k = 1; k < 4; k++) { const y = 0.12 + 0.095 * k; line([x, y, zc - 0.4], [x, y, zc + 0.4]); }
      }
      ctx.stroke();

      // aliran udara: garis pendek searah gerak, panjang ekor ikut kecepatan
      ctx.lineCap = 'round';
      const tail = 0.12 + 0.1 * Math.min(2, cfg.speed);
      for (const p of parts) {
        let dx = p.x - p.px, dy = p.y - p.py;
        const len = Math.hypot(dx, dy);
        if (len < 1e-6) { dx = 0; dy = -1; } else { dx /= len; dy /= len; }
        const a = proj([p.x, p.y, p.z]);
        const b = proj([p.x - dx * tail, p.y - dy * tail, p.z]);
        const depth = Math.max(0.25, Math.min(1, 15 / a[2] - 0.55));
        ctx.beginPath();
        ctx.strokeStyle = p.hot ? `rgba(${cfg.accent},${Math.min(1, cfg.particleAlpha * 2) * depth})` : ink(cfg.particleAlpha * depth);
        ctx.lineWidth = p.hot ? 1.4 : 1;
        ctx.moveTo(b[0], b[1]); ctx.lineTo(a[0], a[1]); ctx.stroke();
      }
    };

    // --- loop ---------------------------------------------------------------
    let raf = 0, last = 0, lastT = 0, visible = true;
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t; lastT = t;
      step(dt); draw(t);
      raf = requestAnimationFrame(loop);
    };
    const start = () => { if (!raf && !reduce && !opts.current.paused && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    // mode gerak dikurangi: gambar ulang hanya saat prop berubah
    redraw.current = () => {
      if (reduce || opts.current.paused) { stop(); draw(lastT); }
      else start();
    };

    for (let i = 0; i < 200; i++) step(0.03); // isi ruang dulu agar frame pertama tidak kosong
    const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); });
    io.observe(canvas);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    const onMove = (e: PointerEvent) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; };
    window.addEventListener('pointermove', onMove, { passive: true });
    start();

    return () => { stop(); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pointermove', onMove); };
  }, []);

  return <canvas ref={ref} aria-hidden className={props.className} />;
}
