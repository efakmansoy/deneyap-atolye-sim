// PIR hareket sensörü (HC-SR501 tarzı, beyaz kubbe lens). İnsan figürünü sürükle: sensör alanına girince/alanda
// hareket edince sim.girdi[pin] = 1; hareket durduktan veya alandan çıkınca ~1.5 sn (gerçek zaman) sonra 0.
const MENZIL = 70, YARI_ACI = 52 * Math.PI / 180;   // algılama alanı: yarıçap (mm) ve yarım açı
const BEKLEME = 1500;                               // ms

export default {
  tur: 'pir',
  olustur({ THREE, tanim }) {
    const pin = tanim.pin ?? 'D5';
    const group = new THREE.Group();
    const add = (geo, mat, x, y, z, ebeveyn = group) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); ebeveyn.add(m); return m; };

    const pcb = new THREE.MeshStandardMaterial({ color: 0x2c8a4a, roughness: .55 });
    const siyah = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: .6 });
    const metal = new THREE.MeshStandardMaterial({ color: 0xc9c9cf, metalness: .7, roughness: .3 });
    const altin = new THREE.MeshStandardMaterial({ color: 0xd9b24a, metalness: .8, roughness: .3 });
    const turuncu = new THREE.MeshStandardMaterial({ color: 0xe8a020, roughness: .5 });
    const lensMat = new THREE.MeshStandardMaterial({ color: 0xf4f4ee, roughness: .35, transparent: true, opacity: .95 });

    // PCB 32 x 24 x 1.6 (y=7), 3 pinli başlık (VCC, OUT, GND), 2 turuncu trimpot, lehim noktaları
    add(new THREE.BoxGeometry(32, 1.6, 24), pcb, 0, 7, 0);
    add(new THREE.BoxGeometry(7.62 + 2.5, 2.5, 2.5), siyah, 0, 5.4, -10);
    for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(.64, 8, .64), altin, (i - 1) * 2.54, 3.4, -10);
    for (const x of [-10, -5]) {
      add(new THREE.BoxGeometry(5, 4, 5), turuncu, x, 9.4, -7);
      add(new THREE.CylinderGeometry(1.2, 1.2, .4, 10), metal, x, 11.6, -7);
    }
    add(new THREE.BoxGeometry(7, 1.2, 4), siyah, 9, 8.2, -7);                       // BISS0001
    // Metal koruyucu çerçeve + beyaz Fresnel kubbe lens (çapı ~23 mm)
    add(new THREE.CylinderGeometry(12.4, 12.4, 5, 28), metal, 0, 10.2, 3);
    const kubbe = add(new THREE.SphereGeometry(10.4, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), lensMat, 0, 12.7, 3);
    kubbe.scale.set(1, .85, 1);
    for (const r of [4, 7, 9.6]) {                                                  // Fresnel halkaları
      const h = add(new THREE.TorusGeometry(r, .22, 6, 32), new THREE.MeshStandardMaterial({ color: 0xd8d8d0, roughness: .4 }), 0, 12.7 + Math.sqrt(Math.max(0, 108 - r * r)) * .85, 3);
      h.rotation.x = Math.PI / 2;
    }

    // Algılama alanı: yerde yarı saydam pasta dilimi (+z yönüne bakar)
    const alanMat = new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: .16, side: THREE.DoubleSide, depthWrite: false });
    const alan = add(new THREE.CircleGeometry(MENZIL, 40, Math.PI / 2 - YARI_ACI, YARI_ACI * 2), alanMat, 0, .3, 3);
    alan.rotation.x = Math.PI / 2;

    // İnsan figürü: sürüklenebilir (yer düzleminde)
    const figur = new THREE.Group(); group.add(figur);
    const govdeMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: .6 });
    const ten = new THREE.MeshStandardMaterial({ color: 0xf0c9a0, roughness: .6 });
    add(new THREE.CylinderGeometry(3.2, 4.2, 12, 14), govdeMat, 0, 14, 0, figur);
    add(new THREE.SphereGeometry(3.2, 16, 12), ten, 0, 23, 0, figur);
    for (const x of [-2, 2]) add(new THREE.CylinderGeometry(1.5, 1.5, 8, 8), new THREE.MeshStandardMaterial({ color: 0x1f2937 }), x, 4, 0, figur);
    for (const x of [-5.2, 5.2]) add(new THREE.CylinderGeometry(1.1, 1.1, 10, 8), govdeMat, x, 14.5, 0, figur);
    add(new THREE.RingGeometry(5, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: .7 }), 0, .4, 0, figur).rotation.x = -Math.PI / 2;
    figur.traverse(o => { o.userData.figur = true; });
    figur.position.set(58, 0, 40);

    const durum = { icinde: false, cikis: 0 };
    let tutuyor = false, son = 0, sonX = 0, sonZ = 0, kendi = false;   // kendi: çıkışı 1 yapan bu parçanın figürüdür (senaryo/test girdisini sıfırlama)
    const alandaMi = () => {
      const dx = figur.position.x, dz = figur.position.z - 3;
      return Math.hypot(dx, dz) <= MENZIL && dz > 0 && Math.abs(Math.atan2(dx, dz)) <= YARI_ACI;
    };
    const yaz = (sim, v) => { if (sim.girdi[pin] !== v) { sim.girdi[pin] = v; sim.yay?.(); } };
    function tasi(sim, ray) {
      const r = ray?.ray; if (!r) return;
      const duzlem = new THREE.Plane(new THREE.Vector3(0, 1, 0), -group.position.y);
      const n = r.intersectPlane(duzlem, new THREE.Vector3()); if (!n) return;
      const x = Math.max(-45, Math.min(130, n.x - group.position.x)), z = Math.max(-20, Math.min(110, n.z - group.position.z));
      const hareket = Math.hypot(x - sonX, z - sonZ) > .05;
      figur.position.set(x, 0, z); sonX = x; sonZ = z;
      durum.icinde = alandaMi();
      if (durum.icinde && hareket) { son = Date.now(); kendi = true; yaz(sim, 1); }
      alanMat.opacity = durum.icinde ? .32 : .16;
    }

    return {
      group, durum,
      guncelle(sim) { if (sim.girdi[pin] === undefined) sim.girdi[pin] = 0; },
      kare(dt, sim) {
        if (!sim) return;
        // Hareket yoksa (sabit duran figür dahil) 1.5 sn sonra çıkış düşer
        if (sim.girdi[pin] !== 1) kendi = false;
        else if (kendi && Date.now() - son > BEKLEME) { kendi = false; yaz(sim, 0); }
        alanMat.opacity = sim.girdi[pin] === 1 ? .34 : .16;
      },
      pointerDown(sim, ctx) {
        tutuyor = !!ctx?.isabet?.object?.userData?.figur;
        if (tutuyor && ctx.ray) { sonX = figur.position.x; sonZ = figur.position.z; tasi(sim, ctx.ray); }
      },
      pointerMove(sim, ctx) { if (tutuyor && ctx.ray) tasi(sim, ctx.ray); },
      pointerUp() { tutuyor = false; },
    };
  },
};
