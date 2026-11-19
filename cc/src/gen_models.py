"""Adds the nine disease-level photoreal specimen entries (d6.MODELS) to ../pathology-models.json. Safe to run again.
Run from cc/src:  python3 gen_models.py"""
import json, d6
p = "../pathology-models.json"
m = json.load(open(p))
keep = [c for c in m["complications"] if not c["id"].endswith("-main")]
m["complications"] = keep + [d6.MODELS[k] for k in d6.MODELS]
json.dump(m, open(p, "w"), ensure_ascii=False, indent=1)
print(len(m["complications"]), "entries")
