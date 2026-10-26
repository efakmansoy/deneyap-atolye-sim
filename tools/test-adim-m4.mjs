import m4 from '../src/lessons/m4-ses-hareket.js';
const TIP = new Set('dy_yaz dy_pwm dy_oku dy_bekle dy_surekli dy_seri controls_repeat_ext controls_if controls_for logic_compare logic_operation logic_boolean math_number math_arithmetic text variables_set variables_get math_change dy_analog_oku dy_harita dy_analog_cubuk dy_dugme_basili dy_dugme_deger dy_dugme_bekle dy_dugme_yaz dy_degisken_birlestir dy_degisken_sayi_metin dy_degisken_zaman dy_lcd_yaz dy_lcd_temizle dy_ses_cal dy_ses_sustur dy_servo_yaz dy_mesafe_oku'.split(' '));
const KAT = new Set(['Pinler','Akış','Mantık','Sayı','Analog','Metin','Değişkenler','Düğme','Ekran','Ses ve hareket','Seri']);
const ids = ['buzzer-melodi','servo-motor','park-sensoru','dugme-piyano'];
let hata = 0; const e = m => { console.log('HATA', m); hata++; };
for (const d of m4.filter(d => ids.includes(d.id))) {
  const a = d.adimlar; if (!a || a.length < 4 || a.length > 7) e(d.id + ' adım sayısı');
  a.forEach((s, i) => {
    const k = [].concat(s.bitti ?? []);
    for (const c of k) { if (c.blok && !TIP.has(c.blok)) e(`${d.id}#${i} blok ${c.blok}`); if (c.icinde && !TIP.has(c.icinde)) e(`${d.id}#${i} icinde`); }
    if (s.vurgu?.kategori && !KAT.has(s.vurgu.kategori)) e(`${d.id}#${i} kategori`);
    if (s.vurgu?.blok && !TIP.has(s.vurgu.blok)) e(`${d.id}#${i} vurgu.blok`);
    if (s.vurgu?.parca != null && !(s.vurgu.parca < d.sahne.parcalar.length)) e(`${d.id}#${i} parca`);
  });
  if (!JSON.stringify(a.at(-1).bitti).includes('"basari":true')) e(d.id + ' son adım basari');
}
console.log(hata ? 'BASARISIZ' : 'TAMAM'); process.exit(hata ? 1 : 0);
