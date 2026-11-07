## AI Copilot MVP

Open /copilot for zone analysis with OpenAI, or an explicitly labeled rules-only demo. Start with [AI_MVP.md](AI_MVP.md).

# RUAIX · prototype (RUAIX)

A clickable, end‑to‑end prototype of AI‑assisted cleanroom HVAC control for pharmaceutical plants.

The prototype replays a **simulated 28‑day pilot**: one fictional plant with 8 zones and 20 AHUs. The first 14 days run in Shadow mode, the last 14 in Advisory mode. Every number comes from `RUAIX_dataset_v1`; none of it is a real plant result.

## What judges can try in 5 minutes

1. **Home (`/`)**: pick a role (QA pharmacist, HVAC engineer, CFO or auditor). The app opens on that role's starting page.
2. **Command center (`/dashboard`)**: drag the **Replay** slider, or jump straight to an event:
   * the A3 humidity excursion in heavy rain,
   * the lost edge–BMS link,
   * the quarantined B3 sensor,
   * the airlock interlock failure.

   The zone plan, KPIs and "Needs your attention" all update to that moment.
3. **Zone (`/zones/A1`)**: shows RH and ΔP against limits, the forecast made 30 minutes earlier with its 80% band, and *why* the safety gate decided Pass, Review or Hold.
4. **Approvals (`/approvals`)**: as QA, approve or reject with an e‑signature (demo PIN **2468**). Your signature becomes a new hash‑sealed audit record.
5. **Decision trace (`/trace`)**: follows one decision through seven steps: sensors → forecast → proposal → safety gate → signed approval → BMS command → confirmation.
   * **Verify hash chain** recomputes SHA‑256 seals in your browser, using the same canonical JSON as the backend.
   * **Try tampering** changes one value, so the next verification fails.
6. **Energy & ROI (`/energy`)**:
   * daily energy against the IPMVP baseline (R² 0.97),
   * weekly M&V with verification status,
   * the energy‑share statement,
   * a plant ROI calculator (business model v2: Rp1.67 B net per year, about 6‑month payback).
7. **Quality & CAPA**, **Audit trail** (with CSV export), **System health** (connections, calibration, data quality, model registry, latency) and **How it works**.

EN/ID language toggle and role switcher are in the top bar. Status is always shown with text, an icon and color.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

Requires Node 18.18 or newer (tested with Node 22). Versions are pinned exactly in `package.json`, including Next.js 14.2.35, React 18.3.1 and Recharts 2.15.4.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, choose **Add New → Project** and import the repository. Next.js is detected automatically, so leave all defaults and click **Deploy**.
3. Alternatively, from this folder run `npx vercel` for a preview, then `npx vercel --prod`.

AI Copilot now uses a server endpoint and OPENAI_API_KEY in .env.local. See [AI_MVP.md](AI_MVP.md) for setup, API configuration, testing and demo limitations. Replay data remains in public/data/.

## Regenerate the data

```bash
python3 scripts/build_data.py --dataset ../RUAIX_dataset_v1 --model ../model.json
```

The script reads the dataset CSVs and writes compact JSON to `public/data/`: series, gates, traces per zone, audit tail, energy, quality, system and meta.

## Structure

```
app/                 routes (App Router). (app)/ holds pages that use the shell
components/          Shell, UI primitives, charts, zone plan, gate checks, trace, e-sign dialog
lib/                 data loading & status logic, i18n (EN/ID), state store, hash-chain verification
public/data/         generated JSON (from RUAIX_dataset_v1)
scripts/             build_data.py
```

## Prototype limits

* **Data is fixed.** Data is a fixed replay, not a live connection. Approvals you sign live only in the browser session.
* **Signing is a demonstration.** The e‑signature uses a demo PIN; production needs SSO with re‑authentication (21 CFR Part 11 / EU Annex 11 style).
* **Trace sample.** Decision traces are included for all approvals, all Review/Hold decisions, the last 24 hours, and selected hours. Other decisions show the gate summary.
