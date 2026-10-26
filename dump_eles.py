import re
src='/workspace/idle-lineage/elf-update/js/00-data.js'
s=open(src,'r',encoding='utf-8').read()
start=s.find('mobs:')
i=s.find('{', start)
depth=0
for j in range(i, len(s)):
    if s[j]=='{': depth+=1
    elif s[j]=='}':
        depth-=1
        if depth==0:
            end=j+1; break
body=s[i+1:end-1]
mobs={}
k=0; n=len(body)
while k<n:
    while k<n and body[k] in ' \t\r\n,': k+=1
    if k>=n: break
    m=re.match(r'(["\']?)([A-Za-z0-9_]+)\1\s*:', body[k:])
    if not m: k+=1; continue
    kid=m.group(2); k+=m.end()
    while k<n and body[k] in ' \t\r\n': k+=1
    if k>=n or body[k]!='{': continue
    start_obj=k; depth=0
    for j in range(k,n):
        if body[j]=='{': depth+=1
        elif body[j]=='}':
            depth-=1
            if depth==0:
                mobs[kid]=body[start_obj:j+1]; k=j+1; break
    else: break

rows=[]
for kid,obj in mobs.items():
    em=re.search(r'\be\s*:\s*["\'](\w+)["\']', obj)
    nm=re.search(r'\bn\s*:\s*["\']([^"\']+)["\']', obj)
    rm=re.search(r'\brace\s*:\s*["\']([^"\']+)["\']', obj)
    rows.append((kid, nm.group(1) if nm else '?', rm.group(1) if rm else '?', em.group(1) if em else 'MISSING'))
# print all with current e for manual rule design - group by e
from collections import defaultdict
by=defaultdict(list)
for r in rows:
    by[r[3]].append(r)
for e in ['fire','water','wind','earth','none']:
    print(f'\n#### {e} ({len(by[e])}) ####')
    for kid,n,race,ee in sorted(by[e], key=lambda x: x[1]):
        print(f'{kid}\t{n}\t{race}')
