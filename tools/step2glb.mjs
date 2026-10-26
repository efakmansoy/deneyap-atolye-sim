// STEP (renkli, parça parça) -> sadeleştirilmiş GLB. Kullanım: node tools/step2glb.mjs in.step out.glb [oran]
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { Document, NodeIO } from '@gltf-transform/core';
import { weld, simplify } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
const require = createRequire(import.meta.url);
const occt = await require('occt-import-js')();
const [, , inp, out, oranArg = '0.12'] = process.argv;
const sonuc = occt.ReadStepFile(new Uint8Array(fs.readFileSync(inp)), null);
console.log('success', sonuc.success, 'meshes', sonuc.meshes.length);
const doc = new Document(), buf = doc.createBuffer(), sahne = doc.createScene();
const malz = new Map();
const mat = c => {
  const k = c ? c.join(',') : 'yok';
  if (!malz.has(k)) malz.set(k, doc.createMaterial('m' + malz.size).setBaseColorFactor(c ? [c[0], c[1], c[2], 1] : [.6, .6, .6, 1]).setMetallicFactor(.3).setRoughnessFactor(.6));
  return malz.get(k);
};
let n = 0;
for (const m of sonuc.meshes) {
  const pos = new Float32Array(m.attributes.position.array), idx = new Uint32Array(m.index.array);
  const nor = m.attributes.normal ? new Float32Array(m.attributes.normal.array) : null;
  // yüz gruplarına göre renk: brep_faces[].color
  const gruplar = m.brep_faces?.length ? m.brep_faces : [{ first: 0, last: idx.length / 3 - 1, color: m.color }];
  const renkli = new Map();
  for (const f of gruplar) {
    const k = (f.color ?? m.color)?.join(',') ?? 'yok';
    if (!renkli.has(k)) renkli.set(k, { c: f.color ?? m.color, idx: [] });
    for (let t = f.first; t <= f.last; t++) renkli.get(k).idx.push(idx[t * 3], idx[t * 3 + 1], idx[t * 3 + 2]);
  }
  const mesh = doc.createMesh(m.name || 'p' + n++);
  const P = doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buf);
  const N = nor && doc.createAccessor().setType('VEC3').setArray(nor).setBuffer(buf);
  for (const g of renkli.values()) {
    const prim = doc.createPrimitive().setAttribute('POSITION', P).setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(g.idx)).setBuffer(buf)).setMaterial(mat(g.c));
    if (N) prim.setAttribute('NORMAL', N);
    mesh.addPrimitive(prim);
  }
  sahne.addChild(doc.createNode(mesh.getName()).setMesh(mesh));
}
await MeshoptSimplifier.ready;
await doc.transform(weld({ tolerance: 0.001 }), simplify({ simplifier: MeshoptSimplifier, ratio: Number(oranArg), error: 0.02 }));
await new NodeIO().write(out, doc);
console.log('renkler:', [...malz.keys()].slice(0, 12).join(' | '));
console.log(out, fs.statSync(out).size, 'bayt');
