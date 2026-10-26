import re
from collections import Counter, defaultdict

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

def fields(obj):
    em=re.search(r'\be\s*:\s*["\'](\w+)["\']', obj)
    nm=re.search(r'\bn\s*:\s*["\']([^"\']+)["\']', obj)
    rm=re.search(r'\brace\s*:\s*["\']([^"\']+)["\']', obj)
    return (nm.group(1) if nm else '?'), (rm.group(1) if rm else '?'), (em.group(1) if em else None)

nones=[]
for kid,obj in mobs.items():
    name,race,e=fields(obj)
    if e=='none' or e is None:
        nones.append((kid,name,race,e))
print('NONE count', len(nones))
for x in nones:
    print(f"{x[0]}\t{x[1]}\t{x[2]}")

print('\n=== potential illogical ===')
checks=[
    ('water', re.compile(r'火|炎|熔岩|地獄火|炎魔|灼|焰|巴風特')),
    ('fire', re.compile(r'冰|霜|雪|水靈|海|濕|冷|凍')),
    ('earth', re.compile(r'風靈|飛龍|鷹|格利芬|雷電|風')),
    ('wind', re.compile(r'石像|岩石|土|高崙|地靈|龜')),
]
for kid,obj in mobs.items():
    name,race,e=fields(obj)
    if not e or e=='none': continue
    for bad_e, pat in checks:
        if e==bad_e and pat.search(name):
            print(kid, name, race, e)
            break

# dump all assigned for review sample by race
print('\n=== by race element dist ===')
by=defaultdict(Counter)
for kid,obj in mobs.items():
    name,race,e=fields(obj)
    by[race][e or 'MISSING']+=1
for race in sorted(by):
    print(race, dict(by[race]))
