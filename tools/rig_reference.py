#!/usr/bin/env python3
"""Rig the anatomy reference body (models/anatomy/human-reference.glb, Human Reference Atlas Visible Human Male skin,
CC BY 4.0, Kristen Browne and Heidi Schlehlein / HuBMAP) as a posable ICU patient.

Output: a skinned GLB with the same bone names as the MakeHuman patients, a 'skin' primitive (whole body) and a 'gown'
primitive (hospital top with short sleeves and shorts, an inflated copy of the skin triangles), pelvis at the origin,
about 1.72 m tall, facing +Z, Y up. Skin weights come from distance to bone segments (no Blender needed).

usage: python3 tools/rig_reference.py models/anatomy/human-reference.glb critical-care-universe/universe/patients/male_ref.glb
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
ORG = np.array([0.0, 0.95, -0.02]); SC = 0.94
V3 = lambda *a: np.array(a, float)

# ---- skeleton: name -> (parent, joint position in source coordinates) ----
JT = {
    'root': (None, V3(0, 0.95, -0.02)), 'spine05': ('root', V3(0, 0.95, -0.02)), 'spine03': ('spine05', V3(0, 1.20, -0.03)),
    'neck01': ('spine03', V3(0, 1.50, -0.04)), 'head': ('neck01', V3(0, 1.60, -0.02)),
    'eye.L': ('head', V3(0.036, 1.725, 0.083)), 'eye.R': ('head', V3(-0.035, 1.725, 0.083)),
}
for s, k in (('L', 1), ('R', -1)):
    JT.update({
        'clavicle.' + s: ('neck01', V3(k * 0.03, 1.46, -0.03)),
        'upperarm01.' + s: ('clavicle.' + s, V3(k * 0.19, 1.40, -0.03)),
        'lowerarm01.' + s: ('upperarm01.' + s, V3(k * 0.31, 1.17, -0.02)),
        'wrist.' + s: ('lowerarm01.' + s, V3(k * 0.40, 1.015, 0.0)),
        'upperleg01.' + s: ('root', V3(k * 0.10, 0.92, -0.01)),
        'upperleg02.' + s: ('upperleg01.' + s, V3(k * 0.12, 0.70, -0.01)),
        'lowerleg01.' + s: ('upperleg02.' + s, V3(k * 0.15, 0.50, -0.02)),
        'lowerleg02.' + s: ('lowerleg01.' + s, V3(k * 0.17, 0.30, -0.05)),
        'foot.' + s: ('lowerleg02.' + s, V3(k * 0.20, 0.09, -0.05)),
    })
names = list(JT.keys()); idx = {n: i for i, n in enumerate(names)}
# segment end points and radii used for skin weights
END = {'root': V3(0, 0.99, -0.02), 'spine05': V3(0, 1.20, -0.03), 'spine03': V3(0, 1.50, -0.04), 'neck01': V3(0, 1.60, -0.02), 'head': V3(0, 1.80, 0.0)}
RAD = {'root': .17, 'spine05': .15, 'spine03': .17, 'neck01': .055, 'head': .11}
for s, k in (('L', 1), ('R', -1)):
    END.update({'clavicle.' + s: V3(k * 0.19, 1.40, -0.03), 'upperarm01.' + s: V3(k * 0.31, 1.17, -0.02), 'lowerarm01.' + s: V3(k * 0.40, 1.015, 0),
                'wrist.' + s: V3(k * 0.52, 0.89, 0.04), 'upperleg01.' + s: V3(k * 0.12, 0.70, -0.01), 'upperleg02.' + s: V3(k * 0.15, 0.50, -0.02),
                'lowerleg01.' + s: V3(k * 0.17, 0.30, -0.05), 'lowerleg02.' + s: V3(k * 0.20, 0.09, -0.05), 'foot.' + s: V3(k * 0.21, 0.02, 0.10)})
    RAD.update({'clavicle.' + s: .05, 'upperarm01.' + s: .055, 'lowerarm01.' + s: .045, 'wrist.' + s: .06, 'upperleg01.' + s: .10, 'upperleg02.' + s: .085,
                'lowerleg01.' + s: .06, 'lowerleg02.' + s: .055, 'foot.' + s: .055})
skin_bones = [n for n in names if not n.startswith('eye.')]

def seg_dist(Pts, a, e):
    d = e - a; t = np.clip(((Pts - a) @ d) / (d @ d), 0, 1)
    return np.linalg.norm(Pts - (a + np.outer(t, d)), axis=1), t

D = np.full((len(P), len(skin_bones)), 9.0); T = np.zeros_like(D)
for bi, n in enumerate(skin_bones):
    dist, t = seg_dist(P, JT[n][1], END[n]); dn = dist / RAD[n]
    side = n[-1] if n[-2] == '.' else None
    if side:
        ok = (P[:, 0] * (1 if side == 'L' else -1)) > (0.045 if n.startswith(('upperleg', 'lowerleg', 'foot')) else 0.10 if n.startswith(('upperarm', 'lowerarm', 'wrist')) else 0.0)
        if n.startswith(('upperarm', 'lowerarm', 'wrist')): ok &= P[:, 1] > 0.8
        if n.startswith(('upperleg', 'lowerleg', 'foot')): ok &= P[:, 1] < 1.02
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
torso_names = ('spine05', 'spine03', 'clavicle.L', 'clavicle.R', 'upperarm01.L', 'upperarm01.R')
def vtor(k):
    d = vdom[:, k]; y = P[I[:, k], 1]; x = np.abs(P[I[:, k], 0])
    sleeve = np.isin(d, ('upperarm01.L', 'upperarm01.R')) & (vt[:, k] < 0.55)
    chest = np.isin(d, ('spine05', 'spine03', 'clavicle.L', 'clavicle.R')) & (y > 1.0) & (y < 1.53) & ~((x < 0.10) & (y > 1.47))
    return chest | (sleeve & (y > 1.1))
def vshort(k):
    d = vdom[:, k]; y = P[I[:, k], 1]
    return (np.isin(d, ('root', 'upperleg01.L', 'upperleg01.R')) & (y > 0.58)) | (np.isin(d, ('upperleg02.L', 'upperleg02.R')) & (y > 0.62)) | ((d == 'spine05') & (y < 1.02))
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
gltf = {'asset': {'version': '2.0', 'generator': 'tools/rig_reference.py', 'copyright': 'Body: Human Reference Atlas VH_M_skin, Kristen Browne and Heidi Schlehlein / HuBMAP, CC BY 4.0. Rig and gown: this repository.'},
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
