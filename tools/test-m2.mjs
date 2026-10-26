// Modül 2 testi: node tools/test-m2.mjs
// Vite SSR ile blocks.js (eklentiler dahil) ve dersleri yükler; blok çözümlerini üretip Sim üzerinde çalıştırır.
import { createServer } from 'vite';
import * as THREE from 'three';

const SHIM = new URL('./_blockly-shim.mjs', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const vite = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'error',
  plugins: [{ name: 'shim', enforce: 'pre', transform(code, id) { if (/[\/]src[\/]blocks\.js$/.test(id)) return code.replace("from 'blockly/core'", `from '${SHIM}'`); } }] });
let fail = 0;
const kontrolEt = (ad, kosul, ek = '') => { console.log((kosul ? 'OK   ' : 'FAIL ') + ad + (ek ? '  -> ' + ek : '')); if (!kosul) fail++; };
try {
  const { Blockly, generator, TOOLBOX } = await vite.ssrLoadModule('/src/blocks.js');
  const { Sim, DurdurSinyali } = await vite.ssrLoadModule('/src/sim.js');
  const { DERSLER } = await vite.ssrLoadModule('/src/lessons/index.js');
  const dersler = DERSLER.filter(d => d.modul?.startsWith('Modül 2'));
  kontrolEt('5 ders yüklendi', dersler.length === 5, dersler.map(d => d.id).join(','));
  const kats = TOOLBOX.contents.map(c => c.name);
  kontrolEt('kategoriler', ['Değişkenler', 'Düğme', 'Metin'].every(k => kats.includes(k)), kats.join(','));

  const num = n => ({ type: 'math_number', fields: { NUM: n } });
  const txt = t => ({ type: 'text', fields: { TEXT: t } });
  const get = v => ({ type: 'variables_get', fields: { VAR: { id: v } } });
  const set = (v, deger) => ({ type: 'variables_set', fields: { VAR: { id: v } }, inputs: { VALUE: { block: deger } } });
  const bas = p => ({ type: 'dy_dugme_basili', fields: { PIN: p } });
  const yaz = (pin, deg) => ({ type: 'dy_dugme_yaz', fields: { PIN: pin }, inputs: { DEG: { block: deg } } });
  const zincir = (...b) => { for (let i = 0; i < b.length - 1; i++) b[i].next = { block: b[i + 1] }; return b[0]; };
  const surekli = (...b) => ({ type: 'dy_surekli', inputs: { GOVDE: { block: zincir(...b) } } });
  const birl = (a, b) => ({ type: 'dy_degisken_birlestir', inputs: { A: { block: a }, B: { block: b } } });
  const bekle = ms => ({ type: 'dy_bekle', inputs: { MS: { block: num(ms) } } });
  const seri = m => ({ type: 'dy_seri', inputs: { METIN: { block: m } } });
  const dBekle = (p, d) => ({ type: 'dy_dugme_bekle', fields: { PIN: p, DURUM: d } });
  const mantik = (op, a, b) => ({ type: 'logic_operation', fields: { OP: op }, inputs: { A: { block: a }, B: { block: b } } });

  const kodUret = (blok, degiskenler = []) => {
    const ws = new Blockly.Workspace();
    Blockly.serialization.workspaces.load({ blocks: { languageVersion: 0, blocks: [blok] }, variables: degiskenler.map(([id, name]) => ({ id, name })) }, ws);
    const kod = generator.workspaceToCode(ws);
    ws.dispose();
    return kod;
  };

  const calistir = async (ders, kod) => {
    const sim = new Sim(); sim.hiz = 5;
    sim.cihaz = {}; // kontrol geçmişi sıfır
    const calis = new Function('sim', `return (async () => {\n${kod}\n})();`);
    let zt; const bitir = new Promise(r => { zt = setTimeout(r, ders.sure / sim.hiz); });
    ders.girdi(sim).catch(e => { if (!(e instanceof DurdurSinyali)) console.error('girdi hatası', e); });
    const program = calis(sim).catch(e => { if (!(e instanceof DurdurSinyali)) throw e; });
    await Promise.race([program, bitir]);
    clearTimeout(zt);
    sim.t = Math.max(sim.t, ders.sure); sim.iptal = true;
    await new Promise(r => setTimeout(r, 20));
    return { sim, s: ders.kontrol(sim) };
  };

  const dogru = {
    'buton-led': [surekli(yaz('D2', bas('D5')))],
    'iki-buton': [surekli(yaz('D2', mantik('AND', bas('D5'), bas('D6'))), yaz('D3', mantik('OR', bas('D5'), bas('D6'))))],
    'seri-monitor': [surekli(seri(birl(txt('Düğme: '), { type: 'dy_dugme_deger', fields: { PIN: 'D5' } })), bekle(200))],
    'dugme-sayaci': [zincir(set('v1', num(0)), surekli(dBekle('D5', '1'),
      { type: 'math_change', fields: { VAR: { id: 'v1' } }, inputs: { DELTA: { block: num(1) } } }, seri(get('v1')), dBekle('D5', '0'))), [['v1', 'sayac']]],
    'refleks-oyunu': [zincir(bekle(2000), { type: 'dy_yaz', fields: { PIN: 'D2', DEG: '1' } },
      set('v1', { type: 'dy_degisken_zaman' }), dBekle('D5', '1'),
      set('v2', { type: 'math_arithmetic', fields: { OP: 'MINUS' }, inputs: { A: { block: { type: 'dy_degisken_zaman' } }, B: { block: get('v1') } } }),
      seri(birl(birl(txt('Tepki: '), { type: 'dy_degisken_sayi_metin', inputs: { SAYI: { block: get('v2') } } }), txt(' ms'))),
      { type: 'dy_yaz', fields: { PIN: 'D2', DEG: '0' } }), [['v1', 'baslangic'], ['v2', 'sure']]],
  };
  // controls_if ... else varyantı
  const ifElse = { type: 'controls_if', extraState: { hasElse: true }, inputs: {
    IF0: { block: bas('D5') }, DO0: { block: { type: 'dy_yaz', fields: { PIN: 'D2', DEG: '1' } } },
    ELSE: { block: { type: 'dy_yaz', fields: { PIN: 'D2', DEG: '0' } } } } };
  const yanlis = {
    'buton-led': 'sim.yaz("D2", 1);',
    'iki-buton': 'while(true){ await sim.tick(); sim.yaz("D2", sim.oku("D5")||sim.oku("D6")); sim.yaz("D3", sim.oku("D5")||sim.oku("D6")); }',
    'seri-monitor': 'sim.seri("merhaba");',
    'dugme-sayaci': 'let n=0; while(true){ await sim.tick(); if(sim.oku("D5")){ n++; sim.seri(n);} }',
    'refleks-oyunu': 'sim.yaz("D2",1); sim.seri("Tepki: 5 ms");',
  };

  for (const ders of dersler) {
    const [blok, vars] = dogru[ders.id];
    const kod = kodUret(blok, vars ?? []);
    const { sim, s } = await calistir(ders, kod);
    kontrolEt(`${ders.id} doğru çözüm`, s.ok, s.mesaj + (s.ok ? '' : '\n' + kod + '\nseri=' + JSON.stringify(sim.seriCikti)));
    const y = await calistir(ders, yanlis[ders.id]);
    kontrolEt(`${ders.id} yanlış çözüm reddedildi`, !y.s.ok, y.s.mesaj);
  }
  {
    const kod = kodUret(surekli(ifElse));
    const { s } = await calistir(dersler[0], kod);
    kontrolEt('buton-led eğer/değilse varyantı', s.ok, s.mesaj);
  }

  // Parça testi
  const mod = (await vite.ssrLoadModule('/src/parts/dugme.js')).default;
  const sim = new Sim();
  const n = mod.olustur({ THREE, tanim: { tur: 'dugme', pin: 'D5' }, konum: new THREE.Vector3(), index: 0 });
  const y0 = n.group.children.find(c => c.geometry.type === 'CylinderGeometry').position.y;
  n.pointerDown(sim, {}); n.guncelle(sim);
  const kapak = n.group.children.find(c => c.geometry.type === 'CylinderGeometry');
  kontrolEt('dugme pointerDown -> girdi=1, kapak iner', sim.girdi.D5 === 1 && kapak.position.y < y0);
  n.pointerUp(sim, {});
  kontrolEt('dugme pointerUp -> girdi=0, kapak yükselir', sim.girdi.D5 === 0 && kapak.position.y === y0);
} finally { await vite.close(); }
console.log(fail ? `\n${fail} HATA` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
