#!/usr/bin/env python3
"""Rig the anatomy reference body (models/anatomy/human-reference.glb, Human Reference Atlas Visible Human Male skin,
CC BY 4.0, Kristen Browne and Heidi Schlehlein / HuBMAP) as a posable ICU patient.

Output: a skinned GLB with the same bone names as the MakeHuman patients, a 'skin' primitive (whole body) and a 'gown'
primitive (hospital top with short sleeves and shorts, an inflated copy of the skin triangles), pelvis at the origin,
about 1.72 m tall, facing +Z, Y up. Skin weights come from distance to bone segments (no Blender needed).

usage: python3 tools/rig_reference.py models/anatomy/human-reference.glb critical-care-universe/universe/patients/male_ref.glb male
       python3 tools/rig_reference.py models/anatomy/female-human.glb critical-care-universe/universe/patients/female_ref.glb female
"""
import json, struct, sys
import numpy as np

src, dst = sys.argv[1], sys.argv[2]
b = open(src, 'rb').read()
jl = struct.unpack('<I', b[12:16])[0]
J = json.loads(b[20:20 + jl]); binbuf = b[20 + jl + 8:]

def prim(name):
    mi = [m['name'] for m in J['meshes']].index(name); p = J['meshes'][mi]['primitives'][0]
    pa = J['accessors'][p['attributes']['POSITION']]; bv = J['bufferViews'][pa['bufferView']]
    raw = np.frombuffer(binbuf, np.float32, pa['count'] * 6, bv.get('byteOffset', 0)).reshape(-1, 6)
    ia = J['accessors'][p['indices']]; ib = J['bufferViews'][ia['bufferView']]
    I = np.frombuffer(binbuf, np.uint16, ia['count'], ib.get('byteOffset', 0) + ia.get('byteOffset', 0)).reshape(-1, 3)
    return raw[:, :3].astype(np.float64), raw[:, 3:].astype(np.float64), I.astype(np.int64)

P, N, I = prim('body')
PROFILE = sys.argv[3] if len(sys.argv) > 3 else 'male'
V3 = lambda *a: np.array(a, float)

# Per-body landmarks, in the source mesh's own coordinates (metres). Measured from front/side silhouettes of each mesh.
CFG = {
 'male': dict(
    ORG=V3(0, 0.95, -0.02), SC=0.94, credit='Body: Human Reference Atlas VH_M_skin, Kristen Browne and Heidi Schlehlein / HuBMAP, CC BY 4.0. Rig and gown: this repository.',
    root=V3(0, 0.95, -0.02), spine03=V3(0, 1.20, -0.03), neck=V3(0, 1.50, -0.04), head=V3(0, 1.60, -0.02), headEnd=V3(0, 1.80, 0), eye=V3(0.036, 1.725, 0.083),
    clav=V3(0.03, 1.46, -0.03), uarm=V3(0.19, 1.40, -0.03), larm=V3(0.31, 1.17, -0.02), wrist=V3(0.40, 1.015, 0.0), hand=V3(0.52, 0.89, 0.04),
    hip=V3(0.10, 0.92, -0.01), thigh=V3(0.12, 0.70, -0.01), knee=V3(0.15, 0.50, -0.02), shin=V3(0.17, 0.30, -0.05), ankle=V3(0.20, 0.09, -0.05), toe=V3(0.21, 0.02, 0.10),
    spineTop=V3(0, 1.50, -0.04), pelvisEnd=V3(0, 0.99, -0.02),
    rad=dict(root=.17, spine05=.15, spine03=.17, neck01=.055, head=.11, clav=.05, uarm=.055, larm=.045, wrist=.06, hip=.10, thigh=.085, knee=.06, shin=.055, ankle=.055),
    armSide=0.10, legSide=0.045, armY=0.8, legY=1.02,
    chestLo=1.0, chestHi=1.53, neckY=1.47, neckX=0.10, sleeveY=1.1, waist=1.02, thighHem=0.58, thigh2Hem=0.62),
 'female': dict(
    ORG=V3(0, 0.89, -0.02), SC=0.97, credit='Body: Human Reference Atlas United Female v1.5 (female-human.glb), HuBMAP, CC BY 4.0. Rig and gown: this repository.',
    root=V3(0, 0.89, -0.02), spine03=V3(0, 1.12, -0.03), neck=V3(0, 1.40, -0.04), head=V3(0, 1.49, -0.02), headEnd=V3(0, 1.68, 0), eye=V3(0.036, 1.56, 0.077),
    clav=V3(0.03, 1.36, -0.03), uarm=V3(0.19, 1.31, -0.03), larm=V3(0.29, 1.07, -0.02), wrist=V3(0.375, 0.90, 0.0), hand=V3(0.47, 0.78, 0.04),
    hip=V3(0.09, 0.85, -0.01), thigh=V3(0.105, 0.65, -0.01), knee=V3(0.11, 0.45, 0.0), shin=V3(0.12, 0.27, -0.04), ankle=V3(0.13, 0.08, -0.04), toe=V3(0.14, 0.02, 0.10),
    spineTop=V3(0, 1.40, -0.04), pelvisEnd=V3(0, 0.93, -0.02),
    rad=dict(root=.16, spine05=.14, spine03=.15, neck01=.05, head=.10, clav=.045, uarm=.05, larm=.04, wrist=.055, hip=.095, thigh=.08, knee=.055, shin=.05, ankle=.05),
    armSide=0.09, legSide=0.04, armY=0.72, legY=0.95,
    chestLo=0.93, chestHi=1.42, neckY=1.36, neckX=0.09, sleeveY=1.0, waist=0.95, thighHem=0.52, thigh2Hem=0.56),
}[PROFILE]
C = CFG; ORG = C['ORG']; SC = C['SC']

# ---- skeleton: name -> (parent, joint position in source coordinates) ----
JT = {
    'root': (None, C['root']), 'spine05': ('root', C['root']), 'spine03': ('spine05', C['spine03']),
    'neck01': ('spine03', C['neck']), 'head': ('neck01', C['head']),
    'eye.L': ('head', V3(C['eye'][0], C['eye'][1], C['eye'][2])), 'eye.R': ('head', V3(-C['eye'][0], C['eye'][1], C['eye'][2])),
}
LEG = (('upperleg01', 'hip', 'upperleg02'), ('upperleg02', 'thigh', 'lowerleg01'), ('lowerleg01', 'knee', 'lowerleg02'), ('lowerleg02', 'shin', 'foot'))
def side(v, k): return V3(v[0] * k, v[1], v[2])
for s, k in (('L', 1), ('R', -1)):
    JT.update({
        'clavicle.' + s: ('neck01', side(C['clav'], k)),
        'upperarm01.' + s: ('clavicle.' + s, side(C['uarm'], k)),
        'lowerarm01.' + s: ('upperarm01.' + s, side(C['larm'], k)),
        'wrist.' + s: ('lowerarm01.' + s, side(C['wrist'], k)),
        'upperleg01.' + s: ('root', side(C['hip'], k)),
        'upperleg02.' + s: ('upperleg01.' + s, side(C['thigh'], k)),
        'lowerleg01.' + s: ('upperleg02.' + s, side(C['knee'], k)),
        'lowerleg02.' + s: ('lowerleg01.' + s, side(C['shin'], k)),
        'foot.' + s: ('lowerleg02.' + s, side(C['ankle'], k)),
    })
names = list(JT.keys()); idx = {n: i for i, n in enumerate(names)}
# segment end points and radii used for skin weights
END = {'root': C['pelvisEnd'], 'spine05': C['spine03'], 'spine03': C['spineTop'], 'neck01': C['head'], 'head': C['headEnd']}
R = C['rad']
RAD = {'root': R['root'], 'spine05': R['spine05'], 'spine03': R['spine03'], 'neck01': R['neck01'], 'head': R['head']}
for s, k in (('L', 1), ('R', -1)):
    END.update({'clavicle.' + s: side(C['uarm'], k), 'upperarm01.' + s: side(C['larm'], k), 'lowerarm01.' + s: side(C['wrist'], k),
                'wrist.' + s: side(C['hand'], k), 'upperleg01.' + s: side(C['thigh'], k), 'upperleg02.' + s: side(C['knee'], k),
                'lowerleg01.' + s: side(C['shin'], k), 'lowerleg02.' + s: side(C['ankle'], k), 'foot.' + s: side(C['toe'], k)})
    RAD.update({'clavicle.' + s: R['clav'], 'upperarm01.' + s: R['uarm'], 'lowerarm01.' + s: R['larm'], 'wrist.' + s: R['wrist'], 'upperleg01.' + s: R['hip'],
                'upperleg02.' + s: R['thigh'], 'lowerleg01.' + s: R['knee'], 'lowerleg02.' + s: R['shin'], 'foot.' + s: R['ankle']})
skin_bones = [n for n in names if not n.startswith('eye.')]

def seg_dist(Pts, a, e):
    d = e - a; t = np.clip(((Pts - a) @ d) / (d @ d), 0, 1)
    return np.linalg.norm(Pts - (a + np.outer(t, d)), axis=1), t

D = np.full((len(P), len(skin_bones)), 9.0); T = np.zeros_like(D)
for bi, n in enumerate(skin_bones):
    dist, t = seg_dist(P, JT[n][1], END[n]); dn = dist / RAD[n]
    sd = n[-1] if n[-2] == '.' else None
    if sd:
        ok = (P[:, 0] * (1 if sd == 'L' else -1)) > (C['legSide'] if n.startswith(('upperleg', 'lowerleg', 'foot')) else C['armSide'] if n.startswith(('upperarm', 'lowerarm', 'wrist')) else 0.0)
        if n.startswith(('upperarm', 'lowerarm', 'wrist')): ok &= P[:, 1] > C['armY']
        if n.startswith(('upperleg', 'lowerleg', 'foot')): ok &= P[:, 1] < C['legY']
        dn = np.where(ok, dn, 99.0)
    D[:, bi] = dn; T[:, bi] = t
W = 1.0 / np.maximum(D, 0.05) ** 6
top = np.argsort(-W, axis=1)[:, :4]
Wt = np.take_along_axis(W, top, 1); Wt /= Wt.sum(1, keepdims=True)
dom = np.array(skin_bones)[top[:, 0]]; domt = np.take_along_axis(T, top[:, :1], 1)[:, 0]
# keep the head and neck rigid-ish and vertex weights tidy
Wt[Wt < 0.02] = 0; Wt /= Wt.sum(1, keepdims=True)

# ---- gown (top with short sleeves) and shorts, as an inflated subset of the body ----
Cx = P[I].mean(1); vdom = dom[I]; vt = domt[I]
def tri_all(f): return f(0) & f(1) & f(2)
def vtor(k):
    d = vdom[:, k]; y = P[I[:, k], 1]; x = np.abs(P[I[:, k], 0])
    sleeve = np.isin(d, ('upperarm01.L', 'upperarm01.R')) & (vt[:, k] < 0.55)
    chest = np.isin(d, ('spine05', 'spine03', 'clavicle.L', 'clavicle.R')) & (y > C['chestLo']) & (y < C['chestHi']) & ~((x < C['neckX']) & (y > C['neckY']))
    return chest | (sleeve & (y > C['sleeveY']))
def vshort(k):
    d = vdom[:, k]; y = P[I[:, k], 1]
    return (np.isin(d, ('root', 'upperleg01.L', 'upperleg01.R')) & (y > C['thighHem'])) | (np.isin(d, ('upperleg02.L', 'upperleg02.R')) & (y > C['thigh2Hem'])) | ((d == 'spine05') & (y < C['waist']))
gm = tri_all(lambda k: vtor(k) | vshort(k))
GI = I[gm]
print('triangles: body', len(I), 'gown+shorts', len(GI))

# ---- transform to the patient frame (pelvis at the origin, 1.72 m) ----
tf = lambda a: (a - ORG) * SC
P2 = tf(P); GP = P2 + N * 0.008
jpos = {n: tf(JT[n][1]) for n in names}

# ---- GLB writer ----
buf = bytearray(); views = []; accs = []
def add(arr, typ, comp, target=None, mm=False):
    while len(buf) % 4: buf.append(0)
    off = len(buf); buf.extend(arr.tobytes()); views.append({'buffer': 0, 'byteOffset': off, 'byteLength': arr.nbytes, **({'target': target} if target else {})})
    cnt = len(arr) if typ == 'SCALAR' else len(arr)
    a = {'bufferView': len(views) - 1, 'componentType': comp, 'count': int(cnt), 'type': typ}
    if mm: a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
    accs.append(a); return len(accs) - 1
aP = add(P2.astype(np.float32), 'VEC3', 5126, 34962, True); aG = add(GP.astype(np.float32), 'VEC3', 5126, 34962, True)
aN = add(N.astype(np.float32), 'VEC3', 5126, 34962)
jidx = np.zeros((len(P), 4), np.uint8)
for r in range(4): jidx[:, r] = [idx[skin_bones[c]] for c in top[:, r]]
aJ = add(jidx, 'VEC4', 5121, 34962); aW = add(Wt.astype(np.float32), 'VEC4', 5126, 34962)
aI = add(I.astype(np.uint16).reshape(-1), 'SCALAR', 5123, 34963); aGI = add(GI.astype(np.uint16).reshape(-1), 'SCALAR', 5123, 34963)
ibm = []
for n in names:
    m = np.eye(4); m[:3, 3] = -jpos[n]; ibm.append(m.T.astype(np.float32))   # column-major inverse bind (pure translation)
aB = add(np.array(ibm).reshape(-1, 16), 'MAT4', 5126)
accs[aB]['count'] = len(names)
nodes = [{'name': 'armature', 'children': [idx['root'] + 2]}, {'name': 'body', 'mesh': 0, 'skin': 0, 'extras': {'noShorts': True, 'patientScale': 1.0}}]
for n in names:
    par = JT[n][0]; loc = jpos[n] - (jpos[par] if par else 0)
    nodes.append({'name': n, 'translation': np.round(loc, 6).tolist()})
for n in names:
    ch = [idx[c] + 2 for c in names if JT[c][0] == n]
    if ch: nodes[idx[n] + 2]['children'] = ch
gltf = {'asset': {'version': '2.0', 'generator': 'tools/rig_reference.py', 'copyright': C['credit']},
        'scene': 0, 'scenes': [{'nodes': [0, 1]}], 'nodes': nodes,
        'skins': [{'joints': [i + 2 for i in range(len(names))], 'inverseBindMatrices': aB, 'skeleton': 2}],
        'meshes': [{'name': 'human', 'primitives': [
            {'attributes': {'POSITION': aP, 'NORMAL': aN, 'JOINTS_0': aJ, 'WEIGHTS_0': aW}, 'indices': aI, 'material': 0},
            {'attributes': {'POSITION': aG, 'NORMAL': aN, 'JOINTS_0': aJ, 'WEIGHTS_0': aW}, 'indices': aGI, 'material': 1}]}],
        'materials': [{'name': 'skin', 'pbrMetallicRoughness': {'baseColorFactor': [0.72, 0.52, 0.4, 1], 'metallicFactor': 0, 'roughnessFactor': 0.6}},
                      {'name': 'gown', 'pbrMetallicRoughness': {'baseColorFactor': [0.55, 0.77, 0.84, 1], 'metallicFactor': 0, 'roughnessFactor': 0.85}, 'doubleSided': True}],
        'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': len(buf)}]}
js = json.dumps(gltf, separators=(',', ':')).encode()
while len(js) % 4: js += b' '
while len(buf) % 4: buf.append(0)
out = b'glTF' + struct.pack('<II', 2, 12 + 8 + len(js) + 8 + len(buf)) + struct.pack('<I', len(js)) + b'JSON' + js + struct.pack('<I', len(buf)) + b'BIN\x00' + bytes(buf)
open(dst, 'wb').write(out)
print('wrote', dst, len(out) // 1024, 'KB', 'height', round((P2[:, 1].max() - P2[:, 1].min()), 3))
