import sys
src,out=sys.argv[1],sys.argv[2]; s=open(src,encoding='utf-8').read()
def rep(a,b):
    global s; c=s.count(a); assert c==1,(c,a[:70]); s=s.replace(a,b)
rep("#pbApp .pbx-tabs::-webkit-scrollbar { display: none; }",
"#pbApp .pbx-tabs::-webkit-scrollbar { display: none; }\n#pbApp #screen-prodJob .pbx-tabs { top: var(--pb-pj-hdr, 0px); } /* feat_r1613: the job page's tabs stick under its header, never over it */")
rep("  // ---- JOB DETAIL: the job's hub (per-category table, today / 7 days, who reported, tickets, plan editor) ----\n",
"""  (function () { // feat_r1613: the job page header's height, for its sticky tabs
    const h = document.querySelector('#screen-prodJob > .pb-header'), scr = document.getElementById('screen-prodJob');
    if (!h || !scr || typeof ResizeObserver !== 'function') return;
    const set = () => { const st = getComputedStyle(h); scr.style.setProperty('--pb-pj-hdr', (st.position === 'sticky' || st.position === 'fixed' ? Math.max(0, Math.round(h.getBoundingClientRect().height + (parseFloat(st.top) || 0))) : 0) + 'px'); };
    try { new ResizeObserver(set).observe(h, { box: 'border-box' }); } catch (e) {} h.addEventListener('transitionend', set); set();
  })();
  // ---- JOB DETAIL: the job's hub (per-category table, today / 7 days, who reported, tickets, plan editor) ----\n""")
open(out,'w',encoding='utf-8').write(s); print('ok')
