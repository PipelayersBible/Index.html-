// weather (batch 23 DAILY): the logic, kept apart from Deno so node can test it (tests/t_weather.mjs).
// Observed weather for a JOB and a work day from the National Weather Service (api.weather.gov): free, no key,
// a User-Agent is required (browsers can't set one, which is why this runs as an edge function). US only.
// v3 (feat_wxfix, Oct 29 2026): a city/state is looked up OFFLINE in the database (public.pb_daily_place_lookup over
// pb_daily.us_places: the US Census Gazetteer places and towns/townships, public domain). A street address still goes to
// the US Census geocoder first, then to its city and state in the table. The hourly lookup (pb_daily_weather_begin) is
// given back (pb_daily_weather_release) whenever the request ends before the National Weather Service answered.

export type Q = { unitCode?: string; value?: number | null } | null | undefined;
export type Deps = {
  svc: (fn: string, args: Record<string, unknown>) => Promise<{ ok: boolean; data: any }>;
  get: (url: string) => Promise<{ status: number; json: any }>;
  now: () => number;
};

export const MESSAGES: Record<string, string> = {
  'pb:bad_request': 'The app sent something the weather service couldn’t read.',
  'pb:not_allowed': 'Only a foreman or the company account of this job’s company can get its weather.',
  'pb:bad_date': 'Weather can be looked up for the last 400 days only.',
  'pb:need_location': 'This job has no city and state yet. Add them in the job’s Project details.',
  'pb:geocode_nomatch': 'The US Census address lookup found no match for that address. Check it, or pin the location.',
  'pb:geocode_down': 'The address lookup isn’t answering right now. Try again later, or pin the location.',
  'pb:not_us': 'The National Weather Service covers the United States only, and this job location is outside it.',
  'pb:no_station': 'The National Weather Service lists no observation station near this job.',
  'pb:no_observations': 'The nearest National Weather Service stations reported no observations for this day.',
  'pb:too_old': 'The National Weather Service keeps station observations for about a week, so this day is no longer available from it.',
  'pb:nws_down': 'The National Weather Service isn’t answering right now. Try again later.',
  'pb:busy': 'Your company has looked up weather many times today. Try again tomorrow.',
  'pb:try_later': 'The weather for this job and day was looked up less than an hour ago. Try again later.',
  'pb:location_managers_only': 'Only the company account, a manager, a PM or a superintendent can set a job’s location. Ask the office to set it.',
  'pb:need_location_office': 'This job has no city and state yet. Ask the office (company account, manager, PM or superintendent) to add them in the job’s Project details.',
  'pb:place_unclear': 'Type the city and state, for example Springfield, IL.',
  'pb:place_nomatch': 'No city by that name was found in that state. Check the spelling, or set the exact spot.',
  'pb:server': 'The weather service had a problem. Try again later.',
};
export const fail = (code: string, extra: Record<string, unknown> = {}) => Object.assign({ ok: false, code, message: MESSAGES[code] || MESSAGES['pb:server'] }, extra);

const unit = (q: Q) => String((q && q.unitCode) || '').replace(/^(wmoUnit|unit):/, '');
const num = (q: Q) => (q && typeof q.value === 'number' && Number.isFinite(q.value) ? q.value : null);
export function toF(q: Q): number | null { const v = num(q); if (v === null) return null; const u = unit(q); if (u === 'degF') return v; if (u === 'degC') return v * 9 / 5 + 32; if (u === 'K') return (v - 273.15) * 9 / 5 + 32; return null; }
export function toMph(q: Q): number | null { const v = num(q); if (v === null) return null; const u = unit(q); if (u === 'km_h-1') return v / 1.609344; if (u === 'm_s-1') return v * 2.2369363; if (u === 'mi_h-1' || u === 'mph') return v; if (u === 'kn' || u === 'kt') return v * 1.150779; return null; }
export function toIn(q: Q): number | null { const v = num(q); if (v === null) return null; const u = unit(q); if (u === 'mm') return v / 25.4; if (u === 'm') return v / 0.0254; if (u === 'cm') return v / 2.54; if (u === 'in') return v; return null; }
const r1 = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10);
const r2 = (v: number | null) => (v === null ? null : Math.round(v * 100) / 100);

export function tzOffsetMs(tz: string, t: number): number {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p: Record<string, string> = {}; f.formatToParts(new Date(t)).forEach((x) => { p[x.type] = x.value; });
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUtc - Math.floor(t / 1000) * 1000;
}
export function dayBounds(date: string, tz: string): { start: number; end: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || ''); if (!m) return null;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); } catch (_e) { return null; }
  const wall = (y: number, mo: number, d: number) => { const guess = Date.UTC(y, mo, d); let t = guess - tzOffsetMs(tz, guess); t = guess - tzOffsetMs(tz, t); return t; };
  const y = +m[1], mo = +m[2] - 1, d = +m[3];
  return { start: wall(y, mo, d), end: wall(y, mo, d + 1) };
}

export function summarize(features: any[], b: { start: number; end: number }, now: number) {
  const obs = (Array.isArray(features) ? features : []).map((f) => (f && f.properties) || null).filter((p) => p && p.timestamp)
    .map((p) => ({ p, t: Date.parse(p.timestamp) })).filter((x) => Number.isFinite(x.t) && x.t >= b.start && x.t < b.end).sort((a, c) => a.t - c.t);
  const ok = (q: any) => (q && q.qualityControl === 'X' ? null : q);
  obs.forEach((x) => { ['temperature', 'windSpeed', 'windGust', 'precipitationLastHour'].forEach((k) => { x.p[k] = ok(x.p[k]); }); });
  const temps = obs.map((x) => toF(x.p.temperature)).filter((v): v is number => v !== null);
  const winds = obs.map((x) => toMph(x.p.windSpeed)).filter((v): v is number => v !== null);
  const gusts = obs.map((x) => toMph(x.p.windGust)).filter((v): v is number => v !== null);
  const withP = obs.filter((x) => toIn(x.p.precipitationLastHour) !== null);
  const mins = new Map<number, number>(); withP.forEach((x) => { const mi = new Date(x.t).getUTCMinutes(); mins.set(mi, (mins.get(mi) || 0) + 1); });
  const usual = Array.from(mins.entries()).sort((a, c) => c[1] - a[1])[0];
  const near = (mi: number) => usual ? Math.min(Math.abs(mi - usual[0]), 60 - Math.abs(mi - usual[0])) <= 3 : false;
  const perHour = new Map<number, number>();
  withP.forEach((x) => { if (!near(new Date(x.t).getUTCMinutes())) return; const h = Math.floor((x.t + 30 * 60000) / 3600000); perHour.set(h, Math.max(perHour.get(h) || 0, toIn(x.p.precipitationLastHour) as number)); });
  const hoursSpanned = Math.max(0, Math.round((Math.min(b.end, now) - b.start) / 3600000));
  let precip: number | null = null; perHour.forEach((v) => { precip = (precip || 0) + v; });
  const cond = new Map<string, number>();
  obs.forEach((x) => { const s = String(x.p.textDescription || '').trim(); if (s) cond.set(s, (cond.get(s) || 0) + 1); });
  const conditions = Array.from(cond.entries()).sort((a, c) => c[1] - a[1]).slice(0, 4).map(([text, n]) => ({ text, n }));
  const toC = (f: number | null) => (f === null ? null : r1((f - 32) * 5 / 9));
  const hi = temps.length ? Math.max(...temps) : null, lo = temps.length ? Math.min(...temps) : null;
  return {
    obs_count: obs.length,
    first_obs: obs.length ? new Date(obs[0].t).toISOString() : null,
    last_obs: obs.length ? new Date(obs[obs.length - 1].t).toISOString() : null,
    high_f: r1(hi), low_f: r1(lo), high_c: toC(hi), low_c: toC(lo),
    precip_in: r2(precip), precip_hours_reported: perHour.size, precip_hours_in_day: hoursSpanned,
    wind_max_mph: winds.length ? Math.round(Math.max(...winds)) : null, gust_max_mph: gusts.length ? Math.round(Math.max(...gusts)) : null,
    conditions,
    complete: now >= b.end + 2 * 3600000 && (obs.length ? (b.end - obs[obs.length - 1].t <= 90 * 60000 || now >= b.end + 24 * 3600000) : false),
  };
}

export function censusUrl(address: string) {
  return 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=json&address=' + encodeURIComponent(address);
}
export function parseCensus(j: any): { lat: number; lon: number; matched: string } | null {
  const m = j && j.result && Array.isArray(j.result.addressMatches) ? j.result.addressMatches[0] : null;
  const x = m && m.coordinates ? Number(m.coordinates.x) : NaN, y = m && m.coordinates ? Number(m.coordinates.y) : NaN;
  if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(y) > 90 || Math.abs(x) > 180) return null;
  return { lat: y, lon: x, matched: String(m.matchedAddress || '') };
}

type Geo = { ok: true; lat: number; lon: number; label: string; match: string; ambiguous: boolean } | { ok: false; code: string };
export async function geocodePlace(deps: Deps, text: unknown): Promise<Geo> {
  const t = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  if (t.length < 2) return { ok: false, code: 'pb:place_unclear' };
  const r = await deps.svc('pb_daily_place_lookup', { p_text: t });
  const d = r && r.ok && r.data && typeof r.data === 'object' ? r.data : null;
  if (!d || d.ok !== true) return { ok: false, code: 'pb:geocode_down' };
  if (!d.found) return { ok: false, code: d.code === 'pb:place_unclear' ? 'pb:place_unclear' : 'pb:place_nomatch' };
  const lat = Number(d.lat), lon = Number(d.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return { ok: false, code: 'pb:server' };
  return { ok: true, lat, lon, label: String(d.label || t).slice(0, 300), match: String(d.match || 'exact'), ambiguous: d.ambiguous === true };
}
export async function geocodeAny(deps: Deps, text: string): Promise<Geo> {
  const t = String(text || '').trim().slice(0, 300);
  if (/^\d+[a-z]?\s+\S/i.test(t)) {
    const g = await deps.get(censusUrl(t));
    const p = g.status === 200 ? parseCensus(g.json) : null;
    if (p) return { ok: true, lat: p.lat, lon: p.lon, label: p.matched || t, match: 'census', ambiguous: false };
    const q = await geocodePlace(deps, t);
    if (q.ok) return q;
    if (g.status !== 200 && q.code !== 'pb:geocode_down') return { ok: false, code: 'pb:geocode_down' };
    return { ok: false, code: q.code === 'pb:place_unclear' ? 'pb:geocode_nomatch' : q.code };
  }
  return geocodePlace(deps, t);
}

const isDate = (s: unknown) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const cleanJob = (s: unknown) => (typeof s === 'string' ? s.trim().slice(0, 60) : '');
export const STATION_TRIES = 3;
export const FRESH_MS = 60 * 60 * 1000;
const NWS = 'https://api.weather.gov/';
const r3 = (v: number) => Math.round(v * 1000) / 1000;

export async function handle(deps: Deps, uid: string, body: any) {
  const job = cleanJob(body && body.job_number), date = body && body.work_date;
  if (!uid || !job || !isDate(date)) return fail('pb:bad_request');
  const now = deps.now();
  if (now - (Date.parse(date + 'T00:00:00Z') + 38 * 3600000) > 8 * 86400000) return fail('pb:too_old');
  const given = isNum(body.lat) && isNum(body.lon) && Math.abs(body.lat) <= 90 && Math.abs(body.lon) <= 180 && (body.source === 'pin' || body.source === 'device_once');
  const place = !given && typeof body.place === 'string' && body.place.trim().length >= 2 ? body.place.trim().slice(0, 300) : null;
  const newLoc = given || !!place || (typeof body.address === 'string' && body.address.trim().length >= 5);
  const begin = await deps.svc('pb_daily_weather_begin', { p_uid: uid, p_job_number: job, p_work_date: date, p_new_location: newLoc });
  if (!begin.ok || !begin.data) return fail('pb:server');
  const B = begin.data;
  if (B.ok === false) return fail(B.code || 'pb:server');
  const st = { nws: false };
  let out: any;
  try { out = await run(deps, uid, body, B, date, now, given, place, newLoc, st); }
  finally {
    if (B.go && B.attempt !== null && B.attempt !== undefined && !st.nws) {
      try { await deps.svc('pb_daily_weather_release', { p_attempt: B.attempt, p_company: B.company_id, p_job_key: B.job_key }); } catch (_e) { /* the hour runs out by itself */ }
    }
  }
  return out;
}

async function run(deps: Deps, uid: string, body: any, B: any, date: string, now: number, given: boolean, place: string | null, newLoc: boolean, st: { nws: boolean }) {
  const locOut = (l: any) => (l ? { source: l.source, address: l.address || null } : null);
  let loc = B.location, saved = false, from = '', fromCode = '';
  if (!B.location && !newLoc) {
    const ja = await deps.svc('pb_daily_job_address', { p_company: B.company_id, p_job_key: B.job_key });
    from = ja.ok && ja.data && ja.data.ok && typeof ja.data.address === 'string' ? ja.data.address : '';
    if (from) {
      const g = await geocodeAny(deps, from);
      if (g.ok && !((g.match === 'exact' || g.match === 'census') && !g.ambiguous)) fromCode = 'pb:place_nomatch';
      else if (g.ok) {
        const bf = await deps.svc('pb_daily_location_backfill', { p_company: B.company_id, p_job_key: B.job_key, p_lat: g.lat, p_lon: g.lon, p_address: g.label, p_from: from });
        if (bf.ok && bf.data && bf.data.ok && bf.data.lat !== null && bf.data.lat !== undefined) { loc = { lat: Number(bf.data.lat), lon: Number(bf.data.lon), source: bf.data.source || 'geocoded', address: bf.data.address || null }; saved = true; }
      } else fromCode = g.code;
    }
  }
  if (!B.go) {
    if (saved && !B.cached) return fail(B.code || 'pb:try_later', { next_at: B.next_at || null, location_saved: true, location: locOut(loc) });
    if (B.cached) return { ok: true, cached: true, weather: B.cached, location: locOut(B.location), next_at: B.next_at || null };
    return fail(B.code || 'pb:try_later', { next_at: B.next_at || null });
  }
  if (newLoc) {
    let lat: number, lon: number, source: string, address: string | null = null;
    if (given) { lat = r3(body.lat); lon = r3(body.lon); source = body.source; address = typeof body.address === 'string' ? body.address.trim().slice(0, 300) : null; }
    else {
      const g = place ? await geocodePlace(deps, place) : await geocodeAny(deps, body.address);
      if (!g.ok) return fail(g.code);
      lat = g.lat; lon = g.lon; source = 'geocoded'; address = g.label;
    }
    const put = await deps.svc('pb_daily_location_put', { p_uid: uid, p_company: B.company_id, p_job_key: B.job_key, p_lat: lat, p_lon: lon, p_source: source, p_address: address });
    if (!put.ok || !put.data) return fail('pb:server');
    if (put.data.ok === false) return fail(put.data.code || 'pb:server');
    loc = { lat: isNum(put.data.lat) ? put.data.lat : lat, lon: isNum(put.data.lon) ? put.data.lon : lon, source, address }; saved = true;
  }
  if (!loc) {
    if (from && (fromCode === 'pb:geocode_down' || fromCode === 'pb:server')) return fail('pb:geocode_down');
    return fail(B.manager ? 'pb:need_location' : 'pb:need_location_office', from ? { place: from.slice(0, 120), place_found: false } : {});
  }
  const after = (code: string) => (saved ? fail(code, { location_saved: true, location: { source: loc.source, address: loc.address || null } }) : fail(code));
  const lat4 = Math.round(Number(loc.lat) * 10000) / 10000, lon4 = Math.round(Number(loc.lon) * 10000) / 10000;
  const pt = await deps.get('https://api.weather.gov/points/' + lat4 + ',' + lon4);
  if (pt.status === 404) { st.nws = true; return after('pb:not_us'); }
  if (pt.status !== 200 || !pt.json || !pt.json.properties) return after('pb:nws_down');
  st.nws = true;
  const tz = String(pt.json.properties.timeZone || 'UTC'), stUrl = pt.json.properties.observationStations;
  const b = dayBounds(date, tz); if (!b) return after('pb:bad_request');
  if (now - b.end > 8 * 86400000) return after('pb:too_old');
  if (!stUrl || typeof stUrl !== 'string' || stUrl.indexOf(NWS) !== 0) return after('pb:no_station');
  const sl = await deps.get(String(stUrl));
  if (sl.status !== 200) return after('pb:nws_down');
  const stations = (sl.json && Array.isArray(sl.json.features) ? sl.json.features : []).map((f: any) => f && f.properties).filter((p: any) => p && p.stationIdentifier).slice(0, STATION_TRIES);
  if (!stations.length) return after('pb:no_station');
  let answered = false;
  for (const s of stations) {
    const url = 'https://api.weather.gov/stations/' + encodeURIComponent(s.stationIdentifier) + '/observations?limit=500&start=' + encodeURIComponent(new Date(b.start).toISOString()) + '&end=' + encodeURIComponent(new Date(Math.min(b.end, now)).toISOString());
    const ob = await deps.get(url);
    if (ob.status !== 200) continue;
    answered = true;
    const sum = summarize(ob.json && ob.json.features, b, now);
    if (!sum.obs_count) continue;
    const data = Object.assign({ station: s.stationIdentifier, station_name: s.name || null, tz, work_date: date, source: 'National Weather Service (api.weather.gov), station observations', location_source: loc.source,
      location: { lat: r3(Number(loc.lat)), lon: r3(Number(loc.lon)), source: loc.source, address: loc.address || null } }, sum);
    const put = await deps.svc('pb_daily_weather_put', { p_company: B.company_id, p_job_key: B.job_key, p_work_date: date, p_station: s.stationIdentifier, p_data: data, p_complete: sum.complete });
    const retrieved_at = new Date(now).toISOString();
    return { ok: true, cached: false, saved: !!put.ok, location_saved: saved, weather: { station: s.stationIdentifier, data, complete: sum.complete, retrieved_at }, location: { source: loc.source, address: loc.address || null } };
  }
  if (!answered) return after('pb:nws_down');
  return after('pb:no_observations');
}
