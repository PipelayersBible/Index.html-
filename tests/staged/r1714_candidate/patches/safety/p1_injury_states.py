# state_audit_nov21/safety p1: "Report a serious injury" for the 12 state plans r17.13 left as "not checked".
# python3 p1_injury_states.py in.html out.html   (applies alone on r17.13; also stacks with p2-p5)
# Read Nov 20 2026:
#   MD  COMAR 09.12.21 adopts 29 CFR 1904 (MOSH for OSHA; MOSH 1-800-759-6297)
#       https://labor.maryland.gov/labor/mosh/pdf/091221_employeeinjury-illnessrecords.pdf
#   MN  MNOSHA "Report an accident, fatality or serious injury": 8 h death, 24 h hospital / amputation / eye;
#       651-284-5050 or 877-470-6742, after hours federal OSHA 800-321-6742   https://www.dli.mn.gov/node/1281
#   NV  Nevada OSHA "Report an Accident or Fatality": 8 h / 24 h; 702-486-9020, 775-688-3700
#       https://dir.nv.gov/OSHA/Report_an_Accident_or_Fatality
#   SC  SC OSHA "Report a Severe Injury": 8 h / 24 h; 803-896-7672   https://osha.llr.sc.gov/reportinjury.aspx
#   IA  875 IAC 4 adopts 29 CFR 1904.0-.46; 4.3(2)(b) phone 877-242-6742
#       https://www.legis.iowa.gov/docs/iac/chapter/04-30-2025.875.4.pdf
#   AZ, IN, NC, NM, TN, VT, WY: "adopted identical" in OSHA's state adoption table for the 2014 reporting rule
#       https://www.osha.gov/stateplans/adoption/standards/2014-09-18 (page updated Sept 28 2015). Medium confidence.
# Maryland narrows "amputation" to bone or cartilage loss; the line keeps the plain word (strictest wins).
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _rep import P
p = P()
p.rep('''    KY: 'The company reports it to Kentucky OSH or OSHA (1-800-321-6742) within 8 hours for a death, and within 24 hours for a hospital stay, an amputation or a lost eye (803 KAR 2:181).'
  };''', '''    KY: 'The company reports it to Kentucky OSH or OSHA (1-800-321-6742) within 8 hours for a death, and within 24 hours for a hospital stay, an amputation or a lost eye (803 KAR 2:181).',
    /* state_audit_nov21/safety: read Nov 20 2026 (MD COMAR 09.12.21; MN DLI; NV DIR; SC LLR; IA 875 IAC 4) */
    MD: 'The company reports it to MOSH (1-800-759-6297) within 8 hours for a death, and within 24 hours for a hospital stay, an amputation or a lost eye (COMAR 09.12.21).',
    MN: 'The company reports it to MNOSHA (651-284-5050 or 877-470-6742; after hours, federal OSHA 1-800-321-6742) within 8 hours for a death, and within 24 hours for a hospital stay, an amputation or a lost eye.',
    NV: 'The company reports it to Nevada OSHA (702-486-9020 south, 775-688-3700 north) within 8 hours for a death, and within 24 hours for a hospital stay, an amputation or a lost eye.',
    SC: 'The company reports it to SC OSHA (803-896-7672) within 8 hours for a death, and within 24 hours for a hospital stay, an amputation or a lost eye.',
    IA: 'The company reports it to Iowa OSHA (877-242-6742) within 8 hours for a death, and within 24 hours for a hospital stay, an amputation or a lost eye (875 IAC 4).'
  };
  /* these plans adopted the federal reporting rule word for word (OSHA state adoption table, 2014 reporting rule) */
  const PB_INJ_SAME = ['AZ', 'IN', 'NC', 'NM', 'TN', 'VT', 'WY'];''')
p.rep('''    if (R.osha === 'state') return 'The company reports it to ' + R.osha_name''',
      '''    if (R.osha === 'state' && PB_INJ_SAME.indexOf(code) >= 0) return 'The company reports it to ' + R.osha_name + ' within 8 hours for a death, and within 24 hours for a hospital stay, an amputation or a lost eye (the federal rule, 29 CFR 1904.39).';
    if (R.osha === 'state') return 'The company reports it to ' + R.osha_name''')
p.save()
