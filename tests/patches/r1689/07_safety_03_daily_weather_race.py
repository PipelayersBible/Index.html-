import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# Bug hunt (safety 03): the daily report's weather. The answer to a lookup was applied to whatever job and date the
# form showed when it ARRIVED, not the job and date it was asked for: changing the date (or job) while the lookup was
# still out put that day's weather on the other day's report and cached it under the other day's key.
# Now the job, date and form are fixed when the request is made; an answer for a day no longer shown is only cached
# (under its own key), and the day shown now is then looked up itself.
rep("""    const r = await pbPermitRpc('pb_daily_weather_get', { p_job_number: pbDlyView.job, p_work_date: pbDlyView.date, p_expect_uid: uid }, 15000);
    if (r && r.data && r.data.ok) { pbDlyView.location = r.data.location; if (r.data.weather) { pbDlyView.weather = r.data.weather; if (pbDly.st) { pbDly.st.weather[wk] = r.data.weather; pbDlySave(uid); } } pbDlyRender(); }
    if (!pbDlyView.weather || !pbDlyView.weather.complete) pbDlyWeather({});""",
    """    const V0 = pbDlyView, wSame = () => pbDlyView === V0 && pbDlyKey(pbDlyView.job) + '|' + pbDlyView.date === wk; /* hunt safety 03 */
    if (!wSame()) return;
    const r = await pbPermitRpc('pb_daily_weather_get', { p_job_number: V0.job, p_work_date: V0.date, p_expect_uid: uid }, 15000);
    if (r && r.data && r.data.ok) {
      if (r.data.weather && pbDly.st && pbDly.uid === uid) { pbDly.st.weather[wk] = r.data.weather; pbDlySave(uid); } // kept under the day it was asked for
      if (!wSame()) return; // the form shows another job or day now: nothing of this answer goes on it
      pbDlyView.location = r.data.location; if (r.data.weather) pbDlyView.weather = r.data.weather; pbDlyRender();
    }
    if (!wSame()) return;
    if (!pbDlyView.weather || !pbDlyView.weather.complete) pbDlyWeather({});""")
rep("""    pbDlyView.wBusy = true; pbDlyView.wMsg = 'Getting the weather…'; pbDlyRender();
    let r = null;
    try { r = await Promise.race([sbClient.functions.invoke('weather', { body: Object.assign({ job_number: pbDlyView.job, work_date: pbDlyView.date }, extra || {}) }), new Promise(res => setTimeout(() => res({ data: null, error: { message: 'timeout' } }), 30000))]); } catch (e) { r = { data: null, error: { message: String(e && e.message) } }; }
    pbDlyView.wBusy = false;
    const d = r && r.data;""",
    """    const V0 = pbDlyView, wJob = pbDlyView.job, wDate = pbDlyView.date, wSame = () => pbDlyView === V0 && pbDlyView.job === wJob && pbDlyView.date === wDate; /* hunt safety 03: the job and day this lookup is for */
    pbDlyView.wBusy = true; pbDlyView.wMsg = 'Getting the weather…'; pbDlyRender();
    let r = null;
    try { r = await Promise.race([sbClient.functions.invoke('weather', { body: Object.assign({ job_number: wJob, work_date: wDate }, extra || {}) }), new Promise(res => setTimeout(() => res({ data: null, error: { message: 'timeout' } }), 30000))]); } catch (e) { r = { data: null, error: { message: String(e && e.message) } }; }
    V0.wBusy = false;
    const d = r && r.data;
    if (!wSame()) { // the job or the date was changed while this was out: the answer belongs to the day it was asked for
      if (d && d.ok && d.weather && pbDly.st && pbDly.uid === uid) { pbDly.st.weather[pbDlyKey(wJob) + '|' + wDate] = d.weather; pbDlySave(uid); }
      if (pbDlyView === V0 && pbDlyView.wMsg === 'Getting the weather…') pbDlyView.wMsg = '';
      if (pbCurrentScreen === 'dailyReport' && pbDlyView.job && !pbDlyView.wBusy && (!pbDlyView.weather || !pbDlyView.weather.complete)) pbDlyWeather({}); else pbDlyRender(); // the day shown now gets its own lookup
      return;
    }""")
open(out, 'w', encoding='utf-8').write(s)
