// Binary STL -> weld -> simplify -> GLB (konum + normal). Kullanım: node tools/decimate.mjs in.stl out.glb hedefUcgenOrani
import fs from 'node:fs';
import { Document, NodeIO } from '@gltf-transform/core';
import { weld, simplify, getBounds } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';

const [, , inp, out, ratioArg = '0.04'] = process.argv;
const buf = fs.readFileSync(inp);
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const n = dv.getUint32(80, true);
const pos = new Float32Array(n * 9);
for (let i = 0; i < n; i++) {
  const o = 84 + i * 50 + 12;
  for (let k = 0; k < 9; k++) pos[i * 9 + k] = dv.getFloat32(o + k * 4, true);
}
const doc = new Document();
const b = doc.createBuffer();
const acc = doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(b);
const prim = doc.createPrimitive().setAttribute('POSITION', acc);
const mesh = doc.createMesh('board').addPrimitive(prim);
doc.createScene().addChild(doc.createNode('board').setMesh(mesh));
await MeshoptSimplifier.ready;
await doc.transform(weld({ tolerance: 0.001 }), simplify({ simplifier: MeshoptSimplifier, ratio: Number(ratioArg), error: 0.01 }));
const p = doc.getRoot().listMeshes()[0].listPrimitives()[0];
console.log('tris', n, '->', p.getIndices().getCount() / 3, 'bounds', JSON.stringify(getBounds(doc.getRoot().listScenes()[0])));
await new NodeIO().write(out, doc);
console.log(out, fs.statSync(out).size, 'bytes');
