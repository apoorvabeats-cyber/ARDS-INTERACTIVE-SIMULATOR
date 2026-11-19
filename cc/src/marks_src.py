"""Builds sepsis/marks.json: the labelled pins on the photoreal specimens.
Run from cc/src:  python3 marks_src.py ../../sepsis/marks.json
kind "part"   names a normal structure and shows in every state.
kind "lesion" marks what matters in the diseased state and fades in as severity rises.
Positions: dir=[x,y,z] organ view (ray onto the surface; +z front, +x patient's left, +y up), cut=[right,up] on the cut face,
part="tap title" on a cell-scene object, at=[x,y,z] in the cell scene. The teaching text is original and needs clinical review."""
import json, sys

def P(kind, view, label, title, body, care="", **pos):
    d = {"kind": kind, "view": view, "label": label, "title": title, "body": body}
    if care: d["care"] = care
    d.update(pos)
    return d

def L(view, label, title, body, care="", **pos): return P("lesion", view, label, title, body, care, **pos)
def N(view, label, title, body, care="", **pos): return P("part", view, label, title, body, care, **pos)

# ---------- shared anatomy pins, one set per organ ----------
ORGAN = {
 "lung": [
  N("organ", "Right lung, 3 lobes", "Right lung", "Three lobes: upper, middle and lower, split by the horizontal and oblique fissures.", dir=[-1, 0.1, 0.4]),
  N("organ", "Left lung, 2 lobes", "Left lung", "Two lobes and a lingula. The cardiac notch leaves room for the heart.", dir=[1, 0.1, 0.4]),
  N("cells", "Type II cell", "Type II cell", "Makes surfactant and repairs the alveolar lining.", part="Type II cell"),
  N("cells", "Alveolar wall", "Alveolar epithelium", "A thin lining of type I cells. Gas crosses it and the capillary wall in a fraction of a micron.", part="Alveolar epithelium"),
 ],
 "heart": [
  N("organ", "Right ventricle", "Right ventricle", "Thin-walled and low pressure. It sits at the front of the heart.", dir=[-0.35, -0.2, 1]),
  N("organ", "Left ventricle", "Left ventricle", "Thick-walled, high pressure pump that forms the apex.", dir=[0.9, -0.3, 0.5]),
  N("cells", "Cardiomyocyte", "Cardiomyocyte", "Striated muscle cell packed with mitochondria.", part="Cardiomyocyte"),
  N("cells", "Beta receptor", "Beta receptor", "Where adrenaline and dobutamine raise rate and force.", part="Beta receptor"),
 ],
 "kidney": [
  N("organ", "Cortex", "Renal cortex", "The outer layer. It holds the glomeruli and the proximal tubules, the most oxygen-hungry part.", dir=[0, 0.3, 1]),
  N("organ", "Renal pelvis", "Renal pelvis", "Collects urine from the calyces and drains to the ureter.", dir=[1, -0.3, 0.2]),
  N("cells", "Proximal tubule", "Proximal tubule", "Reabsorbs most of the filtered sodium, water, glucose and bicarbonate.", part="Proximal tubule"),
  N("cells", "Tubular cell", "Tubular cell", "Brush border on the lumen side and mitochondria packed at the base.", part="Tubular cell"),
 ],
 "liver": [
  N("organ", "Right lobe", "Right lobe", "The larger lobe. It receives portal blood from the gut.", dir=[-1, 0.1, 0.4]),
  N("organ", "Left lobe", "Left lobe", "The smaller lobe, in front of the stomach.", dir=[0.8, 0.2, 0.7]),
  N("cells", "Hepatocyte", "Hepatocyte", "Makes glucose, clotting factors, albumin and bile.", part="Hepatocyte"),
  N("cells", "Sinusoid", "Sinusoid", "The leaky capillary that bathes hepatocytes in portal and arterial blood.", part="Sinusoid"),
 ],
 "brain": [
  N("organ", "Frontal lobe", "Frontal lobe", "Executive function and motor planning.", dir=[0, 0.3, 1]),
  N("organ", "Cerebellum", "Cerebellum", "Sits in the posterior fossa. Swelling here can block CSF flow.", dir=[0, -0.5, -1]),
  N("cells", "Neurone", "Neuron", "The cell that fires. It is the first to fail when oxygen or glucose is short.", part="Neuron"),
  N("cells", "Astrocyte foot", "Astrocyte end-foot", "Wraps the capillary and helps form the blood-brain barrier.", part="Astrocyte end-foot"),
 ],
 "pancreas": [
  N("cells", "Acinar cell", "Acinar cell", "Makes digestive enzymes and packs them in zymogen granules.", part="Acinar cell"),
  N("cells", "Zymogen granule", "Zymogen granule", "Stores inactive enzymes. They should only activate in the gut.", part="Zymogen granule"),
 ],
 "bowel": [
  N("cells", "Villus", "Villus", "Finger-like fold that absorbs nutrients. Its tip is the first to suffer low flow.", part="Villus"),
  N("cells", "Enterocyte", "Enterocyte", "The absorbing cell, joined to its neighbours by tight junctions.", part="Enterocyte"),
 ],
 "muscle": [
  N("cells", "Muscle fibre", "Muscle fibre", "A long cell full of contractile proteins and myoglobin.", part="Muscle fibre"),
  N("cells", "Sarcolemma", "Sarcolemma", "The cell membrane. When it fails, potassium, CK and myoglobin leak out.", part="Sarcolemma"),
 ],
 "skin": [
  N("cells", "Dermal vessel", "Dermal vessel", "Small vessel in the dermis that feeds the skin.", part="Dermal vessel"),
 ],
 "vessel": [
  N("cells", "Endothelium", "Endothelium", "The inner lining of the vessel. It controls tone, permeability and clotting.", part="Endothelium"),
 ],
 "bleed": [
  N("cells", "Platelet", "Platelet", "Seals a gap in the vessel wall, then supports the fibrin clot.", part="Platelet"),
 ],
}

# ---------- lesion pins, one set per complication ----------
LUNG_CARE_ARDS = "Helps: Lung-protective ventilation (about 6 ml/kg predicted weight, plateau below 30), prone positioning, conservative fluids. Avoid: Large tidal volume, high driving pressure, fluid overload."
SPEC = {
 "ards": [
  L("organ", "Dependent consolidation", "Dependent consolidation", "Fluid-filled and collapsed alveoli sit in the dependent (posterior) lung. Proning moves the load and recruits them.", LUNG_CARE_ARDS, dir=[0.55, -0.4, -1]),
  L("organ", "Patchy ground glass", "Patchy ground glass", "Inflamed but still aerated lung at the front. This is the small 'baby lung' that large breaths can overdistend.", LUNG_CARE_ARDS, dir=[-0.5, 0.3, 1]),
  L("cut", "Wet, heavy lung", "Wet, heavy lung", "The cut face is red, wet and heavy with protein-rich oedema and blood. Lungs can weigh two to three times normal.", LUNG_CARE_ARDS, cut=[0.1, -0.1]),
  L("cells", "Hyaline membrane", "Hyaline membrane", "A pink film of plasma protein and dead cell debris lining the alveolus. It blocks gas exchange.", LUNG_CARE_ARDS, part="Hyaline membrane"),
  L("cells", "Alveolar oedema", "Oedema fluid", "Leaky capillaries and a damaged epithelium let protein-rich fluid flood the air space.", LUNG_CARE_ARDS, part="Oedema fluid"),
 ],
}
SPEC["pancreatitis-ards"] = [dict(x) for x in SPEC["ards"]]
SPEC["pancreatitis-ards"][0]["care"] = LUNG_CARE_ARDS + " Also treat the pancreatitis: early enteral feeding, no routine antibiotics unless infected necrosis."

SPEC["ards-baro"] = [
 L("organ", "Apical bleb", "Subpleural bleb", "Air blebs at the apex rupture when peak or plateau pressure is high, letting air into the pleural space.", "Helps: Plateau below 30 and driving pressure below 15, chest drain for a tension pneumothorax. Avoid: High tidal volume and PEEP beyond what oxygenation needs.", dir=[-0.35, 1, 0.2]),
 L("organ", "Air-leak cyst", "Pneumatocele", "A thin-walled air cyst that forms where overdistended lung tears. It can grow or rupture.", "Helps: Lung-protective settings, watch for a new leak on the chest film. Avoid: Sudden pressure spikes (coughing, patient-ventilator asynchrony).", dir=[1, 0.4, 0.3]),
 L("cut", "Air-filled space", "Air-filled space", "Gas has dissected out of the alveoli into the interstitium and beneath the pleura.", "Helps: Lower pressures, drain if the leak is large. Avoid: High PEEP and tidal volume.", cut=[-0.15, -0.3]),
 L("cells", "Overstretched wall", "Alveolar epithelium", "The thin alveolar wall is torn by overdistension. Air escapes into the tissue.", "Helps: Lower driving pressure. Avoid: Volutrauma.", part="Alveolar epithelium"),
]
SPEC["ards-fibro"] = [
 L("organ", "Subpleural scarring", "Subpleural fibrosis", "Scar tissue forms at the periphery and bases first. The lung becomes stiff and shrinks.", "Helps: Early lung-protective ventilation, shorter ventilation, specialist review of persistent ARDS. Avoid: Long periods of high FiO2 and pressure.", dir=[0.6, -0.5, -0.8]),
 L("organ", "Honeycomb change", "Honeycombing", "Clustered thick-walled cysts mark late, established fibrosis. This part does not recover.", "Helps: Pulmonary rehabilitation, long-term follow-up. Avoid: Smoking and further lung injury.", dir=[-0.7, -0.4, 0.6]),
 L("cut", "Fibrotic band", "Fibrotic band", "Pale, firm scar bands run through the cut face and distort the airways.", "Helps: Follow-up CT and lung function. Avoid: Assuming it will all reverse.", cut=[0.2, -0.2]),
 L("cells", "Proliferating type II", "Type II cell", "Type II cells multiply to repair the wall. In prolonged injury fibroblasts follow and lay down collagen.", "Helps: Limit ventilator injury. Avoid: Prolonged high pressures.", part="Type II cell"),
]
SPEC["ards-vap"] = [
 L("organ", "Lower-lobe consolidation", "Lower-lobe consolidation", "Colonised secretions leak past the cuff to the dependent lower lobes and cause patchy pus-filled consolidation.", "Helps: Head of bed 30 to 45 degrees, subglottic suction, daily sedation and ventilation review, early cultures and antibiotics by the local antibiogram. Avoid: Unnecessary sedation and prolonged intubation.", dir=[-0.6, -0.45, -0.8]),
 L("organ", "Second focus", "Multifocal spread", "Infection can involve several lobes. New or enlarging opacities, fever and purulent secretions raise the suspicion.", "Helps: Sputum or tracheal aspirate culture, de-escalate when results return.", dir=[0.6, -0.4, -0.7]),
 L("cut", "Pus in the airways", "Pus in the airways", "Yellow-green purulent plugs fill the bronchioles and surrounding alveoli.", "Helps: Suction, physiotherapy, targeted antibiotics.", cut=[0.1, -0.15]),
 L("cells", "Neutrophils", "Neutrophil", "Neutrophils flood the alveolus and release enzymes and oxygen radicals that injure the wall.", "Helps: Source control with antibiotics.", part="Neutrophil"),
]
def lung_oedema(label_cause, care, cut_text):
    return [
     L("organ", "Perihilar oedema", "Perihilar oedema", "Fluid collects around the hila first and spreads outward, the 'bat-wing' pattern on a chest film.", care, dir=[-0.7, 0.1, 0.8]),
     L("organ", "Basal oedema", "Basal oedema", "Gravity loads the lower zones. Pleural effusions often sit beside it.", care, dir=[0.7, -0.4, 0.7]),
     L("cut", "Frothy fluid", "Frothy fluid", cut_text, care, cut=[0.1, 0]),
     L("cells", "Oedema fluid", "Oedema fluid", "Fluid fills the air space. " + label_cause, care, part="Oedema fluid"),
    ]
SPEC["aki-pe"] = lung_oedema("Here it comes from volume overload with no way to pass urine.", "Helps: Fluid removal (diuretic if responsive, ultrafiltration or dialysis), CPAP or NIV, treat hyperkalaemia. Avoid: More intravenous fluid.", "The cut face oozes thin, pink, frothy fluid because the capillaries are overloaded with volume.")
SPEC["ahf-pe"] = lung_oedema("Here it comes from a high left atrial pressure that pushes fluid out of the capillaries.", "Helps: Intravenous loop diuretic, vasodilator if blood pressure allows, CPAP or NIV, treat the cause. Avoid: Fluid boluses.", "The cut face oozes pink, frothy fluid pushed out by a high left atrial pressure.")
SPEC["tbi-npe"] = lung_oedema("Here a catecholamine surge from the injured brain raises capillary pressure and permeability.", "Helps: Treat the brain injury and ICP, lung-protective ventilation, avoid fluid overload. Avoid: Large fluid boluses and high tidal volume.", "The cut face is wet with blood-tinged frothy fluid from a sudden catecholamine surge.")
SPEC["status-asp"] = [
 L("organ", "Aspiration focus", "Aspiration focus", "Gastric contents run to the right lower lobe and the posterior upper lobes. Acid burns the lining and bacteria follow.", "Helps: Airway protection, suction, oxygen, antibiotics only if infection is likely. Avoid: Routine steroids and prophylactic antibiotics for chemical pneumonitis.", dir=[-0.6, -0.4, -0.8]),
 L("organ", "Posterior segment", "Posterior upper lobe", "A patient lying on their back aspirates into the posterior segments.", "Helps: Early airway control during prolonged seizures.", dir=[-0.5, 0.4, -0.9]),
 L("cut", "Acid injury", "Acid injury", "Dark, haemorrhagic and oedematous lung where acid and food particles landed.", "Helps: Supportive care and ventilation.", cut=[0.15, -0.15]),
 L("cells", "Alveolar oedema", "Oedema fluid", "Acid destroys the lining. Fluid and neutrophils pour in within hours.", "Helps: Lung-protective ventilation.", part="Oedema fluid"),
]

HEART_CARE = "Helps: {h}. Avoid: {a}."
SPEC["ards-rv"] = [
 L("organ", "Dilated right ventricle", "Dilated right ventricle", "High lung vascular resistance overloads the thin right ventricle. It dilates and bulges forward.", "Helps: Lung-protective ventilation, prone positioning, inhaled nitric oxide or prostacyclin. Avoid: Excess PEEP and plateau pressure, large fluid bolus.", dir=[-0.35, -0.2, 1]),
 L("organ", "Septal shift", "Bowed septum", "The septum bows toward the left ventricle, so left filling and cardiac output fall.", "Helps: Reduce RV afterload, norepinephrine to protect coronary perfusion. Avoid: Hypoxia and hypercapnia, which raise pulmonary resistance.", dir=[0.3, -0.3, 1]),
 L("cut", "Large thin-walled RV", "Large thin-walled right ventricle", "The right cavity is large and the wall thin. The flattened septum squeezes the left ventricle (D-shaped left ventricle).", "Helps: Echo to track RV size and septum.", cut=[-0.5, -0.1]),
 L("cells", "Stretched myocyte", "Cardiomyocyte", "RV muscle cells are over-stretched and their coronary supply falls under pressure. Force of contraction drops.", "Helps: Maintain coronary perfusion pressure.", part="Cardiomyocyte"),
]
SPEC["aki-hyperk"] = [
 L("organ", "Conduction system", "Conduction slowing", "High potassium depolarises cells and slows conduction. The ECG shows peaked T waves, a wide QRS and then a sine wave.", "Helps: Calcium (membrane protection), insulin with glucose, salbutamol, dialysis for removal. Avoid: Potassium-containing fluids and drugs, delay.", dir=[0.4, 0.2, 1]),
 L("organ", "Ventricular irritability", "Ventricular irritability", "The ventricle becomes prone to fibrillation as the potassium rises.", "Helps: Early calcium and urgent potassium removal.", dir=[0.9, -0.3, 0.5]),
 L("cut", "Pale slack ventricle", "Pale ventricle", "The wall contracts poorly when potassium is very high.", "Helps: Treat the potassium, then the cause.", cut=[0.4, 0]),
 L("cells", "Depolarised myocyte", "Cardiomyocyte", "Extracellular potassium rises, so the resting membrane potential moves toward threshold and sodium channels inactivate.", "Helps: Calcium stabilises the membrane; insulin and beta agonists shift potassium into cells.", part="Cardiomyocyte"),
]
SPEC["ahf-cs"] = [
 L("organ", "Failing left ventricle", "Failing left ventricle", "A large, poorly contracting left ventricle cannot maintain output. Blood pressure falls despite high filling pressures.", "Helps: Revascularise if ischaemic, inotrope or vasopressor, mechanical support if refractory. Avoid: Fluid boluses and vasodilators that drop pressure.", dir=[0.9, -0.3, 0.5]),
 L("organ", "Ischaemic territory", "Ischaemic territory", "In an infarct, the damaged territory (often the anterior wall) is pale and akinetic.", "Helps: Early reperfusion.", dir=[0.5, -0.4, 1]),
 L("cut", "Dilated, thin wall", "Dilated left ventricle", "A dilated cavity with a thin, poorly contracting wall. Output is low.", "Helps: Echo, early revascularisation.", cut=[0.35, -0.15]),
 L("cells", "Energy-starved myocyte", "Mitochondrion", "Mitochondria swell and the cell runs out of ATP. Contraction fades.", "Helps: Restore coronary flow and oxygen delivery.", part="Mitochondrion"),
]
SPEC["ahf-arr"] = [
 L("organ", "Atrial stretch", "Atrial stretch", "A high filling pressure stretches the atria and starts atrial fibrillation, which takes away the atrial kick.", "Helps: Rate or rhythm control, cardioversion if unstable, correct potassium and magnesium. Avoid: Starting negative inotropes in decompensated failure.", dir=[-0.5, 0.5, 0.4]),
 L("organ", "Ventricular scar", "Ventricular scar", "Scar and stretched myocardium give re-entry circuits, so ventricular tachycardia can start.", "Helps: Amiodarone, defibrillation for VT or VF, ICD later. Avoid: Pro-arrhythmic drugs and electrolyte disturbances.", dir=[0.9, -0.3, 0.5]),
 L("cut", "Remodelled wall", "Remodelled wall", "The dilated, patchy wall conducts unevenly, which allows re-entry.", "Helps: Treat the cause.", cut=[0.3, 0]),
 L("cells", "Beta receptor", "Beta receptor", "Chronic catecholamine drive down-regulates beta receptors and makes the membrane unstable.", "Helps: Beta-blocker when stable. Avoid: High-dose catecholamines.", part="Beta receptor"),
]
SPEC["cardiac"] = [
 L("organ", "Dilated left ventricle", "Dilated left ventricle", "In sepsis the ventricle dilates and its ejection fraction falls. It usually recovers over 7 to 10 days.", "Helps: Dobutamine or levosimendan if low output with adequate pressure; avoid excess catecholamine. Avoid: High-dose adrenaline and unnecessary fluid.", dir=[0.9, -0.3, 0.5]),
 L("organ", "Right ventricle", "Right ventricle", "The right ventricle is also stunned, which is often missed.", "Helps: Echo of both ventricles.", dir=[-0.35, -0.2, 1]),
 L("cut", "Dilated cavity", "Dilated cavity", "A dilated, thin-looking chamber with reduced wall thickening.", "Helps: Serial echo.", cut=[0.2, -0.1]),
 L("cells", "Swollen mitochondria", "Mitochondrion", "Cytokines and nitric oxide impair mitochondria and calcium handling. This is stunning, not cell death.", "Helps: Treat sepsis and restore perfusion.", part="Mitochondrion"),
]

KID = "Helps: Restore perfusion and MAP, stop nephrotoxins, treat the cause, renal replacement for refractory acidosis, hyperkalaemia, overload or uraemia. Avoid: NSAIDs, contrast, aminoglycosides when avoidable, and further fluid overload."
def kidney(cortex_text, cut_text, cell_text, cell_part, care=KID):
    return [
     L("organ", "Swollen pale cortex", "Swollen cortex", cortex_text, care, dir=[0, 0.3, 1]),
     L("organ", "Medullary congestion", "Medullary congestion", "The outer medulla is the most hypoxic zone and is dark and congested in injury.", care, dir=[1, -0.2, 0.4]),
     L("cut", "Pale cortex, dark medulla", "Pale cortex and dark medulla", cut_text, care, cut=[0, 0.1]),
     L("cells", "Injured tubular cell", "Tubular cell", cell_text, care, part=cell_part),
     L("cells", "Casts", "Cast", "Dead cells and protein plug the tubule and raise upstream pressure, so filtration falls.", care, part="Cast"),
    ]
SPEC["aki"] = kidney("The cortex swells and turns pale as flow falls and tubular cells die.", "The cortex is pale and swollen while the medulla is dark and congested. This is acute tubular injury.", "Proximal tubular cells lose their brush border, swell and shed into the lumen.", "Tubular cell")
SPEC["pancreatitis-aki"] = kidney("Hypovolaemia and inflammation starve the cortex. It is swollen and pale.", "The cortex is pale and swollen while the medulla is dark. Poor perfusion drives tubular injury.", "Tubular cells lose their brush border and slough off.", "Tubular cell", "Helps: Early goal-directed fluid resuscitation with balanced crystalloid, avoid nephrotoxins, watch for abdominal compartment syndrome. Avoid: NSAIDs and aggressive over-resuscitation.")
SPEC["aki-acid"] = kidney("The cortex swells. Damaged tubules cannot secrete hydrogen ions or reclaim bicarbonate.", "Pale cortex, dark medulla. Failed tubules cannot excrete acid.", "Tubular cells lose bicarbonate reclamation and acid secretion, so the metabolic acidosis deepens.", "Proximal tubule", "Helps: Treat the cause, dialysis for severe acidosis, bicarbonate only for selected cases. Avoid: Excess chloride.")
SPEC["aki-uremia"] = kidney("A swollen, congested kidney that cannot clear urea and toxins.", "The cut face is pale and congested. Filtration has failed.", "Tubular injury and low filtration let urea and toxins accumulate.", "Tubular cell", "Helps: Renal replacement for uraemic complications (encephalopathy, pericarditis, bleeding). Avoid: Delay when there are complications.")
SPEC["alf-hrs"] = kidney("Structurally the cortex is near normal but starved of flow by splanchnic vasodilation.", "A kidney that looks structurally normal on the cut face but makes almost no urine, because the problem is flow, not damage.", "Tubular cells are intact but under-perfused. This is why hepatorenal AKI can recover if flow is restored.", "Tubular cell", "Helps: Albumin, terlipressin or norepinephrine, treat infection and bleeding, transplant assessment. Avoid: Nephrotoxins and large-volume paracentesis without albumin.")
SPEC["ahf-aki"] = kidney("Venous congestion and low output reduce renal perfusion pressure. The kidney is swollen and blue-pink.", "A congested, swollen kidney. Venous hypertension is as harmful as low flow.", "Tubular cells are hypoxic and under pressure from venous congestion.", "Tubular cell", "Helps: Decongest with diuretic or ultrafiltration, restore output, avoid hypotension. Avoid: Fluid boluses and NSAIDs.")
SPEC["dic-aki"] = kidney("Micro-thrombi in the glomerular capillaries and a failing circulation injure the kidney.", "Pale cortex with small haemorrhagic spots, from fibrin plugs in the glomeruli.", "Tubular cells die from ischaemia downstream of the blocked capillaries.", "Tubular cell", "Helps: Treat the trigger, replace factors if bleeding, supportive care. Avoid: Nephrotoxins.")
SPEC["dka-kidney"] = kidney("Osmotic diuresis dries the patient out and lowers renal perfusion. The kidney is pale and small.", "Pre-renal pattern: the cut face is pale but structurally intact.", "Tubular cells face a heavy glucose and ketone load and lose water and salts.", "Tubular cell", "Helps: Isotonic fluid then insulin infusion, potassium replacement once urine flows and K is below the threshold. Avoid: Insulin before potassium is known.")

# ---------- liver ----------
LIV = "Helps: {h} Avoid: {a}"
SPEC["hepatic"] = [
 L("organ", "Congested, swollen liver", "Swollen congested liver", "Sepsis enlarges and congests the liver. Cholestasis, fat and, in shock, hypoxic necrosis can all be present.", "Helps: Restore perfusion, source control, avoid overfeeding. Avoid: Hepatotoxic drugs (excess paracetamol, amiodarone) and long fasts.", dir=[-1, 0.1, 0.4]),
 L("organ", "Gallbladder", "Gallbladder", "Acalculous cholecystitis can accompany severe sepsis. Cholestasis alone does not mean a blocked duct.", "Helps: Ultrasound only if the picture suggests biliary sepsis.", dir=[-0.2, -1, 0.5]),
 L("cut", "Central necrosis", "Centrilobular necrosis", "Zone 3 cells around the central vein lie farthest from oxygen and die first in shock (hypoxic hepatitis).", "Helps: Restore cardiac output and oxygen delivery. Avoid: Hypotension.", cut=[0, 0]),
 L("cells", "Bile salts retained", "Hepatocyte", "Cytokines down-regulate bile-salt transporters, so bilirubin and bile acids spill into the blood.", "Helps: Treat the sepsis; cholestasis reverses with it.", part="Hepatocyte"),
 L("cells", "Slow sinusoid flow", "Sinusoid", "Shock slows sinusoidal flow. Central hepatocytes are the first to starve.", "Helps: Maintain MAP and cardiac output.", part="Sinusoid"),
]
SPEC["alf-hypoglyc"] = [
 L("organ", "Necrotic liver", "Necrotic liver", "Massive hepatocyte loss leaves a mottled, shrunken liver that can no longer make glucose.", "Helps: Glucose infusion and hourly checks, urgent transplant assessment. Avoid: Prolonged fasting and insulin without glucose.", dir=[-1, 0.1, 0.4]),
 L("organ", "Atrophic left lobe", "Shrunken lobe", "A small, soft liver on imaging signals extensive necrosis.", "Helps: Early transplant centre contact.", dir=[0.8, 0.2, 0.7]),
 L("cut", "Mottled necrosis", "Mottled necrosis", "Patches of dead and surviving tissue. Glycogen stores are gone and gluconeogenesis fails.", "Helps: Continuous glucose.", cut=[0, 0]),
 L("cells", "Failed gluconeogenesis", "Hepatocyte", "Dying hepatocytes cannot release glycogen or make new glucose, so the blood sugar falls.", "Helps: 10 to 20% dextrose by central line, monitor hourly.", part="Hepatocyte"),
]
SPEC["dka-meta"] = [
 L("organ", "Fatty, ketogenic liver", "Fatty, ketogenic liver", "Low insulin and high glucagon send fat to the liver, which turns it into ketones.", "Helps: Fixed-rate insulin infusion with fluids and potassium. Avoid: Stopping insulin while ketones are still present.", dir=[-1, 0.1, 0.4]),
 L("cut", "Fat-laden tissue", "Fat-laden tissue", "Fatty change and depleted glycogen, from hormone imbalance rather than primary liver failure.", "Helps: Treat the cause and restore insulin.", cut=[0, 0]),
 L("cells", "Ketone production", "Hepatocyte", "Beta-oxidation is unchecked, so acetyl-CoA is made into acetoacetate and beta-hydroxybutyrate. The anion gap rises.", "Helps: Insulin switches off ketogenesis. Avoid: Bicarbonate unless pH is severely low.", part="Hepatocyte"),
]

# ---------- brain ----------
SPEC["enceph"] = [
 L("organ", "Diffuse cortical dysfunction", "Diffuse dysfunction", "Both hemispheres are affected. There is no focal lesion. EEG is slow and the patient is drowsy or delirious.", "Helps: Restore pressure and oxygen, correct glucose and sodium, avoid benzodiazepines, dexmedetomidine if sedation is needed. Avoid: Unrecognised cefepime neurotoxicity in renal failure.", dir=[0, 0.4, 1]),
 L("organ", "Cerebellum", "Cerebellum", "Also swept up in the same diffuse process. Focal signs should prompt imaging.", "Helps: CT or MRI if the signs are focal or sudden.", dir=[0, -0.5, -1]),
 L("cut", "Mild diffuse oedema", "Mild oedema", "A slightly swollen brain with no focal mass. Microvascular injury is the cause.", "Helps: Treat the sepsis.", cut=[0, 0]),
 L("cells", "Leaky barrier", "Tight junction", "Cytokines open the tight junctions, so protein and mediators enter the brain.", "Helps: Source control and perfusion.", part="Tight junction"),
 L("cells", "Swollen end-foot", "Astrocyte end-foot", "Astrocyte end-feet swell and loosen their grip on the capillary.", "Helps: Correct sodium and glucose.", part="Astrocyte end-foot"),
 L("cells", "Quiet neurone", "Neuron", "Firing slows and desynchronises. The cell is not destroyed.", "Helps: Dexmedetomidine rather than benzodiazepines.", part="Neuron"),
]
SPEC["alf-cedema"] = [
 L("organ", "Flattened gyri", "Flattened gyri", "Swelling presses the gyri against the skull and fills the sulci. Intracranial pressure rises.", "Helps: Head-up 30 degrees, keep sodium 145 to 155, hypertonic saline or mannitol, treat ammonia (early renal replacement), avoid fever. Avoid: Hypotonic fluids, hyponatraemia, sedation that hides the examination.", dir=[0, 0.5, 1]),
 L("organ", "Tonsillar pressure", "Tonsillar pressure", "Raised pressure pushes the cerebellar tonsils toward the foramen magnum.", "Helps: Urgent ICP treatment and neurocritical care review.", dir=[0, -0.6, -1]),
 L("cut", "Effaced sulci", "Effaced sulci and ventricles", "The grey-white boundary blurs and the ventricles are squeezed as the brain swells.", "Helps: Serial CT or ICP monitoring in high-risk patients.", cut=[0, 0.1]),
 L("cells", "Swollen astrocyte", "Astrocyte end-foot", "Ammonia is turned into glutamine inside astrocytes. Glutamine draws water in, so the cells swell.", "Helps: Lower ammonia, maintain sodium.", part="Astrocyte end-foot"),
]
SPEC["tbi-icp"] = [
 L("organ", "Contusion", "Contusion", "Frontal and temporal poles bruise as the brain strikes bone. Surrounding oedema adds pressure.", "Helps: Head-up 30 degrees, avoid hypotension and hypoxia, osmotherapy, surgical decompression when indicated. Avoid: Hyperventilation except as a brief bridge.", dir=[0.7, 0.1, 0.8]),
 L("organ", "Swollen hemisphere", "Swollen hemisphere", "Raised pressure compresses the brain and reduces perfusion pressure (MAP minus ICP).", "Helps: Keep CPP near 60 to 70 mmHg. Avoid: Fluid that lowers sodium.", dir=[-0.6, 0.5, 0.2]),
 L("cut", "Midline shift", "Midline shift", "Mass effect pushes the midline toward the opposite side. A shift is a surgical warning sign.", "Helps: Neurosurgical review.", cut=[0.1, 0.1]),
 L("cells", "Swollen neurone", "Neuron", "Energy failure and glutamate excitotoxicity swell cells and raise pressure.", "Helps: Maintain oxygen and glucose delivery.", part="Neuron"),
]
SPEC["tbi-hern"] = [
 L("organ", "Uncal herniation", "Uncal herniation", "The medial temporal lobe slips past the tentorium and squeezes the third nerve and brainstem. The pupil dilates.", "Helps: Immediate hyperosmolar therapy, brief hyperventilation as a bridge, urgent surgery. Avoid: Delay.", dir=[0.9, -0.4, 0.2]),
 L("organ", "Tonsillar herniation", "Tonsillar herniation", "The cerebellar tonsils plug the foramen magnum and compress the medulla. Breathing stops.", "Helps: Airway, ventilation and decompression.", dir=[0, -0.8, -1]),
 L("cut", "Midline shift", "Midline shift", "A large shift with compressed ventricles precedes herniation.", "Helps: Emergency decompression.", cut=[0.1, 0.1]),
 L("cells", "Compressed neurone", "Neuron", "Brainstem neurones lose perfusion under compression. This causes the Cushing response and then loss of drive.", "Helps: Restore perfusion by lowering pressure.", part="Neuron"),
]
SPEC["tbi-isch"] = [
 L("organ", "Watershed zone", "Watershed zone", "The boundary between arterial territories is hit first when perfusion falls.", "Helps: Maintain CPP, avoid hypotension, hypoxia and hypocapnia. Avoid: Low MAP.", dir=[0.6, 0.5, -0.5]),
 L("organ", "Infarcted cortex", "Pale infarcted cortex", "The cortex turns pale and soft where flow has failed.", "Helps: Restore perfusion early.", dir=[-0.7, 0.3, 0.4]),
 L("cut", "Pale infarct", "Pale infarct", "A wedge of pale, swollen tissue lies in the territory of the failed artery.", "Helps: Imaging and CPP management.", cut=[0.2, 0.2]),
 L("cells", "Starved neurone", "Neuron", "Without oxygen and glucose the cell fails its pumps and swells, then dies.", "Helps: Oxygenation, glucose, avoiding fever.", part="Neuron"),
]
SPEC["status-inj"] = [
 L("organ", "Medial temporal lobe", "Medial temporal lobe", "The hippocampus is especially vulnerable to prolonged seizures.", "Helps: Stop seizures fast (benzodiazepine, then second-line, then anaesthetic if refractory), treat the cause. Avoid: Delay.", dir=[0.9, -0.3, 0.1]),
 L("organ", "Cortical injury", "Cortical injury", "Prolonged firing injures the cortex diffusely.", "Helps: Early seizure control, check glucose and sodium.", dir=[-0.6, 0.5, 0.5]),
 L("cut", "Swollen cortex", "Swollen cortex", "Cytotoxic oedema swells the grey matter and blurs the boundary with white matter.", "Helps: Control seizures, correct metabolism.", cut=[0, 0.1]),
 L("cells", "Excitotoxic neurone", "Neuron", "Sustained firing floods the cell with calcium and glutamate injures it. Cell death follows after prolonged seizures.", "Helps: Early termination of the seizure.", part="Neuron"),
]
SPEC["dka-brain"] = [
 L("organ", "Swollen brain", "Swollen brain", "Cerebral oedema is uncommon in DKA but can be fatal, mostly in children and after fluid or rapid osmolar shifts.", "Helps: Gradual correction, mannitol or hypertonic saline at the first sign, head-up. Avoid: Fluid boluses, falls in glucose faster than 5 mmol/L per hour, bicarbonate.", dir=[0, 0.5, 1]),
 L("cut", "Effaced sulci", "Effaced sulci", "The sulci narrow and the ventricles shrink as the brain swells.", "Helps: Early recognition, neurological observations.", cut=[0, 0.1]),
 L("cells", "Swollen astrocyte", "Astrocyte end-foot", "Rapid fall in plasma osmolality draws water into brain cells.", "Helps: Correct slowly.", part="Astrocyte end-foot"),
]

# ---------- vessel / bleed / skin / bowel / muscle / pancreas (procedural organs: pins sit on tagged parts) ----------
def VES(label, body, care): return L("cells", label, "Endothelium", body, care, part="Endothelium")
SPEC["dic"] = [
 L("organ", "Fibrin plugs", "Fibrin plugs", "Thrombin generation lays fibrin in small vessels and blocks flow to tissue.", "Helps: Treat the cause, give platelets and FFP only if bleeding. Avoid: Tranexamic acid without a clear indication.", at=[0, 0.1, 0.1]),
 L("cells", "Fibrin mesh", "Fibrin strand", "Cross-linked fibrin traps platelets and red cells, forming microthrombi.", "Helps: Source control. Heparin only for thrombotic DIC.", part="Fibrin strand"),
 VES("Tissue factor displayed", "In sepsis the endothelium and monocytes display tissue factor. That starts the clotting cascade.", "Helps: Antibiotics and source control."),
]
SPEC["shock"] = [
 L("organ", "Dilated arteriole", "Dilated arteriole", "Nitric oxide and low vasopressin vasodilate vessels. Pressure falls despite adequate flow.", "Helps: Fluids, then noradrenaline, add vasopressin, then hydrocortisone if still low. Avoid: Excess fluid.", at=[0, 0.1, 0.1]),
 VES("Leaky endothelium", "The glycocalyx is shed. Protein and fluid leave the capillary.", "Helps: Treat the source. Avoid fluid overload."),
]
SPEC["pancreatitis-shock"] = [
 L("organ", "Leaky vessel", "Capillary leak", "Inflammation and third-space fluid empty the circulation. Pressure falls.", "Helps: Early balanced crystalloid, monitor urine output and lactate. Avoid: Both too little and too much fluid.", at=[0, 0.1, 0.1]),
 VES("Leaky endothelium", "The endothelium becomes permeable under inflammatory mediators, so plasma leaves the vessel.", "Helps: Goal-directed fluids and analgesia."),
]
SPEC["alf-inf"] = [
 L("organ", "Vasoplegia", "Vasoplegic vessel", "Liver failure removes immune and clearing functions and causes vasodilation. Infection and low systemic resistance follow.", "Helps: Blood cultures, broad antibiotics, vasopressor, low threshold for antifungals. Avoid: Delay.", at=[0, 0.1, 0.1]),
 VES("Vasodilated vessel", "Inflammatory mediators and nitric oxide relax vessel walls.", "Helps: Noradrenaline, treat infection."),
]
SPEC["status-hypox"] = [
 L("organ", "Hypoxic vessel", "Hypoxic vessel", "During convulsions oxygen demand outstrips supply and the airway may be unprotected.", "Helps: Airway, oxygen and early seizure control. Avoid: Delay in treatment.", at=[0, 0.1, 0.1]),
 VES("Oxygen-starved endothelium", "Hypoxia and acidosis injure the endothelium and raise permeability.", "Helps: Oxygen and airway protection."),
]
SPEC["dic-thromb"] = [
 L("organ", "Microthrombi", "Microthrombi", "Small clots block capillaries and starve tissue.", "Helps: Treat the trigger. Consider heparin only in clear thrombotic DIC.", at=[0, 0.1, 0.1]),
 L("cells", "Fibrin mesh", "Fibrin strand", "Cross-linked fibrin plugs the vessel.", "Helps: Source control.", part="Fibrin strand"),
 VES("Damaged endothelium", "A damaged lining exposes tissue factor and loses its natural anticoagulants.", "Helps: Treat the cause."),
]
SPEC["dic-bleed"] = [
 L("organ", "Haematoma", "Haematoma", "Blood pools and spreads because clotting factors and platelets are used up.", "Helps: Treat the cause. Platelets if below 50 with bleeding, FFP and fibrinogen for factor loss. Avoid: Giving products with no bleeding.", part="Haematoma"),
 L("organ", "Oozing site", "Oozing blood", "A slow ooze from every raw surface and puncture site.", "Helps: Replace factors and platelets for active bleeding.", part="Oozing blood"),
 L("cells", "Gap in the wall", "Gap in the wall", "A hole with no platelet plug. Red cells escape.", "Helps: Platelets and fibrinogen.", part="Gap in the wall"),
 L("cells", "Missing platelets", "Platelet", "Platelets are consumed in clot formation, so none remain to seal the leak.", "Helps: Transfuse for bleeding or before procedures.", part="Platelet"),
]
SPEC["alf-coag"] = [
 L("organ", "Haematoma", "Haematoma", "The liver no longer makes clotting factors. Tissue bleeds from minor trauma.", "Helps: Vitamin K, treat bleeding with FFP, cryoprecipitate or factor concentrates. Avoid: Correcting INR without bleeding, because it is a prognostic marker.", part="Haematoma"),
 L("organ", "Oozing site", "Oozing blood", "A slow ooze from line sites and mucosa.", "Helps: Platelets above 50 for procedures.", part="Oozing blood"),
 L("cells", "Few platelets", "Platelet", "Low platelets and missing factors make the plug fragile.", "Helps: Replace according to bleeding and procedure.", part="Platelet"),
]
SPEC["tbi-coag"] = [
 L("organ", "Haematoma", "Haematoma", "Brain tissue factor released into the blood triggers coagulopathy. Bleeding into the brain can expand.", "Helps: Early correction of coagulopathy, tranexamic acid within 3 hours of injury, repeat CT. Avoid: Delay.", part="Haematoma"),
 L("organ", "Oozing site", "Oozing blood", "Ooze from the wound and the contusion.", "Helps: Replace platelets, fibrinogen and factors.", part="Oozing blood"),
 L("cells", "Few platelets", "Platelet", "Platelets are used up and function badly after tissue injury.", "Helps: Replace if bleeding.", part="Platelet"),
]
SPEC["dic-purp"] = [
 L("organ", "Purpura", "Purpura", "Purple, non-blanching patches where small vessels are blocked by clot. They are the visible sign of DIC in skin.", "Helps: Treat the cause, protein C concentrate in purpura fulminans, early antibiotics. Avoid: Delay.", dir=[0,0.1,1]),
 L("organ", "Haemorrhagic bulla", "Haemorrhagic bulla", "A blood-filled blister over necrotic skin.", "Helps: Debride once demarcated, wound care.", dir=[0.5,-0.4,1]),
 L("cells", "Microthrombus", "Microthrombus", "Fibrin and platelets plug the dermal vessel and starve the skin.", "Helps: Treat the trigger, anticoagulation selectively.", part="Microthrombus"),
]
SPEC["dic-isch"] = [
 L("organ", "Ischaemic segment", "Ischaemic segment", "A dusky purple-black bowel loop where flow has failed. The mucosa dies first, then the full wall.", "Helps: Early surgical review, restore flow, source control, antibiotics. Avoid: Delay, high-dose vasopressors when possible.", dir=[0.3,-0.2,1]),
 L("organ", "Mesenteric artery", "Mesenteric artery", "Low flow, vasopressors or an embolus reduce flow here.", "Helps: Optimise cardiac output, CT angiography.", dir=[-0.7,0.8,0.3]),
 L("cells", "Dying villus tip", "Villus", "The tip is farthest from the blood supply, so it dies first and the barrier fails.", "Helps: Restore perfusion.", part="Villus"),
]
SPEC["pancreatitis-acs"] = [
 L("organ", "Oedematous bowel", "Oedematous bowel", "Gut oedema and ascites raise intra-abdominal pressure above 20 mmHg with new organ failure.", "Helps: Sedation and paralysis, nasogastric decompression, drain fluid, limit fluids, decompressive laparotomy if refractory. Avoid: Large positive fluid balance.", dir=[-0.3,0.2,1]),
 L("organ", "Mesenteric artery", "Mesenteric artery", "High abdominal pressure squeezes mesenteric flow.", "Helps: Measure bladder pressure.", dir=[-0.7,0.8,0.3]),
 L("cells", "Villus", "Villus", "Low flow starves the villus tips and damages the gut barrier.", "Helps: Reduce abdominal pressure.", part="Villus"),
]
SPEC["pancreatitis-necro"] = [
 L("organ", "Fat necrosis", "Fat necrosis", "Chalky white spots of calcium soap where lipase digests fat.", "Helps: Supportive care, early enteral feeding, antibiotics only for infected necrosis. Avoid: Early necrosectomy.", dir=[0.3,0.4,1]),
 L("organ", "Haemorrhagic necrosis", "Haemorrhage", "Enzymes erode vessels. Dark red wet patches carry a worse outlook.", "Helps: Monitor haemoglobin, angiography for bleeding.", dir=[-0.6,0.1,0.8]),
 L("organ", "Peripancreatic fluid", "Peripancreatic fluid", "A sterile fluid collection that tracks along the retroperitoneum.", "Helps: Drain only if infected or symptomatic.", dir=[0.2,-0.6,1]),
 L("cells", "Self-digesting acinus", "Acinar cell", "Enzymes switch on inside the cell and digest it.", "Helps: Remove the trigger (stone or alcohol).", part="Acinar cell"),
 L("cells", "Zymogen granule", "Zymogen granule", "Granules fuse with lysosomes and trypsin activates.", "Helps: Supportive care.", part="Zymogen granule"),
]
SPEC["pancreatitis-hypoca"] = [
 L("organ", "Fat necrosis soaps", "Fat necrosis", "Fatty acids bind calcium into soaps, so the serum calcium falls.", "Helps: Check calcium and magnesium, replace if symptomatic or QT is long. Avoid: Treating a low total calcium with a normal ionised value.", dir=[0.3,0.4,1]),
 L("cells", "Calcium soap", "Fat necrosis droplet", "Free fatty acids bind calcium to form soaps.", "Helps: Replace calcium if symptomatic.", part="Fat necrosis droplet"),
 L("cells", "Acinar cell", "Acinar cell", "Injured acinar cells release enzymes that digest peripancreatic fat.", "Helps: Remove the trigger.", part="Acinar cell"),
]
SPEC["status-rhabdo"] = [
 L("organ", "Swollen muscle", "Swollen muscle", "Muscle swells inside a tight fascial sleeve. Pressure can compromise perfusion.", "Helps: Early aggressive fluids to keep urine flowing, treat the seizure, check CK, potassium and creatinine. Avoid: Delay, nephrotoxins.", dir=[0,0.5,1]),
 L("organ", "Tight fascia", "Fascia", "Swelling has nowhere to go. Compartment syndrome is possible.", "Helps: Measure compartment pressure if tense.", dir=[0.4,-0.5,1]),
 L("cells", "Torn sarcolemma", "Sarcolemma", "The torn membrane lets CK, potassium and myoglobin into the blood.", "Helps: Fluids, check potassium.", part="Sarcolemma"),
 L("cells", "Myoglobin", "Myoglobin", "Myoglobin blocks tubules and turns the urine tea-coloured.", "Helps: Keep urine flowing.", part="Myoglobin"),
]

def build():
    out = {"organ": ORGAN, "spec": SPEC}
    return out

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "../../sepsis/marks.json"
    d = build()
    with open(path, "w") as f: json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    print(path, sum(len(v) for v in d["spec"].values()), "spec pins in", len(d["spec"]), "complications;", sum(len(v) for v in d["organ"].values()), "part pins")
