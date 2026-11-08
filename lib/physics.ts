export type Reading = { temperature_c: number; rh_pct: number; dp_pa: number; fan_hz: number; quality_code: number; critical_step: boolean };
export type PlantZone = { code: string; name_id: string; rh: [number,number]; dp: [number,number]; t: [number,number]; hz_min: number; hz_b: number; ahus: string[] };
export const ASSUMPTIONS = {
  horizon_minutes: 30, step_minutes: 1, temperature_tau_minutes: 20, moisture_tau_minutes: 15, pressure_tau_minutes: 2,
  supply_temperature_c: 16, supply_rh_pct: 65, fan_kw_per_ahu_at_nominal: 7.5,
  temperature_margin_c: 0.5, rh_margin_pct: 2, dp_margin_pa: 0.5,
  description: 'Parameter demonstrasi, belum dikalibrasi pada pabrik. Beban panas dan uap air dianggap konstan; kondisi awal dianggap setimbang. Energi hanya fan, bukan total HVAC.'
};
export function saturationPressure(t: number) { return 0.61078 * Math.exp(17.2694 * t / (t + 237.29)); }
export function humidityRatio(t: number,rh: number) { const pv=saturationPressure(t)*rh/100; return 0.62198*pv/(101.325-pv); }
export function relativeHumidity(t: number,w: number) { return 100*(101.325*w/(0.62198+w))/saturationPressure(t); }
export function forecast(zone: PlantZone, initial: Reading, targetHz: number) {
  if (![initial.temperature_c, initial.rh_pct, initial.dp_pa, initial.fan_hz, targetHz].every(v=>typeof v==='number'&&Number.isFinite(v)) ||
      initial.fan_hz<=0 || targetHz<=0 || initial.rh_pct<0 || initial.rh_pct>100) throw new Error('Input fisika tidak valid.');
  const a=ASSUMPTIONS, ratio=targetHz/initial.fan_hz;
  const ws=humidityRatio(a.supply_temperature_c,a.supply_rh_pct), w0=humidityRatio(initial.temperature_c,initial.rh_pct);
  // dT/dt=(T_equilibrium-T)/tau; dw/dt=(w_equilibrium-w)/tau.
  // Fixed inferred sensible/moisture loads calibrated to the initial equilibrium, not fitted on future readings.
  const eqT=a.supply_temperature_c+(initial.temperature_c-a.supply_temperature_c)/ratio;
  const eqW=ws+(w0-ws)/ratio;
  const eqDp=initial.dp_pa*ratio*ratio;
  const trajectory=Array.from({length:31},(_,minute)=>{
    const t=eqT+(initial.temperature_c-eqT)*Math.exp(-minute*ratio/a.temperature_tau_minutes);
    const w=eqW+(w0-eqW)*Math.exp(-minute*ratio/a.moisture_tau_minutes);
    const dp=eqDp+(initial.dp_pa-eqDp)*Math.exp(-minute/a.pressure_tau_minutes);
    return {minute,temperature_c:t,rh_pct:relativeHumidity(t,w),dp_pa:dp};
  });
  const baselineKW=zone.ahus.length*a.fan_kw_per_ahu_at_nominal*Math.pow(initial.fan_hz/zone.hz_b,3);
  const proposedKW=baselineKW*Math.pow(ratio,3), baselineKWh=baselineKW*0.5, candidateKWh=proposedKW*0.5;
  const reasons:string[]=[];
  if(initial.quality_code!==0)reasons.push('Kualitas sensor bukan GOOD.');
  if(initial.critical_step)reasons.push('Tahap produksi kritis aktif.');
  if(targetHz<zone.hz_min||targetHz>zone.hz_b)reasons.push('Di luar rentang frekuensi simulasi.');
  if(Math.abs(targetHz-initial.fan_hz)>3)reasons.push('Perubahan melebihi 3 Hz per usulan.');
  for(const [field,limits,margin] of [['temperature_c',zone.t,a.temperature_margin_c],['rh_pct',zone.rh,a.rh_margin_pct],['dp_pa',zone.dp,a.dp_margin_pa]] as const){
    if(trajectory.some(p=>p[field]-margin<limits[0]||p[field]+margin>limits[1]))reasons.push('Lintasan '+field+' beserta margin melewati batas zona.');
  }
  const savingsPct=(1-candidateKWh/baselineKWh)*100;
  return {model:'lumped-balance-v1',assumptions:a,initial,targetHz,trajectory,endpoint:trajectory[30],
    gate:{decision:reasons.length?'TAHAN':'LULUS',reasons},
    energy:{scope:'FAN_ONLY',baselineKW,proposedKW,baselineKWh,candidateKWh,savedKWh:baselineKWh-candidateKWh,savingsPct,
      claim:'ESTIMASI SIMULASI 30 MENIT — bukan penghematan terukur atau total HVAC',measured:false}};
}
