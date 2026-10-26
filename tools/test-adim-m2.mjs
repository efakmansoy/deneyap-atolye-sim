import dersler from '../src/lessons/m2-dugme.js';
const BLOK = new Set('dy_yaz dy_pwm dy_oku dy_bekle dy_surekli dy_seri controls_repeat_ext controls_if controls_for logic_compare logic_operation logic_boolean math_number math_arithmetic text variables_set variables_get math_change dy_analog_oku dy_harita dy_analog_cubuk dy_dugme_basili dy_dugme_deger dy_dugme_bekle dy_dugme_yaz dy_degisken_birlestir dy_degisken_sayi_metin dy_degisken_zaman dy_lcd_yaz dy_lcd_temizle dy_ses_cal dy_ses_sustur dy_servo_yaz dy_mesafe_oku'.split(' '));
const KAT = new Set(['Pinler','Akış','Mantık','Sayı','Analog','Metin','Değişkenler','Düğme','Ekran','Ses ve hareket','Seri']);
let hata = 0; const h = m => { console.log('HATA:', m); hata++; };
for (const d of dersler) {
  const a = d.adimlar; if (!a || a.length < 4 || a.length > 7) h(`${d.id}: adım sayısı ${a?.length}`);
  for (const [i, s] of (a ?? []).entries()) {
    const w = `${d.id}#${i + 1}`;
    if (!s.baslik || !s.html) h(w + ' baslik/html eksik');
    if (s.vurgu?.kategori && !KAT.has(s.vurgu.kategori)) h(w + ' kategori ' + s.vurgu.kategori);
    if (s.vurgu?.blok && !BLOK.has(s.vurgu.blok)) h(w + ' vurgu.blok ' + s.vurgu.blok);
    if (s.vurgu?.parca != null && !(s.vurgu.parca >= 0 && s.vurgu.parca < d.sahne.parcalar.length)) h(w + ' parca sınır');
    for (const k of [].concat(s.bitti ?? [])) {
      if (k.blok && !BLOK.has(k.blok)) h(w + ' bitti.blok ' + k.blok);
      if (k.icinde && !BLOK.has(k.icinde)) h(w + ' icinde ' + k.icinde);
    }
  }
  const son = [].concat(a?.at(-1)?.bitti ?? []);
  if (!son.some(k => k.basari)) h(d.id + ' son adım basari değil');
}
console.log(hata ? `${hata} hata` : 'TAMAM: ' + dersler.length + ' ders');
process.exit(hata ? 1 : 0);
