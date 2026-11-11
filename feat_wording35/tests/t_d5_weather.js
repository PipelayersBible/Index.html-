// Night sweep (daily): the Weather card with no job location. r15.94: "Check Again" shows only once the job has a
// location — with none, the card says there is no weather and (r15.65) lets the foreman set City, State right there;
// setting it asks the server once and the weather comes in. Mocks: batch 23 daily_lib.
// Run: DLY_PORT=9274 bash /home/claude/batch23/DAILY/tests/serve.sh /home/claude/rel1534/site1534 /home/claude/night/daily/p05_get_weather_no_location.js
const T = require('/home/claude/batch23/DAILY/tests/daily_lib.js'); const { M, check } = T;
(async () => {
  const browser = await M.chromium.launch();
  try {
    const { page } = await T.setup(browser, { who: 'foreman' });
    await page.evaluate(() => pbOpenDailyReport()); await page.waitForTimeout(3000);
    await page.click('#dxTabReport'); await page.waitForTimeout(400); /* r16.00: the report opens on Narrative; the Weather card is on Hours & Sign */
    await page.click('#drWeatherTog'); await page.waitForTimeout(300); /* r15.65: sections fold to their title row; open Weather */
    const before = await page.evaluate(() => window.__fnLog.filter(x => x.name === 'weather').length);
    const s1 = await page.evaluate(() => ({ needLoc: !!document.getElementById('drNeedLoc'), needText: (document.getElementById('drNeedLoc') || {}).textContent, btn: !!document.getElementById('drWeatherBtn'), city: !!document.getElementById('dxLocCity'), set: !!document.getElementById('dxLocSet') }));
    console.log(JSON.stringify(s1));
    // r15.94: no "Check Again" (or "Get Weather") button until the job has a location; the card explains and offers the City, State box instead
    check('D3 with no job location there is no Check Again button, only the no-weather text and the City, State box', s1.needLoc && /no city and state yet/.test(s1.needText) && !s1.btn && s1.city && s1.set, JSON.stringify(s1));
    await page.fill('#dxLocCity', 'Springfield, IL'); await page.click('#dxLocSet'); await page.waitForTimeout(1500);
    const after = await page.evaluate(() => window.__fnLog.filter(x => x.name === 'weather'));
    const s2 = await page.evaluate(() => ({ needLoc: !!document.getElementById('drNeedLoc'), text: (document.getElementById('drWeatherText') || {}).textContent, label: (document.getElementById('drWeatherLabel') || {}).textContent, btn: (document.getElementById('drWeatherBtn') || {}).textContent, status: document.getElementById('drStatus').textContent }));
    console.log('after Set Location: calls ' + before + ' -> ' + after.length + ' ' + JSON.stringify(s2) + ' last body=' + JSON.stringify(after[after.length - 1] && after[after.length - 1].body));
    check('Set Location asks the server once with the typed place', after.length === before + 1 && after[after.length - 1].body.place === 'Springfield, IL', JSON.stringify(after.map(x => x.body)));
    check('the weather comes in and the button becomes Update Weather', !s2.needLoc && /64|High|high/.test(s2.text || '') && s2.btn === 'Update Weather', JSON.stringify(s2));
    check('no page errors', !page._errors.length, page._errors.join(' | '));
  } catch (e) { check('probe ran to the end', false, e && e.stack); }
  await browser.close();
})();
