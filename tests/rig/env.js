// Shared settings for the test rig. tests/run_all.sh sets these env vars for every test; the defaults keep the
// old one-off way of running a test by hand (server on 127.0.0.1:8843, outputs under /tmp/claude-0).
//   PB_ROOT  server folder of the build under test, e.g. http://127.0.0.1:41234/hk/   (tests add 'cur.html', 'index.html', ...)
//   PB_URL   the page under test (PB_ROOT + 'cur.html')
//   PB_BASE  the "before" page for before/after tests (t123); only set when run_all.sh gets --base
//   PB_OUT   a private scratch folder for this test (screenshots, PDFs, export zips)
//   PB_NOTICE_VER / PB_BASE_NOTICE_VER  the crew-notice version the build (and the base build) asks for, read from the page
const fs = require('fs'), path = require('path');
const E = {};
E.TESTS = path.resolve(__dirname, '..');
E.FIX = E.TESTS + '/fixtures';
E.RIG = __dirname;
E.ROOT = process.env.PB_ROOT || 'http://127.0.0.1:8843/';
E.URL = process.env.PB_URL || (E.ROOT + 'cur.html');
E.BASE = process.env.PB_BASE || (E.ROOT + 'base.html');
E.NOTICE = process.env.PB_NOTICE_VER || '3';
E.BASE_NOTICE = process.env.PB_BASE_NOTICE_VER || '2';
// out(def): the folder to write scratch files to (PB_OUT when the runner set it, else the old hard-coded folder), created if missing
E.out = (def) => { const d = process.env.PB_OUT || def || '/tmp/claude-0'; try { fs.mkdirSync(d, { recursive: true }); } catch (e) {} return d; };
// PB_FAKE_NOW (an ISO time, e.g. 2026-11-18T09:30:00): pages start at that time and the clock runs on from there in real
// time (a constant offset, the same for every page this test opens, so reloads never go back in time). run_all.sh sets it
// for golden-judged tests, so lines like "3 active this week" or "23 days left" computed from fixed fixture dates do not
// drift as the calendar moves on. Unset: the real clock.
E.TIME_OFFSET = process.env.PB_FAKE_NOW ? (Date.parse(process.env.PB_FAKE_NOW) - Date.now()) : 0;
E.clockScript = E.TIME_OFFSET ? `(()=>{const off=${E.TIME_OFFSET};const RD=Date;if(RD.__pbShift)return;
 function D(...a){if(!new.target)return new RD(RD.now()+off).toString();return a.length?new RD(...a):new RD(RD.now()+off);}
 D.prototype=RD.prototype;D.now=()=>RD.now()+off;D.parse=RD.parse;D.UTC=RD.UTC;D.__pbShift=off;
 Object.defineProperty(D,'name',{value:'Date'});globalThis.Date=D;
 /* times the browser stamps itself must move with it: a photo picked "now" (File.lastModified; the app stamps only photos
    taken in the last 3 min) and a GPS fix (GeolocationPosition.timestamp). A File made in the page with an explicit
    lastModified already got the shifted Date.now(). */
 try{const OF=File,lm=Object.getOwnPropertyDescriptor(OF.prototype,'lastModified'),ex=new WeakSet();
  function F(b,n,o){const f=new OF(b,n,o);if(o&&o.lastModified!=null)ex.add(f);return f;}F.prototype=OF.prototype;Object.defineProperty(F,'name',{value:'File'});globalThis.File=F;
  Object.defineProperty(OF.prototype,'lastModified',{configurable:true,get(){const v=lm.get.call(this);return ex.has(this)?v:v+off;}});}catch(e){}
 try{const gp=globalThis.GeolocationPosition&&GeolocationPosition.prototype,ts=gp&&Object.getOwnPropertyDescriptor(gp,'timestamp');
  if(ts)Object.defineProperty(gp,'timestamp',{configurable:true,get(){return ts.get.call(this)+off;}});}catch(e){}
})();` : '';
// call on a browser context before any page opens (boot.js does; the folders with their own launchers call it too)
E.applyClock = async (ctx) => { if (E.clockScript) await ctx.addInitScript(E.clockScript); };
module.exports = E;
