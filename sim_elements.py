# Simulate 34-mob-race.js element inference against 00-data.js
import re, json
from collections import Counter, defaultdict

# --- load mobs ---
s=open('/workspace/idle-lineage/elf-update/js/00-data.js',encoding='utf-8').read()
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

def getf(obj):
    em=re.search(r'\be\s*:\s*["\'](\w+)["\']', obj)
    nm=re.search(r'\bn\s*:\s*["\']([^"\']+)["\']', obj)
    rm=re.search(r'\brace\s*:\s*["\']([^"\']+)["\']', obj)
    return {'n': nm.group(1) if nm else '?', 'race': rm.group(1) if rm else '?', 'e': em.group(1) if em else None}

# Load race/element logic by exec-ish - mirror JS
exec(open('/workspace/idle-lineage/elf-update/js/34-mob-race.js',encoding='utf-8').read()
     .replace('const ','')
     .replace('let ','')
     .replace('function ', 'def ')
     .replace('||', ' or ')
     .replace('&&', ' and ')
     .replace('!', ' not ')
     .replace('true','True').replace('false','False').replace('null','None')
     , {})
