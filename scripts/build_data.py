#!/usr/bin/env python3
"""Build compact JSON for the prototype from RUAIX_dataset_v1.
Usage: python3 scripts/build_data.py --dataset ../RUAIX_dataset_v1 --model ../model.json"""
import argparse, json, os, glob
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

ap = argparse.ArgumentParser()
ap.add_argument('--dataset', default=os.path.join(os.path.dirname(__file__), '..', '..', 'RUAIX_dataset_v1'))
ap.add_argument('--model', default=os.path.join(os.path.dirname(__file__), 'model.json'))
ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), '..', 'public', 'data'))
a = ap.parse_args()
D, OUT = a.dataset, a.out
os.makedirs(os.path.join(OUT, 'traces'), exist_ok=True)
rd = lambda p: pd.read_csv(os.path.join(D, p), keep_default_na=True)
cfg = json.load(open(os.path.join(D, '08_simulation', 'sim_config.json')))
START = datetime.fromisoformat(cfg['start_local'])
STEP = timedelta(minutes=cfg['step_minutes'])
N = cfg['days'] * 96
SNAP = datetime.fromisoformat(cfg['snapshot_local'])
K_SNAP = int((SNAP - START) / STEP)
K_ADV = int((datetime.fromisoformat(cfg['advisory_start_local']) - START) / STEP)


def kof(s):
    return int((datetime.fromisoformat(str(s)[:19]) - START) / STEP)


def r2(x, n=2):
    return None if x is None or (isinstance(x, float) and np.isnan(x)) else round(float(x), n)


def clean(o):
    if isinstance(o, float):
        return None if (np.isnan(o) or np.isinf(o)) else o
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [clean(v) for v in o]
    if hasattr(o, 'item'):
        return clean(o.item())
    return o


def W(name, obj):
    obj = clean(obj)
    with open(os.path.join(OUT, name), 'w') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'), allow_nan=False, default=str)
    print(name, os.path.getsize(os.path.join(OUT, name)) // 1024, 'KB')


zones_df = rd('01_master/zones.csv'); zp = rd('01_master/zone_profiles.csv'); zl = rd('01_master/zone_limits.csv')
zcode = dict(zip(zp.zone_id, zp.zone_code))
users = rd('01_master/users.csv'); mem = rd('01_master/tenant_memberships.csv')
uname = dict(zip(users.id, users.full_name)); urole = dict(zip(mem.user_id, mem.role_code))
NAMES_EN = {'A1': 'Granulation', 'A2': 'Tablet compression', 'A3': 'Film coating', 'A4': 'Personnel airlock', 'B1': 'Primary packaging',
            'B2': 'Raw material store', 'B3': 'Dispensing', 'B4': 'QC microbiology lab'}
zones = []
for z in cfg['zones']:
    zones.append(dict(code=z['code'], name_id=z['name'].split(' ', 1)[1], name_en=NAMES_EN[z['code']], cls=z['cls'].split(' (')[0],
                      iso=z['cls'].split('(')[1].rstrip(')') if '(' in z['cls'] else '', rh=z['rh'], dp=z['dp'], t=z['t'], ahus=cfg['ahu_by_zone'][z['code']],
                      hz_b=z['hz_b'], hz_min=z['hz_min'], row=z['row'], col=z['col'], sched=z['sched'], building='OSD' if z['bld'] == 'bOSD' else 'WQ'))
reasons = rd('01_master/reason_codes.csv')
EN = {
    'DQ_STALE_DATA': ('Sensor data is late', 'Data from the BMS did not arrive on time, so the proposal cannot be assessed.', 'Check the edge–BMS link. The zone stays on BMS control.'),
    'DQ_SENSOR_QUARANTINED': ('Sensor quarantined', 'A critical sensor is quarantined because of drift or failure.', 'Recalibrate or replace the sensor, then record it.'),
    'DQ_INVALID_INPUT': ('Invalid sensor value', 'A sensor value is outside the physically possible range.', 'Inspect the sensor and wiring.'),
    'DQ_SUSPECT_INPUT': ('Sensor data looks suspect', 'A critical sensor is flagged as suspect, for example early drift.', 'QA decides whether calibration is needed.'),
    'CBF_LIMIT_BREACHED': ('Already outside limits', 'RH or ΔP is already outside the zone limits.', 'Handle the deviation per SOP. No saving is applied.'),
    'PRED_LIMIT_BREACH': ('Forecast crosses a limit', 'The worst case in the next 30 minutes crosses a zone limit.', 'Keep BMS control and watch the zone.'),
    'CBF_MARGIN_LOW': ('Safety margin is thin', 'Distance to the zone limit is under 1 unit after uncertainty.', 'QA or Engineering reviews before continuing.'),
    'INTERLOCK_ACTIVE': ('Interlock active', 'A door or equipment interlock alarm is active in this zone.', 'Clear the interlock alarm first.'),
    'RULE_MAINTENANCE_LOCK': ('Zone under maintenance', 'Zone equipment is inside a maintenance window.', 'Wait until maintenance is finished.'),
    'RULE_QUALIFIED_RANGE': ('Outside qualified range', 'The proposed fan speed is below the qualified range.', 'Limit the optimizer to the zone envelope.'),
    'RULE_STEP_SIZE': ('Change is too large', 'The setpoint change exceeds the step limit per proposal.', 'Split it into smaller steps.'),
    'RULE_CRITICAL_BATCH_STEP': ('Critical batch step', 'The zone is running a critical batch step, such as spray coating.', 'Wait until the critical step ends.'),
    'ALL_CHECKS_PASSED': ('All checks passed', 'The proposal is safe to send for approval under the current mode.', 'Approve in Advisory mode, or log only in Shadow mode.'),
}
RC = {}
RC_LIST = list(reasons.code)
for r in reasons.itertuples():
    t, m, act = EN[r.code]
    RC[r.code] = dict(decision=r.decision, cat=r.category, order=int(r.check_order), sev=r.severity,
                      en=dict(title=t, msg=m, action=act), id=dict(title=r.title_id, msg=r.user_message_id, action=r.recommended_action_id))
personas = json.load(open(os.path.join(D, '09_frontend', 'api_mocks', 'me_personas.json')))['personas']

# ---------------- series
sz = rd('08_simulation/sim_zone_timeseries.csv')
MODES = ['SHADOW', 'ADVISORY', 'SEMI_AUTO', 'FULL_AUTO', 'BMS_FALLBACK']
series = {}
# kualitas RH per zona dari sensor_readings
tags = rd('02_sensors/sensor_tags.csv'); sensors = rd('02_sensors/sensors.csv')
rh_tags = tags[tags.tag_code == 'rh'].merge(sensors[['id', 'zone_id', 'sensor_code']], left_on='sensor_id', right_on='id', suffixes=('', '_s'))
rh_tag_zone = {t: zcode.get(z) for t, z in zip(rh_tags.id, rh_tags.zone_id)}
qmap = {'VALID': 0, 'SUSPECT': 1, 'INVALID': 2, 'QUARANTINED': 3}
qual = {z['code']: [0] * N for z in zones}
missing = set(range(N))
for f in sorted(glob.glob(os.path.join(D, '03_telemetry', 'sensor_readings_2026-*.csv'))):
    df = pd.read_csv(f, usecols=['ts', 'tag_id', 'quality_status'])
    sub = df[df.tag_id.isin(rh_tag_zone.keys())]
    for ts, tid, q in zip(sub.ts, sub.tag_id, sub.quality_status):
        k = kof(ts)
        zc = rh_tag_zone[tid]
        if zc in qual:
            qual[zc][k] = qmap[q]
        missing.discard(k)
for z in zones:
    s = sz[sz.zone_code == z['code']].sort_values('ts')
    series[z['code']] = dict(rh=[r2(v) for v in s.rh_measured], dp=[r2(v) for v in s.dp_actual], t=[r2(v) for v in s.temp_actual],
                             hz=[r2(v, 1) for v in s.fan_hz_setpoint], sat=[r2(v, 1) for v in s.sat_setpoint_c], mode=[MODES.index(m) for m in s['mode']],
                             occ=[int(v) for v in s.occupancy_count], pred=[r2(v) for v in s.rh_pred30_p50], sd=[r2(v, 3) for v in s.rh_pred30_sd],
                             dpp=[r2(v) for v in s.dp_pred30_p50], q=qual[z['code']], crit=[1 if v else 0 for v in s.critical_step])
pe = rd('08_simulation/sim_plant_energy.csv')
plant = dict(actual=[r2(v, 1) for v in pe.total_kw_actual], baseline=[r2(v, 1) for v in pe.total_kw_baseline], opt=[r2(v, 1) for v in pe.total_kw_optimized_full],
             tout=[r2(v, 1) for v in pe.outdoor_temp_c], rhout=[r2(v, 1) for v in pe.outdoor_rh_pct], rain=[1 if v else 0 for v in pe.is_rain],
             fan=[r2(v, 1) for v in pe.fan_kw_actual], reheat=[r2(v, 1) for v in pe.reheat_kw_actual], chiller=[r2(v, 1) for v in pe.chiller_kw_actual], pump=[r2(v, 1) for v in pe.pump_kw_actual])
W('series.json', dict(zones=series, plant=plant, missing=sorted(missing)))

# ---------------- gates
gd = rd('05_safety_chain/gate_decisions.csv'); rec = rd('05_safety_chain/recommendations.csv')
recm = rec.set_index('id')
REC_ST = ['SHADOW_LOGGED', 'NO_ACTION', 'APPROVED', 'REJECTED', 'EXPIRED', 'BLOCKED', 'UNDER_REVIEW']
DEC = ['LULUS', 'TINJAU', 'TAHAN']
gates = {z['code']: dict(k=[], d=[], r=[], m=[], s=[], f=[], to=[], e=[]) for z in zones}
for g in gd.itertuples():
    zc = zcode[g.zone_id]; rr = recm.loc[g.recommendation_id]; sp = json.loads(rr.proposed_setpoint)
    G = gates[zc]
    G['k'].append(kof(g.checked_at)); G['d'].append(DEC.index(g.decision)); G['r'].append(RC_LIST.index(g.reason_code))
    G['m'].append(r2(g.cbf_margin, 3)); G['s'].append(REC_ST.index(rr.status)); G['f'].append(sp['fan_hz']['from']); G['to'].append(sp['fan_hz']['to'])
    G['e'].append(r2(rr.expected_energy_saving, 2))
W('gates.json', dict(rec_status=REC_ST, decisions=DEC, reasons=RC_LIST, zones=gates))

# ---------------- traces
inf = rd('04_ai_mlops/inference_runs.csv').set_index('id')
mv = rd('04_ai_mlops/model_versions.csv').set_index('id')
appr = rd('05_safety_chain/approval_requests.csv'); esig = rd('06_qa_audit/e_signatures.csv').set_index('id')
cmd = rd('05_safety_chain/actuation_commands.csv'); fb = rd('05_safety_chain/actuation_feedback.csv')
aud = rd('06_qa_audit/audit_events.csv')
TA = rd('01_master/tenants.csv').id.iloc[0]
audA = aud[aud.tenant_id == TA].sort_values('chain_seq')


def ev(r):
    return dict(seq=int(r.chain_seq), at=r.event_at, action=r.action, role=r.actor_role, actor=uname.get(r.actor_user_id) if isinstance(r.actor_user_id, str) else None,
                actor_user_id=r.actor_user_id if isinstance(r.actor_user_id, str) else None, entity_type=r.entity_type,
                entity_id=r.entity_id if isinstance(r.entity_id, str) else None, payload=r.event_payload, prev=r.prev_hash if isinstance(r.prev_hash, str) else None,
                hash=r.event_hash, tenant_id=r.tenant_id)


aud_by_entity = {}
for r in audA.itertuples():
    if isinstance(r.entity_id, str):
        aud_by_entity.setdefault(r.entity_id, []).append(ev(r))
appr_by_gate = {}
for r in appr.itertuples():
    appr_by_gate.setdefault(r.gate_decision_id, []).append(r)
cmd_by_gate = {}
for r in cmd.itertuples():
    cmd_by_gate.setdefault(r.gate_decision_id, []).append(r)
fb_by_cmd = {}
for r in fb.itertuples():
    fb_by_cmd.setdefault(r.command_id, []).append(r)
s3 = (kof('2026-09-15T14:00:00'), kof('2026-09-15T17:00:00'))
traces = {z['code']: {} for z in zones}
for g in gd.itertuples():
    zc = zcode[g.zone_id]; k = kof(g.checked_at)
    keep = g.id in appr_by_gate or g.decision != 'LULUS' or (K_SNAP - 96 <= k <= K_SNAP + 8) or (zc == 'A3' and s3[0] <= k <= s3[1]) or k % 96 in (24, 32, 56, 88)
    if not keep:
        continue
    rr = recm.loc[g.recommendation_id]; ii = inf.loc[rr.inference_id]
    t = dict(id=g.id, zone=zc, k=k, checked_at=g.checked_at, decision=g.decision, reason=g.reason_code, margin=r2(g.cbf_margin, 4), ruleset=g.rule_set_version,
             checks=json.loads(g.check_results), snapshot_uri=g.input_snapshot_uri,
             inference=dict(id=rr.inference_id, at=ii.executed_at, model=mv.loc[ii.model_version_id].model_name + ' ' + mv.loc[ii.model_version_id].version,
                            pred=json.loads(ii.prediction), unc=json.loads(ii.uncertainty), latency=r2(ii.inference_latency_ms, 1)),
             rec=dict(id=g.recommendation_id, at=rr.created_at, setpoint=json.loads(rr.proposed_setpoint), saving_kwh=r2(rr.expected_energy_saving, 2),
                      optimizer=rr.optimizer_version, status=rr.status),
             approvals=[], commands=[], audit=list(aud_by_entity.get(g.id, [])) + list(aud_by_entity.get(g.recommendation_id, [])))
    for ap_ in appr_by_gate.get(g.id, []):
        sig = esig.loc[ap_.signature_reference] if isinstance(ap_.signature_reference, str) else None
        t['approvals'].append(dict(id=ap_.id, role=ap_.requested_role, status=ap_.status, requested_at=ap_.requested_at,
                                   by=uname.get(ap_.approved_by) if isinstance(ap_.approved_by, str) else None, signed_at=ap_.signed_at if isinstance(ap_.signed_at, str) else None,
                                   comment=ap_.comments if isinstance(ap_.comments, str) else None,
                                   esig=dict(id=ap_.signature_reference, meaning=sig.meaning, hash=sig.signature_hash, method=sig.auth_method) if sig is not None else None))
        t['audit'] += aud_by_entity.get(ap_.id, [])
    for c in cmd_by_gate.get(g.id, []):
        t['commands'].append(dict(id=c.id, status=c.status, sent_at=c.sent_at, ack_at=c.acknowledged_at if isinstance(c.acknowledged_at, str) else None,
                                  payload=json.loads(c.command_payload), result=json.loads(c.result_payload) if isinstance(c.result_payload, str) else None,
                                  correlation_id=c.correlation_id,
                                  feedback=[dict(at=f.feedback_at, result=f.result, state=json.loads(f.actual_state) if isinstance(f.actual_state, str) else None,
                                                 error=f.error_code if isinstance(f.error_code, str) else None) for f in fb_by_cmd.get(c.id, [])]))
        t['audit'] += aud_by_entity.get(c.id, [])
    t['audit'] = sorted({e['seq']: e for e in t['audit']}.values(), key=lambda e: e['seq'])
    traces[zc][str(k)] = t
for zc, tr in traces.items():
    W(f'traces/{zc}.json', tr)

# ---------------- audit (tail) & approvals at snapshot
snap_iso = SNAP.strftime('%Y-%m-%dT%H:%M:%S') + '+07:00'
tail = audA[audA.event_at <= snap_iso].tail(400)
W('audit.json', dict(events=[ev(r) for r in tail.itertuples()]))
appr['res'] = appr.apply(lambda r: r.signed_at if r.status in ('APPROVED', 'REJECTED') else (datetime.fromisoformat(r.requested_at[:19]) + timedelta(minutes=30)).strftime('%Y-%m-%dT%H:%M:%S') + '+07:00', axis=1)
gate_by_id = gd.set_index('id')
pending = appr[(appr.requested_at <= snap_iso) & (appr.res > snap_iso)]
recent = appr[(appr.res <= snap_iso) & (appr.status.isin(['APPROVED', 'REJECTED']))].sort_values('res').tail(30)


def appr_ctx(r, as_pending):
    g = gate_by_id.loc[r.gate_decision_id]; zc = zcode[g.zone_id]; k = kof(g.checked_at)
    return dict(id=r.id, zone=zc, k=k, gate_id=r.gate_decision_id, role=r.requested_role, status='PENDING' if as_pending else r.status, requested_at=r.requested_at,
                by=None if as_pending else uname.get(r.approved_by), signed_at=None if as_pending else r.signed_at,
                comment=None if as_pending else (r.comments if isinstance(r.comments, str) else None))


W('approvals.json', dict(snapshot_k=K_SNAP, pending=[appr_ctx(r, True) for r in pending.itertuples()],
                         recent=[appr_ctx(r, False) for r in recent.itertuples()][::-1]))

# ---------------- energy & business
kd = rd('09_frontend/aggregates/kpi_daily_site.csv'); sc = rd('07_energy_commercial/savings_calculations.csv')
eb = rd('07_energy_commercial/energy_baselines.csv'); es = rd('07_energy_commercial/energy_share_statements.csv')
M = json.load(open(a.model))
summ = json.load(open(os.path.join(D, '08_simulation', 'sim_summary.json')))
W('energy.json', dict(daily=kd.where(kd.notna(), None).to_dict('records'), weekly=sc.where(sc.notna(), None).to_dict('records'),
                      baseline=dict(eb.iloc[0].where(eb.iloc[0].notna(), None).to_dict(), adj=json.loads(eb.iloc[0].adjustment_conditions)),
                      share=es.where(es.notna(), None).to_dict('records'), sim=summ['energy'],
                      model=dict(A=M['A'], net=M['net'], gross=M['gross'], cust_cost=M['cust_cost'], payback_m=M['payback_m'], multiple=M['multiple'],
                                 save_rp=M['save_rp'], share=M['share'], recurring=M['recurring'], upfront=M['upfront'], co2_save=M['co2_save'])))

# ---------------- quality
dev = rd('06_qa_audit/deviations.csv'); capa = rd('06_qa_audit/capa_cases.csv'); apqr = rd('06_qa_audit/apqr_runs.csv'); zd = rd('09_frontend/aggregates/zone_daily.csv')
DEV_EN = {'DEV-2026-031': 'Zone A3 film coating reached 55.6–55.9 %RH and ΔP 8.6–9.1 Pa for about 30 minutes during heavy rain; door D-A3-1 did not close fully. This happened in Shadow mode (static BMS control); the AI logged HOLD and forecast the excursion.',
          'DEV-2026-033': 'Transmitter RHT-B3 drifted +1.7 to +2.9 %RH. Impact assessment: actual RH (AHU estimate and model) stayed within limits; no batch affected.',
          'DEV-2026-034': 'Airlock A4 ΔP dropped to 4.1–4.6 Pa (minimum 5 Pa) because the door interlock failed and both doors opened together. Investigation in progress.'}
CAPA_EN = {'DEV-2026-031': dict(root='Door closer on D-A3-1 worn, so the door did not close fully.', ca=['Replace door closer D-A3-1 (WO-2026-1102)', 'Verify ΔP and RH for 3 days after repair'],
                                pa=['Add a door-open > 60 s alarm in the BMS', 'Send RUAIX excursion forecasts to QA']),
           'DEV-2026-033': dict(root='Capacitive RH sensor drift in a high-dust area (as found +2.9 %RH).', ca=['Recalibrate RHT-B3 (done 1 Oct)'],
                                pa=['Calibration interval for RH transmitters in dispensing: 6 → 3 months', 'Add a redundant RH sensor in B3', 'Automatic drift rule in data-quality-svc']),
           'DEV-2026-034': dict(root='Hypothesis (AI draft): relay of airlock door interlock IL-A4-DOORS failed.', ca=['Replace interlock relay (proposed)', 'Daily interlock function test for 7 days (proposed)'],
                                pa=['Add interlock test to monthly preventive maintenance (proposed)'])}
devs = []
for d in dev.itertuples():
    c = capa[capa.deviation_id == d.id].iloc[0]
    rc = json.loads(c.root_cause)
    devs.append(dict(code=d.deviation_code, zone=zcode[d.zone_id], type=d.deviation_type, severity=d.severity, detected_at=d.detected_at, status=d.status,
                     desc_id=d.description, desc_en=DEV_EN[d.deviation_code], gate_k=kof(gate_by_id.loc[d.source_gate_decision_id].checked_at) if isinstance(d.source_gate_decision_id, str) else None,
                     capa=dict(status=c.status, due=c.due_at, owner=uname.get(c.owner_user_id), approved_by=uname.get(c.qa_approved_by) if isinstance(c.qa_approved_by, str) else None,
                               closed_at=c.closed_at if isinstance(c.closed_at, str) else None, ai_draft=bool(rc.get('ai_prefilled')), root_id=rc, ca_id=json.loads(c.corrective_action),
                               pa_id=json.loads(c.preventive_action), en=CAPA_EN[d.deviation_code])))
W('quality.json', dict(deviations=devs, apqr=json.loads(apqr.iloc[0].metrics), apqr_status=apqr.iloc[0].status,
                       zone_daily=zd.to_dict('records')))

# ---------------- EN text for Indonesian dataset strings
CONN_EN = {'BMS OPC UA (baca tag)': 'BMS OPC UA (tag reading)', 'Actuation adapter ke BMS (setpoint terbatas)': 'Actuation adapter to BMS (restricted setpoints)',
           'Chiller plant BACnet': 'Chiller plant BACnet', 'Power meter Modbus TCP': 'Power meter Modbus TCP', 'Edge ke cloud (MQTT TLS, satu arah)': 'Edge to cloud (MQTT TLS, one way)',
           'Feed cuaca (HTTPS)': 'Weather feed (HTTPS)'}
DQ_EN = {'freshness': 'Link restored 02:41:05; the historian buffer back-filled available data; 2 intervals stay empty and flagged.',
         'missing_bms': 'Gap left empty (not imputed) under the data-integrity rule.', 'missing_wx': 'Weather feed restored 14:55. Features use the last value for up to 2 h (limited forward-fill, flagged).',
         'drift1': 'Marked SUSPECT; QA notified. Followed by quarantine at 13:20.', 'drift2': 'Recalibrated 1 Oct 10:00 (as found +2.9 %RH, as left +0.1 %RH); quarantine released 10:15.',
         'range': 'Single invalid value (transmitter communication glitch). The next value was normal.', 'timestamp': 'Edge NTP sync fixed at 10:48.',
         'duplicate': 'Buffer replay after a broker restart; duplicates dropped by the idempotency key (tag_id, ts).', 'spike': 'Single spike, back to normal in the next interval.'}
SCN_EN = {'S01': ('Shadow period', 'All recommendations are logged only; no approvals or commands.'), 'S02': ('Optimizer 0.9 proposes changes during spray coating', 'Gate Review (critical batch step); version 1.0.0 holds proposals instead.'),
          'S03': ('A3 door not fully closed during heavy rain', 'Gate Hold (forecast breach, then limit breached); deviation DEV-2026-031 and CAPA closed 30 Sep.'),
          'S04': ('Advisory period', 'Approval → command → feedback; energy down about 33% (simulated).'), 'S05': ('BMS schedule reset at production start', 'BMS returns to static setpoints; new proposals need approval again.'),
          'S06': ('BMS command timeout', 'One command FAILED (BMS_TIMEOUT) and retried 2 minutes later.'), 'S07': ('Edge–BMS link lost', 'Site falls back to static BMS; data gap kept empty; no inference for 2 intervals.'),
          'S08': ('Sensor RHT-B3 drift', 'Suspect → quarantined → zone fallback → recalibration → valid again.'), 'S09': ('Manual rollback by QA', 'Command ROLLED_BACK; further A1 approvals rejected until 22:00.'),
          'S10': ('AHU-09 maintenance', 'Gate Hold (maintenance lock); zone on BMS control.'), 'S11': ('Airlock interlock failure', 'Gate Hold (interlock); deviation DEV-2026-034 open with an AI-drafted CAPA.'),
          'S12': ('Invalid ΔP value', 'Reading marked INVALID; range event logged.'), 'S13': ('Edge clock 40 s off', 'Timestamp event logged.'), 'S14': ('Weather feed down for 2 h', 'Missing-data event; limited forward-fill.'),
          'S15': ('Random particle spikes', 'Readings marked SUSPECT; spike events logged.'), 'S16': ('Tenant B for isolation tests', 'Tenant A users cannot see tenant B rows (RLS).')}
COMMENT_EN = {'Batch kritikal sedang berjalan, tunda perubahan.': 'Critical batch running, postpone the change.', 'Tunggu konfirmasi supervisor produksi.': 'Wait for production supervisor confirmation.',
              'Cuaca hujan, pertahankan setpoint BMS.': 'Rainy weather, keep the BMS setpoint.', 'Ada inspeksi internal di zona ini.': 'Internal inspection in this zone.',
              'Ditahan setelah rollback, menunggu investigasi.': 'Held after rollback, pending investigation.', 'Kedaluwarsa: diganti usulan berikutnya.': 'Expired: superseded by the next proposal.',
              'Ditinjau QA: aman untuk dilanjutkan.': 'Reviewed by QA: safe to continue.'}

# ---------------- system
con = rd('01_master/integration_connections.csv'); edge = rd('01_master/edge_devices.csv'); cal = rd('02_sensors/sensor_calibrations.csv')
dq = rd('03_telemetry/data_quality_events.csv'); dep = rd('04_ai_mlops/model_deployments.csv'); mvs = rd('04_ai_mlops/model_versions.csv')
sA = rd('01_master/sites.csv').id.iloc[0]
calA = cal.merge(sensors[['id', 'sensor_code', 'sensor_type', 'zone_id', 'site_id']], left_on='sensor_id', right_on='id', suffixes=('', '_s'))
calA = calA[calA.site_id == sA].sort_values('calibrated_at').groupby('sensor_code').tail(1)
tagq = {}
W('system.json', dict(
    connections=con[con.site_id == sA][['connection_name', 'protocol', 'direction', 'status', 'last_seen_at']].to_dict('records'),
    edge=edge[['device_code', 'device_role', 'hardware', 'os_version', 'location', 'status']].to_dict('records'),
    sensors=[dict(code=r.sensor_code, type=r.sensor_type, zone=zcode.get(r.zone_id) if isinstance(r.zone_id, str) else None, calibrated_at=r.calibrated_at, due_at=r.due_at, result=r.result)
             for r in calA.itertuples()],
    dq=[dict(at=r.detected_at, check=r.check_type, resolution_en=DQ_EN['drift1' if (r.check_type=='drift' and 'SUSPECT' in r.resolution) else 'drift2' if r.check_type=='drift' else 'missing_wx' if (r.check_type=='missing' and 'cuaca' in r.resolution) else 'missing_bms' if r.check_type=='missing' else r.check_type], severity=r.severity, status=r.status, resolution=r.resolution, evidence=json.loads(r.evidence)) for r in dq.itertuples()],
    models=[dict(name=r.model_name, version=r.version, type=r.model_type, status=r.validation_status, metrics=json.loads(r.metrics), cc=r.qa_approval_reference, created_at=r.created_at, hash=r.model_hash)
            for r in mvs.itertuples()],
    deployments=[dict(model=mvs.set_index('id').loc[r.model_version_id].model_name, version=mvs.set_index('id').loc[r.model_version_id].version, status=r.deployment_status,
                      deployed_at=r.deployed_at, edge=r.edge_device_code, signature=r.package_signature, notes=r.deployment_notes) for r in dep.itertuples()],
    latency_daily=kd[['date', 'inference_latency_p95_ms']].to_dict('records')))

# ---------------- meta
scen = rd('08_simulation/scenario_events.csv')
W('meta.json', dict(start=cfg['start_local'], step=cfg['step_minutes'], n=N, k_adv=K_ADV, snapshot_k=K_SNAP, snapshot_label=snap_iso, zones=zones, reasons=RC,
                    personas=[p for p in personas if p['role'] in ('QA', 'ENGINEERING', 'CFO', 'AUDITOR', 'HSE', 'PLANT_MANAGER')],
                    scenarios=[dict(r, title_en=SCN_EN[r['scenario_id']][0], behavior_en=SCN_EN[r['scenario_id']][1]) for r in scen.to_dict('records')], conn_en=CONN_EN, comment_en=COMMENT_EN, tariff=cfg['tariff_idr_per_kwh'], ef=cfg['emission_factor_kg_per_kwh'],
                    users={uid: dict(name=n, role=urole.get(uid)) for uid, n in uname.items()}))
