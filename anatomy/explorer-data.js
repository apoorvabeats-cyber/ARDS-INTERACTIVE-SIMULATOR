export const MODEL = {
  url: './models/anatomy/human-reference.glb',
  name: 'Human Reference Atlas · United Male v1.5',
  attribution: 'models/anatomy/ATTRIBUTION.md',
  source: 'https://doi.org/10.48539/HBM646.RKKC.257',
  maxBytes: 12 * 1024 * 1024,
  version: 'hra-1'
};
// Informational descriptions of reference anatomy; no patient measurements.
export const ORGANS = [
  {id:'brain',name:'Brain',system:'Nervous',color:'#e8adad',side:-1,description:'The brain integrates sensation, movement, cognition and autonomic regulation. The cerebral hemispheres, cerebellum and brainstem are represented by HRA source surfaces.',location:'Cranial cavity',clinical:'brain'},
  {id:'spinal',name:'Spinal cord',system:'Nervous',color:'#e0d19b',side:1,description:'Spinal-cord segments carry signals between the brain and body and organize spinal reflexes. Examine from behind or isolate to see the cervical, thoracic, lumbar and sacral reference segments.',location:'Vertebral canal',clinical:'spinal'},
  {id:'lungs',name:'Lungs',system:'Respiratory',color:'#e5a4b3',side:-1,description:'The paired lungs exchange oxygen and carbon dioxide. The right lung has three lobes and the left has two; their source lobe surfaces retain the cardiac notch and fissure boundaries.',location:'Thoracic cavity',clinical:'lungs'},
  {id:'heart',name:'Heart',system:'Cardiovascular',color:'#ed7975',side:1,description:'The heart drives pulmonary and systemic circulation. The reference includes atrial and ventricular structures, papillary muscles and valves. Isolate it to inspect the surfaces from every direction.',location:'Middle mediastinum',clinical:'heart'},
  {id:'liver',name:'Liver',system:'Digestive',color:'#c88270',side:-1,description:'The liver processes nutrients, produces bile and synthesizes many plasma proteins. Its lobes, segment surfaces and capsule are grouped here as a single selectable organ.',location:'Right upper abdomen',clinical:'liver'},
  {id:'stomach',name:'Stomach',system:'Digestive',color:'#f0ad92',side:1,description:'The stomach stores and mixes food and begins protein digestion. This actual BodyParts3D stomach surface is registered into the HRA assembly; it is a composite reference rather than an original HRA organ.',location:'Left upper abdomen',clinical:'stomach',source:'BodyParts3D 4.0 · FJ2564 · registered reference'},
  {id:'spleen',name:'Spleen',system:'Lymphatic',color:'#c59bc5',side:1,description:'The spleen filters blood, supports immune responses and removes aging red cells. Its gastric, diaphragmatic, colic and renal surfaces are included in the source geometry.',location:'Left upper abdomen, lateral to stomach',clinical:'spleen'},
  {id:'pancreas',name:'Pancreas',system:'Digestive / endocrine',color:'#e6c16e',side:1,description:'The pancreas supplies digestive enzymes and hormones including insulin and glucagon. Its head, neck, body, tail and uncinate process are grouped for examination.',location:'Posterior upper abdomen',clinical:'pancreas'},
  {id:'kidneys',name:'Kidneys',system:'Urinary',color:'#d98f7d',side:-1,description:'The kidneys regulate fluid, electrolytes and acid–base balance and filter blood to form urine. Both kidneys are included, with capsule, cortex and internal source surfaces.',location:'Retroperitoneum',clinical:'kidneys'},
  {id:'bowel',name:'Intestines',system:'Digestive',color:'#e6b09b',side:-1,description:'The small intestine absorbs most nutrients. The large intestine absorbs water and forms stool. The reference includes duodenum, jejunum, ileum and the colonic segments.',location:'Abdominal and pelvic cavities',clinical:'bowel'},
  {id:'bladder',name:'Bladder',system:'Urinary',color:'#e7ca8d',side:1,description:'The urinary bladder stores urine before voiding. The dome, base, neck and trigonal region are represented in the HRA reference surfaces.',location:'Pelvis, behind the pubic symphysis',clinical:'bladder'},
  {id:'vessels',name:'Major blood vessels',system:'Cardiovascular',color:'#68d4db',side:1,description:'The aorta and venae cavae connect the heart to the systemic circulation; pulmonary vessels connect it to the lungs. Red and blue are conventional display colors, not a measured oxygenation map.',location:'Thorax and abdomen',clinical:'vessels'}
];
