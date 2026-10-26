// Otomatik perde: küçük pencere + perde. Perde açıklığı sim.cihaz.servo[servoPin] (0=kapalı, 180=açık).
// Pencerenin dışındaki güneşi yukarı/aşağı sürükle: parlaklık -> sim.analog[isikPin] (0..4095).
const GEN = 30, YUK = 36;           // pencere boyutu (mm)
const GUNES_X = -28;                // güneşin yerel x konumu
const Y0 = 6, Y1 = 46;              // güneşin alt/üst sınırı
const HALKA = 8;                    // perde halkası sayısı

export default {
  tur: 'perde',
  olustur({ THREE, tanim }) {
    const servoPin = tanim.servoPin, isikPin = tanim.isikPin;
    const group = new THREE.Group();
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); group.add(m); return m; };

    const cerceveMat = new THREE.MeshStandardMaterial({ color: 0xf0ede4, roughness: .5 });   // beyaz boyalı ahşap
    const rayMat = new THREE.MeshStandardMaterial({ color: 0xb8b8bd, metalness: .7, roughness: .35 });
    const camMat = new THREE.MeshStandardMaterial({ color: 0xa9dcff, transparent: true, opacity: .35, roughness: .1, metalness: .1, depthWrite: false });

    const cam = add(new THREE.BoxGeometry(GEN, YUK, .6), camMat, 0, YUK / 2 + 2, -.2);
    const kal = 2.5;
    // Dış çerçeve (üst, alt, sol, sağ) + orta kayıt (mullion) + denizlik
    for (const [w, h, d, x, y] of [
      [GEN + 2 * kal, kal, 3, 0, YUK + 2 + kal / 2],
      [GEN + 2 * kal, kal, 3, 0, 2 - kal / 2],
      [kal, YUK, 3, -GEN / 2 - kal / 2, YUK / 2 + 2],
      [kal, YUK, 3, GEN / 2 + kal / 2, YUK / 2 + 2],
      [GEN, 1.2, 1.6, 0, YUK / 2 + 2],
      [1.2, YUK, 1.6, 0, YUK / 2 + 2],
    ]) add(new THREE.BoxGeometry(w, h, d), cerceveMat, x, y, 0);
    add(new THREE.BoxGeometry(GEN + 2 * kal + 5, 1.6, 6), cerceveMat, 0, 2 - kal - .6, 1.4);   // denizlik
    add(new THREE.BoxGeometry(GEN + 2 * kal + 5, .6, 6), cerceveMat, 0, 2 - kal - 1.6, 1.4);

    // Perde kumaşı: kıvrımlı düzlem, solda toplanır (x ölçeği ile)
    const perdeMat = new THREE.MeshStandardMaterial({ color: 0xc23a63, roughness: .85, side: THREE.DoubleSide });
    const perdeGeo = new THREE.PlaneGeometry(GEN + 1, YUK - .5, 40, 1);
    const p = perdeGeo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) / (GEN + 1) * Math.PI * 2 * 7) * .75);
    perdeGeo.computeVertexNormals();
    perdeGeo.translate((GEN + 1) / 2, 0, 0);     // sol kenar orijin
    const perde = new THREE.Mesh(perdeGeo, perdeMat);
    perde.position.set(-GEN / 2 - .5, YUK / 2 + 1.4, 2.2);
    group.add(perde);

    // Ray (kornij) + uç başlıklar + duvar braketleri
    const ray = add(new THREE.CylinderGeometry(.7, .7, GEN + 10, 10), rayMat, 0, YUK + 6, 2.2);
    ray.rotation.z = Math.PI / 2;
    for (const sx of [-1, 1]) {
      add(new THREE.SphereGeometry(1.3, 10, 8), rayMat, sx * (GEN / 2 + 5), YUK + 6, 2.2);
      add(new THREE.BoxGeometry(1, 3, 2.4), rayMat, sx * (GEN / 2 + 2), YUK + 5.3, 1.1);
    }
    // Perde halkaları (kumaşla birlikte kayar)
    const halkaGeo = new THREE.TorusGeometry(1.1, .25, 6, 12);
    const halkalar = [];
    for (let i = 0; i < HALKA; i++) {
      const h = new THREE.Mesh(halkaGeo, rayMat);
      h.position.set(0, YUK + 6, 2.2);
      h.rotation.y = Math.PI / 2;
      group.add(h); halkalar.push(h);
    }

    // Servo mekanizması (rayın sağ ucunda): mavi mini servo + dönen kol
    const servoMavi = new THREE.MeshStandardMaterial({ color: 0x2d6cc4, roughness: .45 });
    const beyaz = new THREE.MeshStandardMaterial({ color: 0xf1f1ec, roughness: .4 });
    add(new THREE.BoxGeometry(11.5, 6, 5.5), servoMavi, GEN / 2 + 11, YUK + 6, 2.2);
    add(new THREE.BoxGeometry(16, 1, 5.5), servoMavi, GEN / 2 + 11, YUK + 7.6, 2.2);
    add(new THREE.CylinderGeometry(2.4, 2.4, 1.2, 14), servoMavi, GEN / 2 + 13, YUK + 3.5, 2.2).rotation.x = Math.PI / 2;
    const horn = new THREE.Group();
    horn.position.set(GEN / 2 + 13, YUK + 6, 5.2);
    const hornKol = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 1), beyaz);
    hornKol.position.x = 3;
    const hornHub = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 1.2, 12), beyaz);
    hornHub.rotation.x = Math.PI / 2;
    horn.add(hornKol, hornHub);
    group.add(horn);
    // Servo kablosu
    for (const [renk, dz] of [[0x6b3a1e, -.8], [0xd22b2b, 0], [0xf08a1c, .8]]) {
      add(new THREE.BoxGeometry(6, .5, .5), new THREE.MeshStandardMaterial({ color: renk }), GEN / 2 + 17.5, YUK + 4.5, 2.2 + dz);
    }

    // Güneş (AYNEN)
    const gunesMat = new THREE.MeshStandardMaterial({ color: 0xffd23b, emissive: 0xffb300, emissiveIntensity: .5 });
    const gunes = new THREE.Mesh(new THREE.SphereGeometry(5, 20, 14), gunesMat);
    const isik = new THREE.PointLight(0xffe08a, 0, 120);
    gunes.add(isik);
    const gunesRay = new THREE.Mesh(new THREE.BoxGeometry(.6, Y1 - Y0 + 10, .6), new THREE.MeshBasicMaterial({ color: 0x555a88 }));
    gunesRay.position.set(GUNES_X, (Y0 + Y1) / 2, 0);
    group.add(gunesRay, gunes);

    let hedef = 0, acik = 0;            // 0..1
    let sürükleniyor = false;
    const duzlem = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const vYerel = new THREE.Vector3(), nokta = new THREE.Vector3();

    function gunesKoy(deger01) {
      const a = Math.max(0, Math.min(1, deger01));
      gunes.position.set(GUNES_X, Y0 + a * (Y1 - Y0), 0);
      gunesMat.emissiveIntensity = .15 + a * 1.6;
      isik.intensity = a * 700;
      camMat.opacity = .3 + a * .15;
    }
    function uygula() {
      const s = Math.max(.12, 1 - acik * .88);
      perde.scale.x = s;
      const x0 = -GEN / 2 - .5;
      for (let i = 0; i < HALKA; i++) halkalar[i].position.x = x0 + (i / (HALKA - 1)) * (GEN + 1) * s;
      horn.rotation.z = -acik * Math.PI;
    }
    gunesKoy(0); uygula();

    function surukle(sim, ctx) {
      if (!ctx?.ray) return;
      group.updateWorldMatrix(true, false);
      vYerel.set(0, 0, 0); group.localToWorld(vYerel);
      const n = new THREE.Vector3(0, 0, 1).transformDirection(group.matrixWorld);
      duzlem.setFromNormalAndCoplanarPoint(n, vYerel);
      if (!ctx.ray.ray.intersectPlane(duzlem, nokta)) return;
      group.worldToLocal(nokta);
      const a = (nokta.y - Y0) / (Y1 - Y0);
      const v = Math.round(Math.max(0, Math.min(1, a)) * 4095);
      if (isikPin) sim.analog[isikPin] = v;
      gunesKoy(v / 4095);
    }

    return {
      group,
      guncelle(sim) {
        const ang = sim?.cihaz?.servo?.[servoPin];
        hedef = ang == null ? 0 : Math.max(0, Math.min(180, +ang || 0)) / 180;
        if (!sürükleniyor && isikPin) gunesKoy((sim.analog?.[isikPin] ?? 0) / 4095);
      },
      kare(dt, sim) {
        if (sim) {
          const ang = sim.cihaz?.servo?.[servoPin];
          hedef = ang == null ? 0 : Math.max(0, Math.min(180, +ang || 0)) / 180;
        }
        acik += (hedef - acik) * Math.min(1, dt * 4);
        uygula();
      },
      pointerDown(sim, ctx) { sürükleniyor = true; surukle(sim, ctx); },
      pointerMove(sim, ctx) { surukle(sim, ctx); },
      pointerUp() { sürükleniyor = false; },
    };
  },
};
