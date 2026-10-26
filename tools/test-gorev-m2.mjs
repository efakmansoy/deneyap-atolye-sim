// Modül 2 görevler testi: node tools/test-gorev-m2.mjs
// Her kod görevi için referans çözüm (sim API'si) çalıştırılır; boş/yanlış çözüm reddedilmeli.
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', logLevel: 'error' });
let fail = 0;
const kontrolEt = (ad, kosul, ek = '') => { console.log((kosul ? 'OK   ' : 'FAIL ') + ad + (ek ? '  -> ' + ek : '')); if (!kosul) fail++; };
try {
  const { Sim, DurdurSinyali } = await vite.ssrLoadModule('/src/sim.js');
  const { DERSLER } = await vite.ssrLoadModule('/src/lessons/index.js');
  const dersler = DERSLER.filter(d => d.modul?.startsWith('Modül 2'));

  const BEKLE_BAS = `while(!sim.oku("D5")) await sim.tick();`;
  const BEKLE_BIR = `while(sim.oku("D5")) await sim.tick();`;
  // ders id -> görev başlığı -> [doğru çözüm, yanlış çözüm]
  const C = {
    'buton-led': {
      'Ters mantık': [`while(true){ sim.yaz("D2", !sim.oku("D5")); await sim.tick(); }`, `while(true){ sim.yaz("D2", sim.oku("D5")); await sim.tick(); }`],
      'Kısa dokun, bir saniye yansın': [`while(true){ if(sim.oku("D5")){ sim.yaz("D2",1); await sim.bekle(1000); sim.yaz("D2",0);} await sim.tick(); }`, `while(true){ sim.yaz("D2", sim.oku("D5")); await sim.tick(); }`],
      'Basılı tutarken yanıp sönsün': [`while(true){ if(sim.oku("D5")){ sim.yaz("D2",1); await sim.bekle(200); sim.yaz("D2",0); await sim.bekle(200);} else { sim.yaz("D2",0); await sim.tick();} }`, `while(true){ sim.yaz("D2", sim.oku("D5")); await sim.tick(); }`],
    },
    'iki-buton': {
      'Hiçbirine basılmıyorsa yansın': [`while(true){ sim.yaz("D2", !(sim.oku("D5")||sim.oku("D6"))); await sim.tick(); }`, `while(true){ sim.yaz("D2", sim.oku("D5")||sim.oku("D6")); await sim.tick(); }`],
      'Öncelikli düğme': [`while(true){ sim.yaz("D3", sim.oku("D6")); sim.yaz("D2", sim.oku("D5") && !sim.oku("D6")); await sim.tick(); }`, `while(true){ sim.yaz("D3", sim.oku("D6")); sim.yaz("D2", sim.oku("D5")); await sim.tick(); }`],
      'Seri monitörde haber ver': [`while(true){ if(sim.oku("D5")&&sim.oku("D6")){ sim.seri("IKISI"); await sim.bekle(200);} else await sim.tick(); }`, `while(true){ sim.seri("IKISI"); await sim.bekle(200); }`],
      'Biri ya da öteki (XOR)': [`while(true){ const a=sim.oku("D5"), b=sim.oku("D6"); sim.yaz("D2", (a||b) && !(a&&b)); await sim.tick(); }`, `while(true){ sim.yaz("D2", sim.oku("D5")||sim.oku("D6")); await sim.tick(); }`],
    },
    'seri-monitor': {
      'Hazırım mesajı': [`sim.seri("Hazir"); while(true){ sim.seri("D5: "+sim.oku("D5")); await sim.bekle(200); }`, `while(true){ sim.seri("D5: "+sim.oku("D5")); await sim.bekle(200); }`],
      'Basili / Birakildi': [`while(true){ sim.seri(sim.oku("D5")?"Basili":"Birakildi"); await sim.bekle(200); }`, `while(true){ sim.seri("Basili"); await sim.bekle(200); }`],
      'Sadece değişince yaz': [`let o=0; while(true){ const d=sim.oku("D5"); if(d!==o){ sim.seri(d?"Basildi":"Birakildi"); o=d;} await sim.tick(); }`, `while(true){ sim.seri(sim.oku("D5")?"Basildi":"Birakildi"); await sim.bekle(200); }`],
      'Basılı kalma süresini ölç': [`${BEKLE_BAS} const t0=sim.t; ${BEKLE_BIR} sim.seri("Sure: "+(sim.t-t0));`, `sim.seri("Sure: 100");`],
    },
    'dugme-sayaci': {
      "5'ten başla": [`let n=5; while(true){ ${BEKLE_BAS} n++; sim.seri(n); ${BEKLE_BIR} }`, `let n=0; while(true){ ${BEKLE_BAS} n++; sim.seri(n); ${BEKLE_BIR} }`],
      'İkişer ikişer': [`let n=0; while(true){ ${BEKLE_BAS} n+=2; sim.seri(n); ${BEKLE_BIR} }`, `let n=0; while(true){ ${BEKLE_BAS} n+=1; sim.seri(n); ${BEKLE_BIR} }`],
      '3. basışta bitsin': [`let n=0; while(true){ ${BEKLE_BAS} n++; sim.seri(n<3?n:"BITTI"); ${BEKLE_BIR} }`, `let n=0; while(true){ ${BEKLE_BAS} n++; sim.seri(n); ${BEKLE_BIR} }`],
      'İki basış arası süre': [`${BEKLE_BAS} const t0=sim.t; ${BEKLE_BIR} ${BEKLE_BAS} sim.seri("Aralik: "+(sim.t-t0));`, `sim.seri("Aralik: 500");`],
    },
    'refleks-oyunu': {
      'Üç saniye bekle': [`await sim.bekle(3000); sim.yaz("D2",1); ${BEKLE_BAS} sim.yaz("D2",0);`, `await sim.bekle(1000); sim.yaz("D2",1);`],
      'Hızlı mı, yavaş mı?': [`await sim.bekle(2000); sim.yaz("D2",1); const t0=sim.t; ${BEKLE_BAS} sim.seri(sim.t-t0<500?"HIZLI":"YAVAS"); sim.yaz("D2",0);`, `await sim.bekle(2000); sim.yaz("D2",1); ${BEKLE_BAS} sim.seri("HIZLI");`],
      'Erken basma cezası': [`for(let i=0;i<100;i++){ if(sim.oku("D5")){ sim.seri("ERKEN"); return; } await sim.bekle(20); } sim.yaz("D2",1);`, `await sim.bekle(2000); sim.yaz("D2",1);`],
      'İki tur, en iyi skor': [`let en=9999; for(let r=0;r<2;r++){ await sim.bekle(1000); sim.yaz("D2",1); const t0=sim.t; ${BEKLE_BAS} en=Math.min(en,sim.t-t0); sim.yaz("D2",0); ${BEKLE_BIR} } sim.seri("En iyi: "+en);`, `let son=0; for(let r=0;r<2;r++){ await sim.bekle(1000); sim.yaz("D2",1); const t0=sim.t; ${BEKLE_BAS} if(r==0) son=sim.t-t0; sim.yaz("D2",0); ${BEKLE_BIR} } sim.seri("En iyi: "+son);`],
    },
  };

  const calistir = async (ders, g, kod) => {
    const sim = new Sim(); sim.hiz = 5; sim.cihaz = {};
    const sure = g.sure ?? ders.sure, girdi = g.girdi ?? ders.girdi;
    const calis = new Function('sim', `return (async () => {\n${kod}\n})();`);
    let zt; const bitir = new Promise(r => { zt = setTimeout(r, sure / sim.hiz); });
    girdi(sim).catch(e => { if (!(e instanceof DurdurSinyali)) console.error('girdi hatası', e); });
    const program = calis(sim).catch(e => { if (!(e instanceof DurdurSinyali)) throw e; });
    await Promise.race([program, bitir]);
    clearTimeout(zt);
    sim.t = Math.max(sim.t, sure); sim.iptal = true;
    await new Promise(r => setTimeout(r, 20));
    return { sim, s: g.kontrol(sim) };
  };

  kontrolEt('5 ders yüklendi', dersler.length === 5);
  for (const ders of dersler) {
    const gv = ders.gorevler;
    kontrolEt(`${ders.id}: gorevler dizisi`, Array.isArray(gv));
    const kod = gv.filter(g => g.tip === 'kod'), soru = gv.filter(g => g.tip === 'soru');
    kontrolEt(`${ders.id}: 3-4 kod, 3-4 soru`, kod.length >= 3 && kod.length <= 4 && soru.length >= 3 && soru.length <= 4, `${kod.length}/${soru.length}`);
    kontrolEt(`${ders.id}: karışık sıra`, gv.some((g, i) => i && g.tip !== gv[i - 1].tip));
    for (const g of soru) {
      const ok = Number.isInteger(g.dogru) && g.dogru >= 0 && g.dogru < g.secenekler.length && g.secenekler.length >= 3 && g.secenekler.length <= 4 && new Set(g.secenekler).size === g.secenekler.length && !!g.aciklama;
      kontrolEt(`${ders.id} soru "${g.soru.slice(0, 40)}"`, ok);
    }
    kontrolEt(`${ders.id}: doğru indexler çeşitli`, new Set(soru.map(s => s.dogru)).size >= 3, soru.map(s => s.dogru).join(','));
    for (const g of kod) {
      kontrolEt(`${ders.id}/${g.baslik} alanlar`, !!(g.metin && g.ipucu && typeof g.kontrol === 'function'));
      const c = C[ders.id][g.baslik];
      if (!c) { kontrolEt(`${ders.id}/${g.baslik} referans çözüm var`, false); continue; }
      const d = await calistir(ders, g, c[0]);
      kontrolEt(`${ders.id}/${g.baslik} doğru çözüm`, d.s.ok, d.s.mesaj + (d.s.ok ? '' : ' seri=' + JSON.stringify(d.sim.seriCikti.slice(0, 12))));
      const y = await calistir(ders, g, c[1]);
      kontrolEt(`${ders.id}/${g.baslik} yanlış çözüm reddedildi`, !y.s.ok, y.s.mesaj);
      const b = await calistir(ders, g, 'return;');
      kontrolEt(`${ders.id}/${g.baslik} boş program reddedildi`, !b.s.ok, b.s.mesaj);
    }
  }
} finally { await vite.close(); }
console.log(fail ? `\n${fail} HATA` : '\nTüm testler geçti');
process.exit(fail ? 1 : 0);
