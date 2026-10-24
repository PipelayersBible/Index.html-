// Night sweep (daily): with no job location the Weather card says the office must set it, yet "Get Weather" stays enabled
// and tapping it only asks the server again (same answer). Mocks: batch 23 daily_lib.
// Run: DLY_PORT=9274 bash /home/claude/batch23/DAILY/tests/serve.sh /home/claude/rel1534/site1534 /home/claude/night/daily/p05_get_weather_no_location.js
const T = require('/home/claude/batch23/DAILY/tests/daily_lib.js'); const { M, check } = T;
(async () => {
  const browser = await M.chromium.launch();
  try {
    const { page } = await T.setup(browser, { who: 'foreman' });
    await page.evaluate(() => pbOpenDailyReport()); await page.waitForTimeout(3000);
    const before = await page.evaluate(() => window.__fnLog.filter(x => x.name === 'weather').length);
    const s1 = await page.evaluate(() => ({ needLoc: !!document.getElementById('drNeedLoc'), btn: document.getElementById('drWeatherBtn').textContent, disabled: document.getElementById('drWeatherBtn').disabled }));
    console.log(JSON.stringify(s1));
    check('D3 with no job location the button says Check Again', s1.needLoc && s1.btn === 'Check Again', JSON.stringify(s1));
    await page.click('#drWeatherBtn'); await page.waitForTimeout(1500);
    const after = await page.evaluate(() => window.__fnLog.filter(x => x.name === 'weather').length);
    const s2 = await page.evaluate(() => ({ needLoc: !!document.getElementById('drNeedLoc'), msg: (document.getElementById('drWeatherLabel') || document.getElementById('drWeatherNone') || {}).textContent, status: document.getElementById('drStatus').textContent }));
    console.log('after tap: calls ' + before + ' -> ' + after + ' ' + JSON.stringify(s2));
    check('Check Again asks the server once more and keeps the no-location text', after === before + 1 && s2.needLoc, JSON.stringify(s2));
    check('no page errors', !page._errors.length, page._errors.join(' | '));
  } catch (e) { check('probe ran to the end', false, e && e.stack); }
  await browser.close();
})();
