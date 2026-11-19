"""Lesion pins for the nine disease-level specimens (ids "<disease>-main"). Imported by marks_src.py.
Positions reuse the coordinates already checked on the same organ. The teaching text is original and needs clinical review."""
from dbhelp import *
import d6

def care(k): return "Helps: " + "; ".join(r["n"] for r in d6.MAIN[k]["rx"] if r["t"] == "helps") + ". Avoid: " + "; ".join(r["n"] for r in d6.MAIN[k]["rx"] if r["t"] == "harms") + "."

def build(L):
    S = {}
    c = care("ards")
    S["ards-main"] = [
     L("organ", "Dependent consolidation", "Dependent consolidation", "Fluid-filled and collapsed alveoli fill the back of the lung. Proning moves the load and recruits them.", c, dir=[0.55, -0.4, -1]),
     L("organ", "Patchy ground glass", "Aerated 'baby lung'", "Only a small part of the lung is still open. Large breaths overdistend it.", c, dir=[-0.5, 0.3, 1]),
     L("cut", "Wet, heavy lung", "Wet, heavy lung", "A red, rubbery cut face that weeps frothy fluid. The lung weighs two to three times normal.", c, cut=[0.1, -0.1]),
     L("cells", "Hyaline membrane", "Hyaline membrane", "A pink film of plasma protein and cell debris that lines the air sac and blocks gas exchange.", c, part="Hyaline membrane"),
     L("cells", "Oedema fluid", "Oedema fluid", "Leaky capillaries and a damaged lining let protein-rich fluid flood the air space.", c, part="Oedema fluid"),
    ]
    c = care("aki")
    S["aki-main"] = [
     L("organ", "Swollen pale cortex", "Swollen pale cortex", "The cortex swells and pales as flow falls and tubular cells die.", c, dir=[0, 0.3, 1]),
     L("organ", "Medullary congestion", "Medullary congestion", "Blood pools in the oxygen-poor medulla, where injury starts.", c, dir=[1, -0.2, 0.4]),
     L("cut", "Pale cortex, dark medulla", "Pale cortex, dark medulla", "The classic acute tubular injury pattern on the cut face.", c, cut=[0, 0.1]),
     L("cells", "Injured tubular cell", "Injured tubular cell", "The cell loses its brush border and its energy. It swells and sloughs into the lumen.", c, part="Tubular cell"),
     L("cells", "Cast", "Cast", "Shed cells and protein form casts that block the tubule and stop filtration.", c, part="Cast"),
    ]
    c = care("pancreatitis")
    S["pancreatitis-main"] = [
     L("organ", "Fat necrosis", "Fat necrosis", "Chalky white spots of calcium soap where lipase has digested the fat.", c, dir=[0.3, 0.4, 1]),
     L("organ", "Haemorrhagic necrosis", "Haemorrhagic necrosis", "Enzymes erode vessels. Dark red wet patches mark a severe attack.", c, dir=[-0.6, 0.1, 0.8]),
     L("organ", "Peripancreatic fluid", "Peripancreatic fluid", "Inflammatory fluid tracks along the retroperitoneum around the gland.", c, dir=[0.2, -0.6, 1]),
     L("cells", "Self-digesting acinus", "Acinar cell", "Enzymes are switched on inside the cell and digest it.", c, part="Acinar cell"),
     L("cells", "Zymogen granule", "Zymogen granule", "Granules fuse with lysosomes and trypsin activates too early.", c, part="Zymogen granule"),
    ]
    c = care("alf")
    S["alf-main"] = [
     L("organ", "Necrotic liver", "Necrotic liver", "A soft, shrunken liver with a wrinkled capsule and yellow-green mottling.", c, dir=[-1, 0.1, 0.4]),
     L("organ", "Atrophic left lobe", "Atrophic left lobe", "Large areas of lost liver tissue leave a small, collapsed lobe.", c, dir=[0.8, 0.2, 0.7]),
     L("cut", "Mottled necrosis", "Mottled necrosis", "Red, yellow and green patches of dead liver across the cut face.", c, cut=[0, 0]),
     L("cells", "Dying hepatocyte", "Dying hepatocyte", "The cell has lost its energy and glycogen and cannot clear ammonia.", c, part="Hepatocyte"),
     L("cells", "Slow sinusoid flow", "Sinusoid", "Blood slows through the damaged sinusoids, so toxins are not cleared.", c, part="Sinusoid"),
    ]
    c = care("ahf")
    S["ahf-main"] = [
     L("organ", "Failing left ventricle", "Failing left ventricle", "A dilated, poorly contracting ventricle that forms the apex.", c, dir=[0.9, -0.3, 0.5]),
     L("organ", "Dilated right ventricle", "Dilated right ventricle", "Pressure backs up from the lungs and the right ventricle dilates.", c, dir=[-0.35, -0.2, 1]),
     L("cut", "Dilated, thin wall", "Dilated, thin wall", "Enlarged cavities with a thin, pale wall and flattened trabeculae.", c, cut=[0.35, -0.15]),
     L("cells", "Energy-starved myocyte", "Energy-starved myocyte", "Swollen mitochondria cannot make enough ATP to keep the cell squeezing.", c, part="Mitochondrion"),
    ]
    c = care("tbi")
    S["tbi-main"] = [
     L("organ", "Contusion", "Contusion", "Bruised, haemorrhagic cortex under the impact and opposite it, often the frontal and temporal poles.", c, dir=[0.7, 0.1, 0.8]),
     L("organ", "Swollen hemisphere", "Swollen hemisphere", "Flattened gyri and tight sulci show a swollen hemisphere under pressure.", c, dir=[-0.6, 0.5, 0.2]),
     L("cut", "Midline shift", "Midline shift", "The swollen side pushes the ventricles and the midline across.", c, cut=[0.1, 0.1]),
     L("cells", "Swollen neurone", "Swollen neurone", "Sheared, energy-poor neurones swell and release excitotoxic transmitters.", c, part="Neuron"),
    ]
    c = care("status")
    S["status-main"] = [
     L("organ", "Medial temporal lobe", "Medial temporal lobe", "The hippocampus and its neighbours are most vulnerable to prolonged seizures.", c, dir=[0.9, -0.3, 0.1]),
     L("organ", "Cortical injury", "Cortical injury", "Congested, swollen cortex where seizure activity burned more fuel than it was given.", c, dir=[-0.6, 0.5, 0.5]),
     L("cut", "Swollen cortex", "Swollen cortex", "Swollen grey matter with blurred grey-white junction.", c, cut=[0, 0.1]),
     L("cells", "Excitotoxic neurone", "Excitotoxic neurone", "Continuous firing and calcium entry swell the neurone and exhaust its energy.", c, part="Neuron"),
    ]
    c = care("sepsis")
    S["sepsis-main"] = [
     L("organ", "Dilated arteriole", "Dilated arteriole", "Nitric oxide relaxes the vessel muscle, so resistance and blood pressure fall.", c, at=[0, 0.1, 0.1]),
     L("cells", "Leaky endothelium", "Leaky endothelium", "The lining loses its coat and its tight junctions. Plasma leaks into the tissue.", c, part="Endothelium"),
    ]
    c = care("dic")
    S["dic-main"] = [
     L("organ", "Fibrin plugs", "Fibrin plugs", "Fibrin blocks small vessels, starving the tissue behind them.", c, at=[0, 0.1, 0.1]),
     L("cells", "Fibrin mesh", "Fibrin mesh", "Thrombin turns fibrinogen into strands that trap red cells and platelets.", c, part="Fibrin strand"),
     L("cells", "Tissue factor displayed", "Tissue factor", "Activated endothelium displays tissue factor and switches on clotting.", c, part="Endothelium"),
    ]
    return S
