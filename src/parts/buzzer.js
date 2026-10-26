// Buzzer: sim.cihaz.ses[pin] = frekans (Hz, 0 = sessiz). Görsel titreşim + ses halkaları; gerçek ses WebAudio ile.
let ctx = null;
const canli = new Set();
let bekci = null;

function sesBaglami() {
  try {
    if (ctx) return ctx;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    // Ders değişince kare() çağrısı kesilen buzzer'ların sesi takılı kalmasın
    bekci = setInterval(() => {
      const simdi = Date.now();
      for (const c of canli) if (simdi - c.son > 300) c.sustur();
    }, 150);
    return ctx;
  } catch { return null; }
}

export default {
  tur: 'buzzer',
  olustur({ THREE, tanim }) {
    const pin = tanim.pin;
    const group = new THREE.Group();
    const govdeMat = new THREE.MeshStandardMaterial({ color: 0x1b1b22, roughness: .5 });
    const govde = new THREE.Mesh(new THREE.CylinderGeometry(5.8, 6, 8, 28), govdeMat);
    govde.position.y = 4;
    const siyahM = new THREE.MeshStandardMaterial({ color: 0x050505 });
    const beyazM = new THREE.MeshStandardMaterial({ color: 0xe6e6e6, roughness: .5 });
    const gumusM = new THREE.MeshStandardMaterial({ color: 0xcfcfcf, metalness: .7, roughness: .3 });
    // Üst yüzde yükseltilmiş kenar halkası, ses deliği ve (+) işareti
    const kenar = new THREE.Mesh(new THREE.TorusGeometry(5.1, .3, 6, 28), govdeMat);
    kenar.rotation.x = Math.PI / 2; kenar.position.y = 8;
    const delik = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, .5, 14), siyahM);
    delik.position.y = 8.05;
    const arti = new THREE.Group();
    arti.add(new THREE.Mesh(new THREE.BoxGeometry(1.8, .15, .45), beyazM), new THREE.Mesh(new THREE.BoxGeometry(.45, .15, 1.8), beyazM));
    arti.position.set(-3.2, 8.05, -3.2);
    group.add(govde, kenar, delik, arti);
    // Alt yüzde lehim etiketi çizgisi ve 2 bacak (+ bacak uzun), 5.08 mm aralık
    for (const [x, boy] of [[-2.54, 7], [2.54, 5.5]]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(.3, .3, boy, 8), gumusM);
      b.position.set(x, 1 - boy / 2 + 1.5, 0);
      group.add(b);
    }

    const halkalar = [0, 1, 2].map(i => {
      const m = new THREE.MeshBasicMaterial({ color: 0x7ee0ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
      const h = new THREE.Mesh(new THREE.RingGeometry(6, 6.8, 40), m);
      h.rotation.x = -Math.PI / 2;
      h.position.y = 9.5;
      h.visible = false;
      group.add(h);
      return { h, m, faz: i / 3 };
    });

    let osc = null, kazanc = null, zaman = 0;
    const ornek = { son: Date.now(), sustur() {
      try { if (osc) { kazanc.gain.setTargetAtTime(0, ctx.currentTime, .01); osc.stop(ctx.currentTime + .05); } } catch {}
      osc = null; kazanc = null; canli.delete(ornek);
    } };

    function sesiAyarla(f, sim) {
      try {
        if (f <= 0 || sim.iptal) { if (osc) ornek.sustur(); return; }
        const c = sesBaglami();
        if (!c) return;
        if (c.state === 'suspended') c.resume().catch(() => {});
        if (!osc) {
          osc = c.createOscillator(); kazanc = c.createGain();
          osc.type = 'square'; kazanc.gain.value = .03;
          osc.connect(kazanc); kazanc.connect(c.destination); osc.start();
          canli.add(ornek);
        }
        osc.frequency.setTargetAtTime(Math.max(20, Math.min(f, 12000)), c.currentTime, .005);
        ornek.son = Date.now();
      } catch { /* ses yoksa sessizce geç */ }
    }

    const durum = { f: 0 };
    return {
      group, durum,
      guncelle(sim) { durum.f = sim.cihaz.ses?.[pin] ?? 0; },
      kare(dt, sim) {
        const f = sim?.cihaz?.ses?.[pin] ?? 0;
        durum.f = f;
        zaman += dt;
        const calan = f > 0;
        govde.position.x = calan ? Math.sin(zaman * 90) * .25 : 0;
        govdeMat.emissive?.setHex(calan ? 0x103040 : 0x000000);
        const hiz = .6 + Math.min(f, 2000) / 1500;
        for (const r of halkalar) {
          if (calan) r.faz = (r.faz + dt * hiz) % 1;
          else r.faz = Math.max(0, r.faz - dt);
          r.h.visible = calan;
          const s = 1 + r.faz * 2.2;
          r.h.scale.set(s, s, s);
          r.m.opacity = calan ? (1 - r.faz) * .7 : 0;
        }
        if (sim) sesiAyarla(f, sim);
      },
    };
  },
};
