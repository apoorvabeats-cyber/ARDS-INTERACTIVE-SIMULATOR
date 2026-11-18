import json
def rx(id,n,t,note,**fx):
    return {"id":id,"n":n,"t":t,"note":note,"fx":{k:v for k,v in fx.items()}}
H,X="helps","harms"
def comp(id,name,a,on,scene,state,outs,rxs,trig,rev,org,cell,prog,m=1,parts=None,vn=None,st=None):
    c={"id":id,"name":name,"a":a,"on":on,"m":m,"scene":scene,"state":state,"outs":outs,"rx":rxs,"trig":trig,"rev":rev,"org":org,"cell":cell,"prog":prog}
    if parts:c["parts"]=parts
    if vn:c["vn"]=vn
    if st:c["st"]=st
    return c
def dis(id,name,phases,rxlabel,rxtext,links,comps):
    return {"id":id,"name":name,"phases":phases,"rxlabel":rxlabel,"rxtext":rxtext,"links":links,"complications":comps}
