import dersler from '../src/lessons/m3-analog.js';

const BLOKLAR = new Set('dy_yaz dy_pwm dy_oku dy_bekle dy_surekli dy_seri controls_repeat_ext controls_if controls_for logic_compare logic_operation logic_boolean math_number math_arithmetic text variables_set variables_get math_change dy_analog_oku dy_harita dy_analog_cubuk dy_dugme_basili dy_dugme_deger dy_dugme_bekle dy_dugme_yaz dy_degisken_birlestir dy_degisken_sayi_metin dy_degisken_zaman dy_lcd_yaz dy_lcd_temizle dy_ses_cal dy_ses_sustur dy_servo_yaz dy_mesafe_oku'.split(' '));
const KAT = new Set(['Pinler', 'Akış', 'Mantık', 'Sayı', 'Analog', 'Metin', 'Değişkenler', 'Düğme', 'Ekran', 'Ses ve hareket', 'Seri']);
let hata = 0;
const h = m => { console.error('HATA:', m); hata++; };
for (const d of dersler) {
  const a = d.adimlar;
  if (!a || a.length < 4 || a.length > 7) { h(`${d.id}: adım sayısı ${a?.length}`); continue; }
  a.forEach((s, i) => {
    const n = `${d.id}#${i + 1}`;
    if (!s.baslik || !s.html) h(n + ' baslik/html eksik');
    const v = s.vurgu;
    if (v?.kategori && !KAT.has(v.kategori)) h(`${n} kategori ${v.kategori}`);
    if (v?.blok && !BLOKLAR.has(v.blok)) h(`${n} vurgu.blok ${v.blok}`);
    if (v?.parca != null && !(v.parca >= 0 && v.parca < d.sahne.parcalar.length)) h(`${n} parca ${v.parca}`);
    for (const k of [].concat(s.bitti ?? [])) if (k.blok && !BLOKLAR.has(k.blok)) h(`${n} bitti.blok ${k.blok}`); else if (k.icinde && !BLOKLAR.has(k.icinde)) h(`${n} icinde ${k.icinde}`);
  });
  const son = [].concat(a.at(-1).bitti ?? []);
  if (!son.some(k => k.basari)) h(`${d.id}: son adım basari değil`);
}
console.log(hata ? `${hata} hata` : `TAMAM: ${dersler.length} ders doğrulandı`);
process.exit(hata ? 1 : 0);
