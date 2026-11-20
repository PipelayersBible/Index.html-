# declutter 03: the More tab and Account & Settings. Grouping only; every row keeps its id and what it opens.
#  More: "Learn" held Plans and Toolbox Talks (job things, not reading) and "Production" held one row (Stats).
#        Now: "On the job" (Plans, Toolbox Talks, Documents, Stats) and "Learn" (Education & Reference, Confined Space
#        Reference). The last group gets an "Account & Settings" row beside "Edit Home shortcuts": people look for
#        settings under More (it is also the person button at the top right, as before).
#  Settings: Preferences, Notifications and Privacy were three cards holding 3 + 1 + 1 things, all about this phone.
#        Now one "Preferences" card. Six cards become four. Second lines 12.5 px -> 14 px.
from _rep import P
p = P()
p.rep('''const PB_TOOLS_TAB_CATS = [['reference', 'Learn'], ['records', 'Production']];''',
      '''const PB_TOOLS_TAB_CATS = [['job', 'On the job'], ['reference', 'Learn']]; const pbDcMoreCat = (d) => (d.cat === 'records' || ['plans', 'talks', 'askDocs'].includes(d.id)) ? 'job' : d.cat; /* declutter 03 */''')
p.rep('''pbGroupHTML(name, PB_DESTINATIONS.filter(d => pbDestTab(d) === 'tools' && d.cat === cat && d.id !== 'aiAsk' ''',
      '''pbGroupHTML(name, PB_DESTINATIONS.filter(d => pbDestTab(d) === 'tools' && pbDcMoreCat(d) === cat && d.id !== 'aiAsk' ''')
p.rep('''<span class="name">Edit Home shortcuts</span><span class="sub">Pick the tools shown on Home</span></span><span class="chev" aria-hidden="true">&rsaquo;</span></button>'
      + '</div></section>';''',
      '''<span class="name">Edit Home shortcuts</span><span class="sub">Pick the tools shown on Home</span></span><span class="chev" aria-hidden="true">&rsaquo;</span></button>'
      + '<button type="button" class="pb-edu-row pb-tool-row" id="toolsOpenSettings" data-ic="user" onclick="pbOpenSettings()"><span class="pb-tool-ic" aria-hidden="true"></span><span class="tx"><span class="name">Account &amp; Settings</span><span class="sub">Your name, crew, text size, help</span></span><span class="chev" aria-hidden="true">&rsaquo;</span></button>' /* declutter 03 */
      + '</div></section>';''')
p.rep('''#pbApp #screen-tools section[aria-label="Production"] { --pb-sec-icon: var(--pb-icon-chart); }''',
      '''#pbApp #screen-tools section[aria-label="On the job"] { --pb-sec-icon: var(--pb-icon-jobs); }''')
# Settings: one Preferences card
p.rep('''    <div class="pb-section" id="settingsPrefsSection">
      <div class="pb-tag" id="settingsPrefsLabel">Preferences</div>''',
      '''    <div class="pb-section dc-set-one" id="settingsPhoneGroup"><!-- declutter 03: Preferences + Notifications + Privacy in one card -->
    <div class="pb-section" id="settingsPrefsSection">
      <div class="pb-tag" id="settingsPrefsLabel">Preferences</div>''')
p.rep('''    <!-- Batch 10 (W, F19): the app version, and a way to tell the app's owner (not the company) about a problem -->
    <div class="pb-section" id="settingsAppSection">''',
      '''    </div>
    <!-- Batch 10 (W, F19): the app version, and a way to tell the app's owner (not the company) about a problem -->
    <div class="pb-section" id="settingsAppSection">''')
CSS = r'''
<style id="dcSetStyle">
/* declutter 03 (Nov 19): Settings: one Preferences card; 14 px second lines */
#pbApp#pbApp #screen-settings .dc-set-one > .pb-section { margin: 0; padding-top: 0; padding-bottom: 0; background: none; border: 0; border-radius: 0; box-shadow: none; }
#pbApp#pbApp #screen-settings .dc-set-one > .pb-section[hidden] { display: none; }
#pbApp#pbApp #screen-settings .dc-set-one > .pb-section > .pb-body { padding-left: 0; padding-right: 0; }
#pbApp#pbApp #screen-settings .dc-set-one > .pb-section > .pb-tag { padding-left: 0; }
#pbApp#pbApp #screen-settings .dc-set-one > :is(#settingsNotifSection, #settingsPrivacySection) > .pb-tag { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
#pbApp#pbApp #screen-settings .dc-set-one > :is(#settingsNotifSection, #settingsPrivacySection) { margin-top: 12px; }
#pbApp#pbApp #screen-settings .dc-set-one > :is(#settingsPrefsSection, #settingsNotifSection, #settingsPrivacySection) > .pb-body { padding-top: 0; padding-bottom: 0; margin-top: 0; margin-bottom: 0; }
#pbApp#pbApp #screen-settings .dc-set-one > #settingsPrefsSection > .pb-body { padding-top: 6px; }
#pbApp#pbApp :is(#screen-settings, #screen-tools) .pb-tool-row .sub { font-size: 14px; }
</style>
'''
p.rep('''<script id="dcHomeScript">''', CSS + '''<script id="dcHomeScript">''')
p.save()
