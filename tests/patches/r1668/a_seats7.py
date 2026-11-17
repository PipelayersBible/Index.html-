import sys
s=open(sys.argv[1]).read()
a="'pb:trial_seats': 'The beta includes 5 accounts, owner included. Remove someone or wait for a pending invite to expire to add another.'"
b="'pb:trial_seats': 'The beta includes the company account plus 6 people. Remove someone or wait for a pending invite to expire to add another.'"
assert s.count(a)==1; s=s.replace(a,b); open(sys.argv[2],'w').write(s)
