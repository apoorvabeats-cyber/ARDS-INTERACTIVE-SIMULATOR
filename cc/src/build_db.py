import json,sys,importlib
sys.path.insert(0,'.')
from dbhelp import *
import d1,d2,d3,d4,d5
DIS=[d1.ARDS,d1.PANC,d2.AKI,d2.ALF,d3.AHF,d3.TBI,d4.STAT,d4.DIC]
for d in DIS:
  if d['id'] in d5.NEW:
    cs,ls=d5.NEW[d['id']];d['complications']+=cs;d['links']+=ls
  n=len(d['complications'])
  for i,c in enumerate(d['complications']):c['a']=round(-90+360*i/n)
# validate
D={'vessel':{'flow','sat','leak','clot','bleed','isch'},'heart':{'con','rvf','rvdil','lvdil','congest','sept','rate'},'alveolus':{'vent','stretch','leak','fluid','fibro','inflam'},'nephron':{'gfr','injury','urea','k','acid'},'brain':{'swell','mass','shift','hern','isch','perf','amm'},'cell':{'mem','outer','inner','leak','mito','store','tox','swell'}}
errs=0
for d in DIS:
  ids=[c['id'] for c in d['complications']]
  for a,b,t in d['links']:
    assert a in ids and b in ids,(d['id'],a,b)
  assert len(d['phases'])==4
  for c in d['complications']:
    V=D[c['scene']['a']];W=f"{d['id']}/{c['id']}"
    for k in c['state']:
      if k not in V: print('bad state var',W,k);errs+=1
    for r in c['rx']:
      for k in r['fx']:
        if k not in V: print('bad fx var',W,r['id'],k);errs+=1
    ids2=[r['id'] for r in c['rx']]
    if len(set(ids2))!=len(ids2): print('dup rx id',W);errs+=1
    for o in c['outs']:
      if o[1] not in V: print('bad out var',W,o[1]);errs+=1
      if len(o)!=8: print('out len',W,o);errs+=1
    if len(c['prog'])!=4: print('prog',W);errs+=1
    for k in ('trig','rev','org','cell'):
      if not c[k]: print('missing',W,k);errs+=1
    if not any(r['t']=='helps' for r in c['rx']): print('no helps',W);errs+=1
    if not any(r['t']=='harms' for r in c['rx']): print('no harms',W);errs+=1
print('diseases',len(DIS),'complications',sum(len(d['complications']) for d in DIS),'errors',errs)
if errs: sys.exit(1)
json.dump({"version":1,"diseases":DIS},open(sys.argv[1],'w'),ensure_ascii=False,separators=(',',':'))
