// Rebuild locally bundled, licensed anatomy. See models/anatomy/ATTRIBUTION.md.
// Optional conversion tools are installed outside this repository.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.env.ANATOMY_TOOLS_ROOT;
if(!root)throw Error('Set ANATOMY_TOOLS_ROOT to the conversion tools directory. See README.');
const {NodeIO,Document}=await import(pathToFileURL(path.join(root,'node_modules/@gltf-transform/core/dist/index.modern.js')));
const {MeshoptSimplifier}=await import(pathToFileURL(path.join(root,'node_modules/meshoptimizer/index.module.js')));
const {mat3,vec3,mat4}=await import(pathToFileURL(path.join(root,'node_modules/gl-matrix/esm/index.js')));
const [input,bpManifest,bpChunk,output]=process.argv.slice(2);
if(!output)throw Error('Arguments: HRA.glb BP-atlas.json BP-body-9.bin output.glb');
await MeshoptSimplifier.ready;
const io=new NodeIO(), source=await io.read(input), doc=new Document(), buffer=doc.createBuffer(), scene=doc.createScene();
const sourceNodes=source.getRoot().listNodes(), byName=new Map(sourceNodes.map(n=>[n.getName(),n]));
const height=1.82951877, floorOffset=0.91462487;
const definitions=[
 ['body',['VH_M_skin'],[0.56,0.33,0.23],50000],
 ['eyes',['VH_M_sclera_R','VH_M_sclera_L'],[0.83,0.80,0.72],2500],
 ['irises',['VH_M_iris_R','VH_M_iris_L'],[0.13,0.075,0.025],1200],
 ['pupils',['VH_M_pupil_R','VH_M_pupil_L'],[0.008,0.010,0.009],800],
 ['brain',['Allen_brain'],[0.66,0.40,0.38],28000],
 ['spinal',['VH_M_spinal_cord'],[0.83,0.73,0.44],6500],
 ['lungs',['VH_M_lungs'],[0.63,0.34,0.38],18000],
 ['heart',['VH_M_heart'],[0.46,0.075,0.065],14000],
 ['liver',['VH_M_liver'],[0.34,0.095,0.075],9500],
 ['pancreas',['VH_M_pancreas'],[0.80,0.57,0.28],5000],
 ['spleen',['VH_M_spleen'],[0.32,0.12,0.24],4000],
 ['kidneys',['VH_M_left_kidney','VH_M_right_kidney'],[0.50,0.16,0.12],11000],
 ['bowel',['VH_M_small_intestine','VH_M_colon'],[0.67,0.37,0.30],20000],
 ['bladder',['VH_M_urinary_bladder'],[0.78,0.62,0.34],4000],
 ['arteries',['VH_M_aorta','VH_M_pulmonary_artery'],[0.63,0.07,0.055],8000],
 ['veins',['VH_M_vena_cava','VH_M_pulmonary_vein'],[0.09,0.24,0.43],7000]
];
const report={source:'Human Reference Atlas, United Male v1.5',height,sourceSha256:null,parts:[]};
const crypto=await import('node:crypto');report.sourceSha256=crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex');
report.bodyParts3DInputs={manifestSha256:crypto.createHash('sha256').update(fs.readFileSync(bpManifest)).digest('hex'),geometrySha256:crypto.createHash('sha256').update(fs.readFileSync(bpChunk)).digest('hex')};
function addPart(id,positions,normals,indices,color,budget,names,sourceName='HRA'){
 let idx=Uint32Array.from(indices), pos=Float32Array.from(positions), nor=Float32Array.from(normals);
 // Weld coincident positions before simplifying; HRA often duplicates triangle vertices.
 const seen=new Map(),remap=new Uint32Array(pos.length/3),wp=[],wn=[];
 for(let i=0;i<remap.length;i++){
  const key=`${pos[i*3]},${pos[i*3+1]},${pos[i*3+2]}`;let n=seen.get(key);
  if(n===undefined){n=wp.length/3;seen.set(key,n);wp.push(...pos.subarray(i*3,i*3+3));wn.push(0,0,0)}
  remap[i]=n;for(let a=0;a<3;a++)wn[n*3+a]+=nor[i*3+a];
 }
 for(let i=0;i<wn.length;i+=3){const l=Math.hypot(...wn.slice(i,i+3))||1;for(let a=0;a<3;a++)wn[i+a]/=l}
 pos=Float32Array.from(wp);nor=Float32Array.from(wn);idx=Uint32Array.from(idx,i=>remap[i]);
 const before=idx.length/3;
 const [reduced,error]=MeshoptSimplifier.simplify(idx,pos,3,Math.min(idx.length,budget*3),0.003,['LockBorder']);
 const [mapping,count]=MeshoptSimplifier.compactMesh(reduced),cp=new Float32Array(count*3),cn=new Float32Array(count*3);
 for(let i=0;i<mapping.length;i++){const n=mapping[i];if(n===0xffffffff)continue;cp.set(pos.subarray(i*3,i*3+3),n*3);cn.set(nor.subarray(i*3,i*3+3),n*3)}
 const indexArray=count<65536?Uint16Array.from(reduced):reduced;
 const mat=doc.createMaterial(id).setBaseColorFactor([...color,1]).setMetallicFactor(0).setRoughnessFactor(id==='body'?0.7:0.58).setDoubleSided(false);
 const prim=doc.createPrimitive().setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(cp).setBuffer(buffer))
  .setAttribute('NORMAL',doc.createAccessor().setType('VEC3').setArray(cn).setBuffer(buffer))
  .setIndices(doc.createAccessor().setType('SCALAR').setArray(indexArray).setBuffer(buffer)).setMaterial(mat);
 const mesh=doc.createMesh(id).addPrimitive(prim),node=doc.createNode(id).setMesh(mesh).setExtras({anatomyId:['arteries','veins'].includes(id)?'vessels':id,source:sourceName,sourceNodes:names});scene.addChild(node);
 report.parts.push({id,source:sourceName,sourceNodes:names,sourceTriangles:before,triangles:reduced.length/3,vertices:count,relativeError:error});
 console.log(id,before,'→',reduced.length/3,'triangles');
}
for(const [id,roots,color,budget]of definitions){
 const selected=new Set();for(const name of roots){const node=byName.get(name);if(node)node.traverse(n=>{if(n.getMesh())selected.add(n)})}
 if(!selected.size)throw Error(`No actual source meshes found for ${id}`);
 const positions=[],normals=[],indices=[],names=[];
 for(const node of selected){const m=node.getWorldMatrix(),nm=mat3.normalFromMat4(mat3.create(),m),flip=mat4.determinant(m)<0;names.push(node.getName());
  for(const p of node.getMesh().listPrimitives()){
   const a=p.getAttribute('POSITION').getArray(),n=p.getAttribute('NORMAL').getArray(),idx=p.getIndices()?.getArray()||Uint32Array.from({length:a.length/3},(_,i)=>i),offset=positions.length/3;
   for(let i=0;i<a.length;i+=3){const v=vec3.transformMat4(vec3.create(),a.subarray(i,i+3),m);positions.push(v[0],v[1]+floorOffset,v[2]);const normal=vec3.normalize(vec3.create(),vec3.transformMat3(vec3.create(),n.subarray(i,i+3),nm));normals.push(...normal)}
   for(let i=0;i<idx.length;i+=3)indices.push(idx[i]+offset,idx[i+(flip?2:1)]+offset,idx[i+(flip?1:2)]+offset);
  }
 }
 addPart(id,positions,normals,indices,color,budget,names);
}
// HRA v1.5 has no stomach. Use the actual BodyParts3D FJ2564 stomach surface.
const bp=JSON.parse(fs.readFileSync(bpManifest)),p=bp.parts.find(p=>p.id==='FJ2564'),binary=fs.readFileSync(bpChunk),copy=(offset,count,type)=>new type(binary.buffer.slice(binary.byteOffset+offset,binary.byteOffset+offset+count*type.BYTES_PER_ELEMENT));
const bpPos=copy(p.positions,p.vertexCount*3,Float32Array),bpNor=copy(p.normals,p.vertexCount*3,Int16Array),bpIdx=copy(p.indices,p.indexCount,Uint32Array),scale=height/1.7194712;
for(let i=0;i<bpPos.length;i+=3){bpPos[i]*=scale;bpPos[i+1]=bpPos[i+1]*scale+0.035;bpPos[i+2]*=scale}
addPart('stomach',bpPos,Float32Array.from(bpNor,n=>n/32767),bpIdx,[0.73,0.39,0.30],3000,['FJ2564: Stomach'],'BodyParts3D 4.0, registered reference');
Object.assign(doc.getRoot().getAsset(),{version:'2.0',generator:'HRA/BodyParts3D anatomical subset; scripts/build-anatomy-model.mjs',copyright:'Kristen Browne and Heidi Schlehlein / HuBMAP, CC BY 4.0; stomach: BodyParts3D © DBCLS, CC BY 4.0'});
await io.write(output,doc);
report.triangles=report.parts.reduce((n,p)=>n+p.triangles,0);report.bytes=fs.statSync(output).size;
fs.writeFileSync(path.join(path.dirname(output),'model-manifest.json'),JSON.stringify(report,null,2)+'\n');
console.log('TOTAL',report.triangles,'triangles',report.bytes,'bytes');
