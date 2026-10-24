const { L, lockStakeHubRun, correctDist, correctHub, entryState } = require('/home/claude/test/hunt/corrections/common.js');
(async () => {
  const browser = await L.chromium.launch();
  const page = await L.newPage(browser, 'uCorr1');
  await L.dismiss(page);
  const { id, hubId } = await lockStakeHubRun(page);
  let s = await entryState(page, id);
  L.check('control: locked run with a stake hub cut 5.50 + 0.30 wall is depth-flagged', s.flagged === true);
  let err = await correctHub(page, hubId, 50, 99.4);
  s = await entryState(page, id);
  L.check('control: after correcting the stake hub to elevation 99.40 (stake 105.00 -> 5.9 ft trench) the run stays depth-flagged', s.flagged === true && s.corr === 1 && !err);
  const ncf1 = s.ncf;
  // Pass 25: the hub's cut follows its corrected invert: ground 105.00 - 99.40 = 5.60 (was the stake's old 5.50).
  L.check('control: after the hub correction the run records the hub\'s cut to its corrected invert (net cut/fill 5.6)', ncf1 !== null && Math.abs(ncf1 - 5.6) < 1e-6);
  err = await correctDist(page, 1, 110);
  s = await entryState(page, id);
  const st = await page.evaluate((i) => JSON.parse(localStorage.getItem('uCorr1:statsLog') || '[]').find(x => x.entryId === i), id);
  console.log('after 2nd correction:', JSON.stringify({ flagged: s.flagged, corr: s.corr, dist: s.dist, err }));
  L.check('a later, unrelated distance correction (100 -> 110 ft) keeps the run depth-flagged (the corrected hub still sits under 105.00 ground)', s.corr === 2 && s.dist === 110 && s.flagged === true);
  // Pass 25: the distance correction moves neither the hub's ground nor its invert: still 105.00 - 99.40 = 5.60.
  L.check('net cut/fill still 5.6 after the second correction (the hub\'s ground and invert did not change)', s.ncf !== null && Math.abs(s.ncf - 5.6) < 1e-6);
  if (st) L.check('Stats record stays depth-flagged after the second correction', st.depthFlagged === true);
  else console.log('(no stats debug hook)');
  L.check('no JS errors', page._errors.length === 0);
  await browser.close();
})();
