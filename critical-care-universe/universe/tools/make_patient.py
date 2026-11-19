"""Generate a rigged human GLB headlessly with MakeHuman 1.x (CC0 output).
usage (cwd = MakeHuman's makehuman/ folder):
  python make_patient.py out.glb gender(0 female..1 male) age_years weight(0..1) muscle(0..1) height(0..1) afr asi cau
Body skin and hospital gown are separate primitives. Bones are world-aligned (identity rest rotation) so a pose
is just a rotation per joint. Units are metres, Y up, facing +Z, T-pose.
"""
import sys, os, json, struct
sys.path = [".", "./core", "./lib", "./shared", "./apps", "./plugins"] + sys.path
os.environ["QT_QPA_PLATFORM"] = "offscreen"
import numpy as np
import getpath, files3d
from core import G


class _A:
    def progress(self, *a, **k): pass
    def __getattr__(self, n): return lambda *a, **k: None


G.app = _A()
from human import Human
import humanmodifier, skeleton

out, gender, years, weight, muscle, height, afr, asi, cau = sys.argv[1], *map(float, sys.argv[2:10])


def age_value(y):
    pts = [(1, 0.0), (11, 0.1875), (25, 0.5), (90, 1.0)]
    for (y0, v0), (y1, v1) in zip(pts, pts[1:]):
        if y <= y1:
            return v0 + (v1 - v0) * (y - y0) / (y1 - y0)
    return 1.0


h = Human(files3d.loadMesh(getpath.getSysDataPath("3dobjs/base.obj")))
G.app.selectedHuman = h
humanmodifier.loadModifiers(getpath.getSysDataPath("modifiers/modeling_modifiers.json"), h)
h.setGender(gender, updateModifier=True) if False else h.setGender(gender)
h.setAge(age_value(years)); h.setWeight(weight); h.setMuscle(muscle); h.setHeight(height)
h.setAfrican(afr, sync=False); h.setAsian(asi, sync=False); h.setCaucasian(cau, sync=False)
h.applyAllTargets()
sk = skeleton.load(getpath.getSysDataPath("rigs/default.mhskel"), h.meshData)
h.setBaseSkeleton(sk)
vw = sk.vertexWeights

M = h.meshData
coord = np.array(M.coord, dtype=np.float64) * 0.1          # decimetres -> metres
fv = np.array(M.fvert); fu = np.array(M.fuvs); tex = np.array(M.texco)
body = np.array(M.group) == 0
fv, fu = fv[body], fu[body]

# ---- bones: keep a small, useful set; fold every other bone into its nearest kept ancestor ----
KEEP = ["root", "spine05", "spine04", "spine03", "spine02", "spine01", "neck01", "neck02", "neck03", "head",
        "pelvis.L", "pelvis.R", "upperleg01.L", "upperleg01.R", "upperleg02.L", "upperleg02.R", "lowerleg01.L", "lowerleg01.R",
        "lowerleg02.L", "lowerleg02.R", "foot.L", "foot.R", "clavicle.L", "clavicle.R", "shoulder01.L", "shoulder01.R",
        "upperarm01.L", "upperarm01.R", "upperarm02.L", "upperarm02.R", "lowerarm01.L", "lowerarm01.R", "lowerarm02.L",
        "lowerarm02.R", "wrist.L", "wrist.R", "eye.L", "eye.R"]
allb = {b.name: b for b in sk.getBones()}


def kept(name):
    while name not in KEEP:
        name = allb[name].parent.name
    return name


idx = {n: i for i, n in enumerate(KEEP)}
# the order must put parents first
order = []
def add(n):
    if n in order: return
    p = allb[n].parent.name if allb[n].parent else None
    if p: add(kept(p) if p not in KEEP else p)
    order.append(n)
for n in KEEP: add(n)
idx = {n: i for i, n in enumerate(order)}
parent = [(-1 if not allb[n].parent else idx[kept(allb[n].parent.name)]) for n in order]
head = np.array([allb[n].headPos * 0.1 for n in order], dtype=np.float64)

nv = coord.shape[0]
W = np.zeros((nv, len(order)), dtype=np.float64)
for bname, (verts, weights) in vw.data.items():
    k = idx[kept(bname)]
    for v, w in zip(verts, weights):
        if v < nv: W[v, k] += w

# ---- weld: unique (vertex, uv) corners; triangulate quads ----
corner = {}
pos_i, uv_l = [], []
def cid(v, u):
    key = (int(v), int(u))
    if key not in corner:
        corner[key] = len(pos_i); pos_i.append(int(v)); uv_l.append(tex[u])
    return corner[key]
tris, tri_face = [], []
for f in range(len(fv)):
    q = [cid(fv[f][i], fu[f][i]) for i in range(4)]
    if fv[f][2] == fv[f][3]:
        tris.append([q[0], q[1], q[2]]); tri_face.append(f)
    else:
        tris.append([q[0], q[1], q[2]]); tri_face.append(f)
        tris.append([q[0], q[2], q[3]]); tri_face.append(f)
tris = np.array(tris); tri_face = np.array(tri_face)
pos_i = np.array(pos_i)

# smooth normals on original (unsplit) vertices
nrm = np.zeros((nv, 3))
tv = np.array([[pos_i[a], pos_i[b], pos_i[c]] for a, b, c in tris])
e1 = coord[tv[:, 1]] - coord[tv[:, 0]]; e2 = coord[tv[:, 2]] - coord[tv[:, 0]]
fn = np.cross(e1, e2)
for i in range(3): np.add.at(nrm, tv[:, i], fn)
nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-12)

# gown: faces dominated by trunk / upper-arm bones
GOWN = {"root", "spine05", "spine04", "spine03", "spine02", "spine01", "pelvis.L", "pelvis.R", "clavicle.L", "clavicle.R",
        "shoulder01.L", "shoulder01.R", "upperarm01.L", "upperarm01.R", "upperarm02.L", "upperarm02.R"}
gw = np.zeros(nv)
for n in GOWN: gw += W[:, idx[n]]
tri_gown = gw[tv].mean(axis=1) > 0.62
# drop the sleeves below mid upper arm and the legs from the gown
ymid = coord[:, 1]
tri_gown &= (ymid[tv].mean(axis=1) > np.percentile(ymid, 40))

# vertex data per corner
P = coord[pos_i]; N = nrm[pos_i]; UV = np.array(uv_l); UV[:, 1] = 1 - UV[:, 1]
Wc = W[pos_i]
top = np.argsort(-Wc, axis=1)[:, :4]
Jn = np.take_along_axis(Wc, top, axis=1)
Jn = Jn / np.maximum(Jn.sum(axis=1, keepdims=True), 1e-9)
JI = top.astype(np.uint16)

# inflate gown corners along their normal
gown_corner = np.zeros(len(P), dtype=bool)
for t in tris[tri_gown]: gown_corner[t] = True
P2 = P.copy(); P2[gown_corner] += N[gown_corner] * 0.006

bin_ = bytearray(); views = []; accs = []
def push(arr, target=None, comp=5126, typ="VEC3", minmax=False, norm=False):
    global bin_
    while len(bin_) % 4: bin_.append(0)
    off = len(bin_); bin_ += arr.tobytes()
    views.append({"buffer": 0, "byteOffset": off, "byteLength": arr.nbytes, **({"target": target} if target else {})})
    a = {"bufferView": len(views) - 1, "componentType": comp, "count": int(arr.shape[0]), "type": typ}
    if norm: a["normalized"] = True
    if minmax: a["min"] = arr.min(axis=0).tolist(); a["max"] = arr.max(axis=0).tolist()
    accs.append(a); return len(accs) - 1
aPos = push(P2.astype(np.float32), 34962, minmax=True)
N4 = np.zeros((len(N), 4), dtype=np.int8); N4[:, :3] = np.round(N * 127).astype(np.int8)
aNrm = push(N4, 34962, 5120, "VEC4", norm=True) if False else None
# glTF requires 4-byte alignment per vertex for normalized int8 VEC3: pad to VEC4 is not allowed for NORMAL, so keep float normals
aNrm = push(N.astype(np.float32), 34962)
aJ = push(JI.astype(np.uint8), 34962, 5121, "VEC4")
Jq = np.round(Jn * 255).astype(np.uint8)
Jq[np.arange(len(Jq)), Jq.argmax(axis=1)] += (255 - Jq.sum(axis=1).astype(int)).astype(np.uint8)
aW = push(Jq, 34962, 5121, "VEC4", norm=True)
ibm = np.zeros((len(order), 16), dtype=np.float32)
for i in range(len(order)):
    m = np.identity(4); m[:3, 3] = -head[i]; ibm[i] = m.T.reshape(16)
aIBM = push(ibm, None, 5126, "MAT4")
prims = []
for sel, mat in ((~tri_gown, 0), (tri_gown, 1)):
    t = tris[sel].astype(np.uint16)
    ai = push(t.reshape(-1), 34963, 5123, "SCALAR")
    prims.append({"attributes": {"POSITION": aPos, "NORMAL": aNrm, "JOINTS_0": aJ, "WEIGHTS_0": aW}, "indices": ai, "material": mat})
nodes = []
for i, n in enumerate(order):
    t = (head[i] - (head[parent[i]] if parent[i] >= 0 else 0)).tolist()
    nodes.append({"name": n, "translation": t, "children": []})
for i, p in enumerate(parent):
    if p >= 0: nodes[p]["children"].append(i)
for n in nodes:
    if not n["children"]: del n["children"]
roots = [i for i, p in enumerate(parent) if p < 0]
nodes.append({"name": "body", "mesh": 0, "skin": 0})
nodes.append({"name": "armature", "children": roots + [len(nodes) - 1]})
gltf = {"asset": {"version": "2.0", "generator": "MakeHuman 1.3 (CC0 output) + make_patient.py"},
        "scene": 0, "scenes": [{"nodes": [len(nodes) - 1]}], "nodes": nodes,
        "skins": [{"joints": list(range(len(order))), "inverseBindMatrices": aIBM, "skeleton": roots[0]}],
        "meshes": [{"name": "human", "primitives": prims}],
        "materials": [{"name": "skin", "pbrMetallicRoughness": {"baseColorFactor": [0.72, 0.52, 0.40, 1], "metallicFactor": 0, "roughnessFactor": 0.6}},
                      {"name": "gown", "pbrMetallicRoughness": {"baseColorFactor": [0.55, 0.77, 0.84, 1], "metallicFactor": 0, "roughnessFactor": 0.85}, "doubleSided": True}],
        "accessors": accs, "bufferViews": views, "buffers": [{"byteLength": len(bin_)}]}
js = json.dumps(gltf, separators=(",", ":")).encode()
while len(js) % 4: js += b" "
while len(bin_) % 4: bin_.append(0)
with open(out, "wb") as f:
    f.write(struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_)))
    f.write(struct.pack("<II", len(js), 0x4E4F534A)); f.write(js)
    f.write(struct.pack("<II", len(bin_), 0x004E4942)); f.write(bin_)
print(out, "verts", len(P), "tris", len(tris), "gown tris", int(tri_gown.sum()), "bones", len(order), "height m", round(float(P[:, 1].max() - P[:, 1].min()), 3), os.path.getsize(out) // 1024, "KB")
