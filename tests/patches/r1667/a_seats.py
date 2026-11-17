import sys
s=open(sys.argv[1]).read()
a="""  const PB_CM_MSG = {
    'pb:signed_out': 'Sign in again, then try again.',"""
b="""  const PB_CM_MSG = {
    'pb:trial_seats': 'The beta includes 5 accounts, owner included. Remove someone or wait for a pending invite to expire to add another.', /* r16.67 */
    'pb:signed_out': 'Sign in again, then try again.',"""
assert s.count(a)==1; s=s.replace(a,b); open(sys.argv[2],'w').write(s)
