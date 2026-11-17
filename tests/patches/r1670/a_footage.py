import sys
s=open(sys.argv[1]).read()
def rep(a,b):
    global s; assert s.count(a)==1,(a[:70],s.count(a)); s=s.replace(a,b)
rep("""        const cos = r.data.companies || [];
        list.innerHTML = cos.length ? cos.map((c) => {""",
"""        const cos = r.data.companies || [], T = r.data.totals || null, ft = (n) => Math.round(Number(n) || 0).toLocaleString() + ' ft';
        const tot = T ? '<div class="pb-own-co"><div class="nm">All companies</div><div class="ln">' + ft(T.laid_ft) + ' laid · ' + ft(T.laid_ft_30) + ' in the last 30 days · ' + (T.runs || 0) + ' runs · ' + (T.companies || 0) + ' compan' + (T.companies === 1 ? 'y' : 'ies') + '</div></div>' : ''; /* r16.70 */
        list.innerHTML = tot + (cos.length ? cos.map((c) => {""")
rep("""            + '<div class="ln">AI, 30 days: ' + (ai || 'none') + ' · $' + Number(c.ai_usd || 0).toFixed(2) + '</div>'""",
"""            + '<div class="ln">Laid: ' + ft(c.laid_ft) + ' (' + ft(c.laid_ft_30) + ' in 30 days) · ' + (c.runs || 0) + ' runs · ' + (c.photos || 0) + ' photos · ' + (c.reports_30 || 0) + ' reports in 30 days</div>'
            + '<div class="ln">Last used: ' + (c.last_active ? new Date(c.last_active + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'not yet') + '</div>'
            + '<div class="ln">AI, 30 days: ' + (ai || 'none') + ' · $' + Number(c.ai_usd || 0).toFixed(2) + '</div>'""")
rep("""        }).join('') : '<p class="pb-fb-st">No companies yet.</p>';""",
"""        }).join('') : '<p class="pb-fb-st">No companies yet.</p>');""")
open(sys.argv[2],'w').write(s)
