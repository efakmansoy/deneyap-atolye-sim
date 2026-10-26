// Modül 2 ek içerik: sesli anlatım (kod satır satır yazılır) + "kodu değiştir" görevleri.
// Şema ve kurallar için m1-sesli.js dosyasına bak.
//   SESLİ PARÇA: { ses, yaz?, parca?, calistir? }  -> `yaz` metinleri art arda eklenince dersin kontrolünü geçen tam program olur.
//   DÜZENLE GÖREVİ: { tip:'duzenle', baslik, metin, kod, degistir:[{ara}], cozum, ipucu, sure?, girdi?, kontrol(sim) }
//   (`cozum` yalnızca test içindir; arayüz kullanmaz.)
const tamam = m => ({ ok: true, mesaj: m });
const hata = m => ({ ok: false, mesaj: m });
const norm = s => String(s).toLowerCase().replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '');
const sonSayi = s => { const m = /(-?\d+)\s*$/.exec(s); return m ? +m[1] : NaN; };

// Düğme senaryosu yardımcıları (m2-dugme.js ile aynı kayıt biçimi: sim.cihaz.girdiGecmisi)
const bas = (sim, pin, v) => { sim.girdi[pin] = v; (sim.cihaz.girdiGecmisi ??= []).push({ t: sim.t, pin, deger: v }); };
const gecmis = (sim, pin) => (sim.cihaz.girdiGecmisi ?? []).filter(o => o.pin === pin);
const degerAt = (olaylar, t) => { let d = 0; for (const o of olaylar) if (o.t <= t) d = o.deger; return d; };
const ledDeger = (sim, pin, t) => degerAt(sim.olaylar.filter(o => o.pin === pin), t);   // 0..1
const ledAt = (sim, pin, t) => ledDeger(sim, pin, t) > 0 ? 1 : 0;
const dugmeAt = (sim, pin, t) => degerAt(gecmis(sim, pin), t) > 0 ? 1 : 0;
const ornekAnlar = sim => [200, ...new Set((sim.cihaz.girdiGecmisi ?? []).map(o => o.t + 100))];
const yokMu = sim => !(sim.cihaz.girdiGecmisi ?? []).length;
const YOK = hata('Düğmeye basılmadı (senaryo çalışmadı).');

const girdiTek = async sim => {
  await sim.bekle(500); bas(sim, 'D5', 1);
  await sim.bekle(1000); bas(sim, 'D5', 0);
  await sim.bekle(600); bas(sim, 'D5', 1);
  await sim.bekle(700); bas(sim, 'D5', 0);
  await sim.bekle(500);
};
const girdiIki = async sim => {
  await sim.bekle(400); bas(sim, 'D5', 1);
  await sim.bekle(800); bas(sim, 'D5', 0);
  await sim.bekle(400); bas(sim, 'D6', 1);
  await sim.bekle(800); bas(sim, 'D6', 0);
  await sim.bekle(400); bas(sim, 'D5', 1); bas(sim, 'D6', 1);
  await sim.bekle(800); bas(sim, 'D5', 0); bas(sim, 'D6', 0);
  await sim.bekle(400);
};
const girdiSeri = async sim => {
  await sim.bekle(1000); bas(sim, 'D5', 1);
  await sim.bekle(1000); bas(sim, 'D5', 0);
};
const girdiSayac = async sim => {
  await sim.bekle(500);
  for (let i = 0; i < 3; i++) { bas(sim, 'D5', 1); await sim.bekle(300); bas(sim, 'D5', 0); await sim.bekle(500); }
};
const girdiTepki = async sim => {
  while (!sim.pin.D2.deger) await sim.tick();
  await sim.bekle(350); bas(sim, 'D5', 1);
  await sim.bekle(300); bas(sim, 'D5', 0);
};

// D2 LED'i D5 düğmesini izliyor mu (ters = true ise tersini mi)?
const izlemeKontrol = (sim, ters, tamamMesaj) => {
  if (yokMu(sim)) return YOK;
  for (const t of ornekAnlar(sim)) {
    const d = dugmeAt(sim, 'D5', t), l = ledAt(sim, 'D2', t);
    const beklenen = ters ? 1 - d : d;
    if (l !== beklenen) {
      if (ters) return hata(d ? 'Düğmeye basılıyken LED hâlâ yanıyor; sönmesi gerekiyor.' : 'Düğmeye basılmıyorken LED sönük; normalde yanık olmalı.');
      return hata(d ? 'Düğmeye basılıyken LED sönük kaldı. Pinlerin doğru olduğundan emin ol.' : 'Düğmeyi bıraktığında LED hâlâ yanıyor.');
    }
  }
  return tamam(tamamMesaj);
};

// Basili / Birakildi dizisi (seri monitör görevi)
const basiliDizisi = sim => {
  const s = sim.seriCikti.map(norm);
  if (s.length < 5) return hata('Yeterince satır yazılmadı.');
  if (s.some(x => !x.includes('basili') && !x.includes('birakildi'))) return hata('Her satır "Basili" ya da "Birakildi" olmalı.');
  const b = s.map(x => x.includes('basili') ? 1 : 0);
  if (!b.includes(1)) return hata('Düğmeye basılınca "Basili" yazılmalı; hiç görünmedi.');
  const i1 = b.indexOf(1), i2 = b.lastIndexOf(1);
  if (i1 === 0 || b.slice(i1, i2 + 1).includes(0) || i2 === b.length - 1) return hata('Sıra Birakildi..., Basili..., Birakildi... olmalı. Şu an "Basili" ve "Birakildi" yanlış zamanlarda yazılıyor: koşulu kontrol et.');
  return tamam('Doğru! Düğme basılıyken Basili, bırakılınca Birakildi yazıyor.');
};

export default {
  // ───────────────────────── 2.1 Düğme ile LED ─────────────────────────
  'buton-led': {
    sesli: [
      { ses: 'Merhaba! Bu derste kartımız bir düğmeye basılıp basılmadığını anlayacak ve LED\'i buna göre yakacak. Önce pinlere kolay hatırlanır adlar verelim.', yaz: '#define DUGME D5\n#define LED D2\n\n', parca: 0 },
      { ses: 'Düğme D beş pininde, sarı LED ise D iki pininde. Define satırı bir etiket gibidir. Kodun içinde DUGME yazınca kart D beşi anlar. Böylece kod okunaklı olur.', parca: 1 },
      { ses: 'Setup bölümünde pinlerin görevini söylüyoruz. Düğme kartımıza bilgi gönderir, yani bir giriş. LED ise kartın verdiği enerjiyle yanar, yani bir çıkış.', yaz: 'void setup() {\n  pinMode(DUGME, INPUT);\n  pinMode(LED, OUTPUT);\n}\n\n', parca: 0 },
      { ses: 'Düğmeye ne zaman basılacağını bilemeyiz. O yüzden loop içinde sürekli bakacağız. Eğer komutu bir soru sorar. Düğme basılıysa pin HIGH olur, biz de bunu soruyoruz.', yaz: 'void loop() {\n  if (digitalRead(DUGME) == HIGH) {\n', parca: 0 },
      { ses: 'Cevap evetse LED\'e HIGH yazıp onu yakıyoruz. Cevap hayırsa çalışacak bölüme de else, yani değilse diyoruz.', yaz: '    digitalWrite(LED, HIGH);\n  } else {\n', parca: 1 },
      { ses: 'Değilse LED\'e LOW yazarak söndürüyoruz. Süslü parantezleri kapatınca programımız tamam.', yaz: '    digitalWrite(LED, LOW);\n  }\n}\n', parca: 1 },
      { ses: 'Mantığı özetleyelim: basılıysa yan, değilse sön. Kart bu soruyu saniyede binlerce kez sorduğu için LED düğmeyi anında takip eder.' },
      { ses: 'Şimdi çalıştıralım. Düğmeye basıyoruz, LED yandı. Bıraktık, söndü!', calistir: true, parca: 0 },
      { ses: 'Harika! Şimdi Görevler sekmesine geç. Kodun belli yerlerini değiştirerek lambayı ters çalıştıracak, sonra bir gece lambası yapacaksın.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Ters çalışan lamba',
        metin: 'Bu program düğmeye basınca LED\'i yakıyor. Onu <b>tersine</b> çevir: LED normalde <b>yanık</b> dursun, düğmeye <b>basılınca sönsün</b>. Turuncu işaretli koşulu değiştirmen yeter.',
        kod: '#define DUGME D5\n#define LED D2\n\nvoid setup() {\n  pinMode(DUGME, INPUT);\n  pinMode(LED, OUTPUT);\n}\n\nvoid loop() {\n  if (digitalRead(DUGME) == HIGH) {\n    digitalWrite(LED, HIGH);\n  } else {\n    digitalWrite(LED, LOW);\n  }\n}\n',
        degistir: [{ ara: '== HIGH' }],
        cozum: '#define DUGME D5\n#define LED D2\n\nvoid setup() {\n  pinMode(DUGME, INPUT);\n  pinMode(LED, OUTPUT);\n}\n\nvoid loop() {\n  if (digitalRead(DUGME) == LOW) {\n    digitalWrite(LED, HIGH);\n  } else {\n    digitalWrite(LED, LOW);\n  }\n}\n',
        ipucu: 'Düğme basılı değilken pin LOW okunur. Soruyu "basılı değil mi?" diye sormak için HIGH yerine ne yazmalısın?',
        girdi: girdiTek,
        kontrol: sim => izlemeKontrol(sim, true, 'Harika! LED normalde yanık, düğmeye basınca sönüyor.'),
      },
      {
        tip: 'duzenle', baslik: 'Pinleri düzelt',
        metin: 'Bu programda düğme ve LED pinleri <b>yanlış yazılmış</b>, o yüzden LED düğmeyi izlemiyor. Düğme <b>D5</b>, LED <b>D2</b> pinindedir. İşaretli iki satırı düzelt.',
        kod: '#define DUGME D2\n#define LED D5\n\nvoid setup() {\n  pinMode(DUGME, INPUT);\n  pinMode(LED, OUTPUT);\n}\n\nvoid loop() {\n  if (digitalRead(DUGME) == HIGH) {\n    digitalWrite(LED, HIGH);\n  } else {\n    digitalWrite(LED, LOW);\n  }\n}\n',
        degistir: [{ ara: '#define DUGME D2' }, { ara: '#define LED D5' }],
        cozum: '#define DUGME D5\n#define LED D2\n\nvoid setup() {\n  pinMode(DUGME, INPUT);\n  pinMode(LED, OUTPUT);\n}\n\nvoid loop() {\n  if (digitalRead(DUGME) == HIGH) {\n    digitalWrite(LED, HIGH);\n  } else {\n    digitalWrite(LED, LOW);\n  }\n}\n',
        ipucu: 'Sahnedeki düğmenin pin etiketine bak: D5. Sarı LED ise D2 pininde. İki define satırının pinleri yer değiştirmiş.',
        girdi: girdiTek,
        kontrol: sim => izlemeKontrol(sim, false, 'Süper! Pinler doğru, LED düğmeyi takip ediyor.'),
      },
      {
        tip: 'duzenle', baslik: 'Loş gece lambası',
        metin: 'LED şu an düğme yokken tamamen sönük. Onu bir <b>gece lambasına</b> çevir: düğmeye basılmıyorken LED <b>loş</b> yansın (0-255 arasında küçük bir değer, örneğin 40), basılınca yine tam parlak olsun. İşaretli satırı <code>analogWrite</code> ile değiştir.',
        kod: '#define DUGME D5\n#define LED D2\n\nvoid setup() {\n  pinMode(DUGME, INPUT);\n  pinMode(LED, OUTPUT);\n}\n\nvoid loop() {\n  if (digitalRead(DUGME) == HIGH) {\n    digitalWrite(LED, HIGH);\n  } else {\n    digitalWrite(LED, LOW);\n  }\n  delay(10);\n}\n',
        degistir: [{ ara: 'digitalWrite(LED, LOW)' }],
        cozum: '#define DUGME D5\n#define LED D2\n\nvoid setup() {\n  pinMode(DUGME, INPUT);\n  pinMode(LED, OUTPUT);\n}\n\nvoid loop() {\n  if (digitalRead(DUGME) == HIGH) {\n    digitalWrite(LED, HIGH);\n  } else {\n    analogWrite(LED, 40);\n  }\n  delay(10);\n}\n',
        ipucu: 'analogWrite(LED, değer) biçiminde yazılır. 0 sönük, 255 tam parlaklık demektir; 40 civarı loş bir ışık verir.',
        girdi: girdiTek,
        kontrol(sim) {
          const p = gecmis(sim, 'D5'), basma = p.filter(o => o.deger > 0), birak = p.filter(o => o.deger === 0);
          if (!basma.length) return YOK;
          const loslar = [200, ...birak.map(o => o.t + 100)];
          for (const t of loslar) {
            const v = ledDeger(sim, 'D2', t);
            if (v <= 0) return hata('Düğmeye basılmıyorken LED tamamen sönük. Biraz yanık kalmalı (analogWrite ile loş bir değer ver).');
            if (v > 0.35) return hata(`Düğme yokken LED çok parlak (%${Math.round(v * 100)}). Loş olmalı: 0-255 arasında küçük bir değer dene.`);
          }
          for (let i = 0; i < basma.length; i++) {
            const son = birak[i]?.t ?? basma[i].t + 600;
            const kisik = sim.olaylar.some(o => o.pin === 'D2' && o.t >= basma[i].t + 60 && o.t <= son - 10 && o.deger < 0.5);
            if (kisik) return hata('Düğmeye basılıyken LED tam parlak olmalı; basılınca loş değer yazılmasın.');
          }
          return tamam('Gece lambası hazır: düğme yokken loş, basınca tam parlak!');
        },
      },
    ],
  },

  // ───────────────────────── 2.2 İki düğme ─────────────────────────
  'iki-buton': {
    sesli: [
      { ses: 'Bu derste iki düğmeyle iki LED\'i yöneteceğiz. Önce pinlere ad verelim. İki düğme D beş ve D altı pininde, iki LED ise D iki ve D üç pininde.', yaz: '#define DUGME_A D5\n#define DUGME_B D6\n#define LED_VE D2\n#define LED_VEYA D3\n\n', parca: 0 },
      { ses: 'Setup bölümünde iki düğmeyi giriş, iki LED\'i çıkış yapıyoruz. Düğmeler bilgi gönderir, LED\'ler ise enerjiyle yanar.', yaz: 'void setup() {\n  pinMode(DUGME_A, INPUT);\n  pinMode(DUGME_B, INPUT);\n  pinMode(LED_VE, OUTPUT);\n  pinMode(LED_VEYA, OUTPUT);\n}\n\n', parca: 2 },
      { ses: 'Loop içinde önce düğmeleri okuyacağız. Bool, yalnızca doğru ya da yanlış tutabilen bir kutudur. A kutusu, birinci düğmeye basılıysa doğru olur.', yaz: 'void loop() {\n  bool a = digitalRead(DUGME_A) == HIGH;\n', parca: 0 },
      { ses: 'Aynı şeyi ikinci düğme için de yapıyoruz. B kutusu da ikinci düğmeye basılıysa doğru olur.', yaz: '  bool b = digitalRead(DUGME_B) == HIGH;\n', parca: 1 },
      { ses: 'İki and işareti, mantıkta VE demektir. VE\'nin sonucu ancak ikisi de doğruysa doğrudur. Yani kırmızı LED yalnızca iki düğmeye birlikte basılınca yanar. Tıpkı iki anahtarı aynı anda çevirmek gibi.', yaz: '  digitalWrite(LED_VE, a && b);\n', parca: 2 },
      { ses: 'İki dik çizgi ise VEYA demektir. Biri doğru olsa yeter. Yeşil LED, düğmelerden en az birine basılınca yanacak.', yaz: '  digitalWrite(LED_VEYA, a || b);\n}\n', parca: 3 },
      { ses: 'Şöyle düşün: şemsiye almak için yağmur VE rüzgar şartını ararsan ikisi birlikte gerekir. Ceket giymek için yağmur VEYA rüzgar yeter, biri olsa bile giyersin.' },
      { ses: 'Şimdi deneyelim. Önce yalnızca mavi düğme, sonra yalnızca yeşil düğme, en sonda ikisi birden. Dikkat et, yeşil LED hep yandı ama kırmızı LED yalnızca en sonda yandı.', calistir: true, parca: 2 },
      { ses: 'Güzel! Görevler sekmesine geç. Orada VE ile VEYA işaretlerini değiştirerek LED\'lerin davranışını yeniden düzenleyeceksin.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'İşaretler karışmış',
        metin: '<span class="pin-etiket">D2</span> LED\'i yalnızca <b>iki düğmeye birden</b> basılınca, <span class="pin-etiket">D3</span> LED\'i ise <b>en az bir düğmeye</b> basılınca yanmalı. Bu programda iki işaret (<code>&amp;&amp;</code> ve <code>||</code>) yer değiştirmiş. Düzelt.',
        kod: '#define DUGME_A D5\n#define DUGME_B D6\n#define LED1 D2\n#define LED2 D3\n\nvoid setup() {\n  pinMode(DUGME_A, INPUT);\n  pinMode(DUGME_B, INPUT);\n  pinMode(LED1, OUTPUT);\n  pinMode(LED2, OUTPUT);\n}\n\nvoid loop() {\n  bool a = digitalRead(DUGME_A) == HIGH;\n  bool b = digitalRead(DUGME_B) == HIGH;\n  digitalWrite(LED1, a || b);\n  digitalWrite(LED2, a && b);\n}\n',
        degistir: [{ ara: 'a || b' }, { ara: 'a && b' }],
        cozum: '#define DUGME_A D5\n#define DUGME_B D6\n#define LED1 D2\n#define LED2 D3\n\nvoid setup() {\n  pinMode(DUGME_A, INPUT);\n  pinMode(DUGME_B, INPUT);\n  pinMode(LED1, OUTPUT);\n  pinMode(LED2, OUTPUT);\n}\n\nvoid loop() {\n  bool a = digitalRead(DUGME_A) == HIGH;\n  bool b = digitalRead(DUGME_B) == HIGH;\n  digitalWrite(LED1, a && b);\n  digitalWrite(LED2, a || b);\n}\n',
        ipucu: 'İkisi birlikte gerekiyorsa VE (iki and işareti), biri yetiyorsa VEYA (iki dik çizgi) kullanılır.',
        girdi: girdiIki,
        kontrol(sim) {
          if (yokMu(sim)) return YOK;
          for (const t of ornekAnlar(sim)) {
            const a = dugmeAt(sim, 'D5', t), b = dugmeAt(sim, 'D6', t);
            if (ledAt(sim, 'D2', t) !== (a && b ? 1 : 0)) return hata('D2 LED\'i yalnızca iki düğmeye birlikte basılınca yanmalı. VE işaretini nereye koyduğunu kontrol et.');
            if (ledAt(sim, 'D3', t) !== (a || b ? 1 : 0)) return hata('D3 LED\'i düğmelerden en az biri basılıyken yanmalı. VEYA işaretini nereye koyduğunu kontrol et.');
          }
          return tamam('Doğru! D2 VE mantığıyla, D3 VEYA mantığıyla çalışıyor.');
        },
      },
      {
        tip: 'duzenle', baslik: 'Hiçbirine basılmıyor',
        metin: 'Şimdi <span class="pin-etiket">D2</span> LED\'i yalnızca <b>iki düğmeye de basılmıyorken</b> yansın. <span class="pin-etiket">D3</span> LED\'i ise eskisi gibi kalsın (en az biri basılıyken yansın). İşaretli koşulu değiştir; <code>!</code> işareti bir ifadeyi tersler.',
        kod: '#define DUGME_A D5\n#define DUGME_B D6\n#define LED1 D2\n#define LED2 D3\n\nvoid setup() {\n  pinMode(DUGME_A, INPUT);\n  pinMode(DUGME_B, INPUT);\n  pinMode(LED1, OUTPUT);\n  pinMode(LED2, OUTPUT);\n}\n\nvoid loop() {\n  bool a = digitalRead(DUGME_A) == HIGH;\n  bool b = digitalRead(DUGME_B) == HIGH;\n  digitalWrite(LED1, a && b);\n  digitalWrite(LED2, a || b);\n}\n',
        degistir: [{ ara: 'a && b' }],
        cozum: '#define DUGME_A D5\n#define DUGME_B D6\n#define LED1 D2\n#define LED2 D3\n\nvoid setup() {\n  pinMode(DUGME_A, INPUT);\n  pinMode(DUGME_B, INPUT);\n  pinMode(LED1, OUTPUT);\n  pinMode(LED2, OUTPUT);\n}\n\nvoid loop() {\n  bool a = digitalRead(DUGME_A) == HIGH;\n  bool b = digitalRead(DUGME_B) == HIGH;\n  digitalWrite(LED1, !a && !b);\n  digitalWrite(LED2, a || b);\n}\n',
        ipucu: '"A basılı değil VE B basılı değil" demek istiyorsun. Basılı değil için a önüne ünlem koy: !a',
        girdi: girdiIki,
        kontrol(sim) {
          if (yokMu(sim)) return YOK;
          for (const t of ornekAnlar(sim)) {
            const a = dugmeAt(sim, 'D5', t), b = dugmeAt(sim, 'D6', t);
            if (ledAt(sim, 'D2', t) !== (!a && !b ? 1 : 0)) return hata(!a && !b ? 'Hiçbir düğmeye basılmıyorken D2 sönük kalmış; yanmalı.' : 'Bir düğmeye basılıyorken D2 hâlâ yanıyor; sönmeli.');
            if (ledAt(sim, 'D3', t) !== (a || b ? 1 : 0)) return hata('D3 LED\'i eskisi gibi kalmalı: en az bir düğme basılıyken yanmalı.');
          }
          return tamam('Güzel! D2 yalnızca hiçbir düğmeye basılmıyorken yanıyor.');
        },
      },
      {
        tip: 'duzenle', baslik: 'Biri ya da öteki',
        metin: '<span class="pin-etiket">D2</span> LED\'i, düğmelerden <b>tam olarak birine</b> basılıyken yansın (ikisine birden basılırsa sönsün). <span class="pin-etiket">D3</span> LED\'i ise yalnızca <b>iki düğmeye birlikte</b> basılınca yansın. İki satırın koşulunu da değiştir.',
        kod: '#define DUGME_A D5\n#define DUGME_B D6\n#define LED1 D2\n#define LED2 D3\n\nvoid setup() {\n  pinMode(DUGME_A, INPUT);\n  pinMode(DUGME_B, INPUT);\n  pinMode(LED1, OUTPUT);\n  pinMode(LED2, OUTPUT);\n}\n\nvoid loop() {\n  bool a = digitalRead(DUGME_A) == HIGH;\n  bool b = digitalRead(DUGME_B) == HIGH;\n  digitalWrite(LED1, a && b);\n  digitalWrite(LED2, a || b);\n}\n',
        degistir: [{ ara: 'a && b' }, { ara: 'a || b' }],
        cozum: '#define DUGME_A D5\n#define DUGME_B D6\n#define LED1 D2\n#define LED2 D3\n\nvoid setup() {\n  pinMode(DUGME_A, INPUT);\n  pinMode(DUGME_B, INPUT);\n  pinMode(LED1, OUTPUT);\n  pinMode(LED2, OUTPUT);\n}\n\nvoid loop() {\n  bool a = digitalRead(DUGME_A) == HIGH;\n  bool b = digitalRead(DUGME_B) == HIGH;\n  digitalWrite(LED1, a != b);\n  digitalWrite(LED2, a && b);\n}\n',
        ipucu: 'Tam olarak biri basılıysa a ile b birbirinden farklıdır: a != b yazabilirsin. D3 için bildiğin VE işaretini kullan.',
        girdi: girdiIki,
        kontrol(sim) {
          if (yokMu(sim)) return YOK;
          for (const t of ornekAnlar(sim)) {
            const a = dugmeAt(sim, 'D5', t), b = dugmeAt(sim, 'D6', t);
            if (ledAt(sim, 'D2', t) !== (a !== b ? 1 : 0)) return hata(a && b ? 'İki düğmeye birden basılıyken D2 sönük olmalı.' : (a || b) ? 'Yalnızca bir düğmeye basılıyken D2 yanmalı.' : 'Hiçbir düğmeye basılmıyorken D2 sönük olmalı.');
            if (ledAt(sim, 'D3', t) !== (a && b ? 1 : 0)) return hata('D3 LED\'i yalnızca iki düğmeye birlikte basılınca yanmalı.');
          }
          return tamam('Mükemmel! D2 "tam olarak biri", D3 "ikisi birden" mantığıyla çalışıyor.');
        },
      },
    ],
  },

  // ───────────────────────── 2.3 Seri monitör ─────────────────────────
  'seri-monitor': {
    sesli: [
      { ses: 'Bu derste kartımızın bilgisayara yazı göndermesini öğreneceğiz. Buna seri monitör denir. Düğmenin durumunu ekrana yazdıracağız. Önce düğme pinine ad verelim.', yaz: '#define DUGME D5\n\n', parca: 0 },
      { ses: 'Setup bölümünde önce seri haberleşmeyi başlatıyoruz. Parantez içindeki sayı hızdır: yüz on beş bin iki yüz. Bilgisayar da aynı hıza ayarlı olmalı, yoksa ekranda anlamsız karakterler görürüz.', yaz: 'void setup() {\n  Serial.begin(115200);\n' },
      { ses: 'Sonra düğme pinini giriş yapıyoruz. Düğme kartımıza bilgi gönderecek.', yaz: '  pinMode(DUGME, INPUT);\n}\n\n', parca: 0 },
      { ses: 'Loop içinde önce print komutuyla bir başlık yazıyoruz. Print, yazıyı yazar ama alt satıra geçmez. Bir sonraki yazı hemen yanına gelir.', yaz: 'void loop() {\n  Serial.print("Düğme: ");\n' },
      { ses: 'Şimdi println ile düğmenin değerini yazıyoruz. Bu komut yazdıktan sonra alt satıra geçer. Düğmeye basılıysa bir, basılı değilse sıfır görürüz.', yaz: '  Serial.println(digitalRead(DUGME));\n', parca: 0 },
      { ses: 'Sonunda iki yüz milisaniye bekliyoruz. Beklemezsek kart saniyede binlerce satır yazar ve ekran dolup taşar.', yaz: '  delay(200);\n}\n' },
      { ses: 'Seri monitör, programın içinde ne olduğunu görmenin en iyi yoludur. Bir şey beklediğin gibi çalışmıyorsa, değerlerini yazdır ve bak.' },
      { ses: 'Şimdi çalıştıralım. Satırlar sıfır sıfır sıfır diye akıyor. Düğmeye basıyoruz, bir oldu. Bıraktık, yine sıfır!', calistir: true, parca: 0 },
      { ses: 'Harika! Görevler sekmesine geç. Orada yazılan metni, bekleme süresini ve koşulları değiştireceksin.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Yavaş akış',
        metin: 'Seri monitör çok hızlı akıyor: saniyede beş satır. Bekleme süresini değiştirip saniyede <b>yaklaşık iki satır</b> yazdır (yani <b>yarım saniyede bir</b>, 500 ms).',
        kod: '#define DUGME D5\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(DUGME, INPUT);\n}\n\nvoid loop() {\n  Serial.print("Düğme: ");\n  Serial.println(digitalRead(DUGME));\n  delay(200);\n}\n',
        degistir: [{ ara: 'delay(200)' }],
        cozum: '#define DUGME D5\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(DUGME, INPUT);\n}\n\nvoid loop() {\n  Serial.print("Düğme: ");\n  Serial.println(digitalRead(DUGME));\n  delay(500);\n}\n',
        ipucu: 'Delay milisaniye ile çalışır. Yarım saniye kaç milisaniyedir?',
        girdi: girdiSeri,
        kontrol(sim) {
          const n = sim.seriCikti.length;
          if (n < 6) return hata(`Çok az satır yazıldı (${n}). Bekleme süresi çok uzun olmasın: yarım saniye (500 ms) yeter.`);
          if (n > 10) return hata(`Satırlar hâlâ çok hızlı akıyor (${n} satır). Bekleme süresini yaklaşık 500 ms yap.`);
          return tamam('Tam istediğimiz gibi: saniyede iki satır.');
        },
      },
      {
        tip: 'duzenle', baslik: 'Hazırım mesajı',
        metin: 'Program başlayınca seri monitöre bir kez <code>Merhaba</code> yazılıyor. İşaretli metni <b>Hazir</b> olarak değiştir (Türkçe harf kullanma). Düğme değerleri yazılmaya devam etsin.',
        kod: '#define DUGME D5\n\nvoid setup() {\n  Serial.begin(115200);\n  Serial.println("Merhaba");\n  pinMode(DUGME, INPUT);\n}\n\nvoid loop() {\n  Serial.print("Düğme: ");\n  Serial.println(digitalRead(DUGME));\n  delay(200);\n}\n',
        degistir: [{ ara: 'Merhaba' }],
        cozum: '#define DUGME D5\n\nvoid setup() {\n  Serial.begin(115200);\n  Serial.println("Hazir");\n  pinMode(DUGME, INPUT);\n}\n\nvoid loop() {\n  Serial.print("Düğme: ");\n  Serial.println(digitalRead(DUGME));\n  delay(200);\n}\n',
        ipucu: 'Çift tırnak içindeki yazıyı sil, yerine Hazir yaz. Tırnakları silme.',
        girdi: girdiSeri,
        kontrol(sim) {
          const s = sim.seriCikti;
          if (!s.length) return hata('Seri monitöre hiçbir şey yazılmadı.');
          if (!norm(s[0]).includes('hazir')) return hata(`İlk satır "${s[0]}" olmuş. İlk satır Hazir olmalı.`);
          const dg = s.slice(1).map(sonSayi);
          if (dg.length < 5 || dg.some(Number.isNaN)) return hata('Hazir\'dan sonra her satır düğme değeriyle bitmeli ve yeterince satır olmalı.');
          if (!dg.includes(1)) return hata('Düğmeye basılınca 1 yazılmalı; hiç 1 görünmedi.');
          return tamam('Güzel! Önce Hazir, sonra düğme değerleri akıyor.');
        },
      },
      {
        tip: 'duzenle', baslik: 'Yanlış söyleyen monitör',
        metin: 'Bu program düğmeye basılıyken <code>Birakildi</code>, bırakılınca <code>Basili</code> yazıyor: tersi! Koşulu düzelt ki düğme <b>basılıyken Basili</b>, <b>bırakılınca Birakildi</b> yazsın.',
        kod: '#define DUGME D5\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(DUGME, INPUT);\n}\n\nvoid loop() {\n  if (digitalRead(DUGME) == LOW) {\n    Serial.println("Basili");\n  } else {\n    Serial.println("Birakildi");\n  }\n  delay(200);\n}\n',
        degistir: [{ ara: '== LOW' }],
        cozum: '#define DUGME D5\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(DUGME, INPUT);\n}\n\nvoid loop() {\n  if (digitalRead(DUGME) == HIGH) {\n    Serial.println("Basili");\n  } else {\n    Serial.println("Birakildi");\n  }\n  delay(200);\n}\n',
        ipucu: 'Düğmeye basılınca pin HIGH olur. Koşul şu an LOW\'u soruyor.',
        girdi: girdiSeri,
        kontrol: basiliDizisi,
      },
    ],
  },

  // ───────────────────────── 2.4 Düğme sayacı ─────────────────────────
  'dugme-sayaci': {
    sesli: [
      { ses: 'Bu derste düğmeye kaç kez bastığımızı sayacağız. Sayıları hatırlamak için değişken kullanacağız. Önce düğme pinine ad verelim.', yaz: '#define DUGME D5\n\n', parca: 0 },
      { ses: 'Değişken, içine sayı koyabildiğimiz adlı bir kutudur. Int tam sayı demektir. Kutumuzun adı sayac, içindeki ilk değer sıfır. Bu satır loop bölümünün dışında olmalı, çünkü sayaç yalnızca başta sıfırlanır.', yaz: 'int sayac = 0;\n\n' },
      { ses: 'Setup bölümünde seri haberleşmeyi başlatıyoruz ki sayıları ekranda görelim. Düğme pinini de giriş yapıyoruz.', yaz: 'void setup() {\n  Serial.begin(115200);\n  pinMode(DUGME, INPUT);\n}\n\n', parca: 0 },
      { ses: 'Loop içinde düğmeye basılıp basılmadığını soruyoruz. Basılmışsa süslü parantezin içindeki komutlar çalışacak.', yaz: 'void loop() {\n  if (digitalRead(DUGME) == HIGH) {\n', parca: 0 },
      { ses: 'Sayacı bir artırıyoruz. İki artı işareti, kutudaki sayıya bir ekle demektir. Sıfırdı, bir oldu.', yaz: '    sayac++;\n' },
      { ses: 'Yeni sayıyı seri monitöre yazdırıyoruz. Böylece her basışta sayının büyüdüğünü göreceğiz.', yaz: '    Serial.println(sayac);\n' },
      { ses: 'Şimdi önemli bir adım. Düğme basılı kaldığı sürece bekliyoruz. While, o durum sürdükçe tekrarla demektir. Süslü parantezin içi boş, yani kart orada düğmeyi bırakmamızı bekler.', yaz: '    while (digitalRead(DUGME) == HIGH) {\n    }\n  }\n}\n', parca: 0 },
      { ses: 'Neden bekledik? Kart saniyede binlerce tur atar. Bir basış binlerce turda basılı görünür. Bırakılmasını beklemezsek tek basışta sayaç yüzlerce kez artardı.' },
      { ses: 'Şimdi düğmeye üç kez basalım. Seri monitörde bir, iki, üç görüyoruz!', calistir: true, parca: 0 },
      { ses: 'Süper! Görevler sekmesine geç. Orada sayacın başlangıç değerini ve artış şeklini değiştirecek, sonra bozuk bir sayacı tamir edeceksin.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Başka sayıdan başla',
        metin: 'Sayaç şu an sıfırdan başlıyor ve 1, 2, 3 yazıyor. Başlangıç değerini değiştir ki seri monitörde <b>11, 12, 13</b> yazsın.',
        kod: '#define DUGME D5\n\nint sayac = 0;\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(DUGME, INPUT);\n}\n\nvoid loop() {\n  if (digitalRead(DUGME) == HIGH) {\n    sayac++;\n    Serial.println(sayac);\n    while (digitalRead(DUGME) == HIGH) {\n    }\n  }\n}\n',
        degistir: [{ ara: 'int sayac = 0' }],
        cozum: '#define DUGME D5\n\nint sayac = 10;\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(DUGME, INPUT);\n}\n\nvoid loop() {\n  if (digitalRead(DUGME) == HIGH) {\n    sayac++;\n    Serial.println(sayac);\n    while (digitalRead(DUGME) == HIGH) {\n    }\n  }\n}\n',
        ipucu: 'İlk basışta sayac bir artıyor. 11 görmek için başlangıçta kutuda kaç olmalı?',
        girdi: girdiSayac,
        kontrol(sim) {
          if (!sim.seriCikti.length) return hata('Seri monitöre hiçbir şey yazılmadı.');
          const d = sim.seriCikti.map(sonSayi);
          if (d.length !== 3) return hata(`3 basış için 3 satır beklenir, ${d.length} satır yazıldı.`);
          if (d.join() !== '11,12,13') return hata(`Çıktı ${d.join(', ')} oldu ama 11, 12, 13 olmalı. Başlangıç değerini ayarla.`);
          return tamam('Doğru! Sayaç 11, 12, 13 diye ilerledi.');
        },
      },
      {
        tip: 'duzenle', baslik: 'Geri sayım',
        metin: 'Sayaç şimdi yukarı sayıyor. Onu <b>geri sayıma</b> çevir: seri monitörde <b>2, 1, 0</b> yazsın. Başlangıç değerini ve artırma satırını birlikte değiştirmen gerekir (iki eksi işareti bir eksiltir).',
        kod: '#define DUGME D5\n\nint sayac = 0;\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(DUGME, INPUT);\n}\n\nvoid loop() {\n  if (digitalRead(DUGME) == HIGH) {\n    sayac++;\n    Serial.println(sayac);\n    while (digitalRead(DUGME) == HIGH) {\n    }\n  }\n}\n',
        degistir: [{ ara: 'int sayac = 0' }, { ara: 'sayac++' }],
        cozum: '#define DUGME D5\n\nint sayac = 3;\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(DUGME, INPUT);\n}\n\nvoid loop() {\n  if (digitalRead(DUGME) == HIGH) {\n    sayac--;\n    Serial.println(sayac);\n    while (digitalRead(DUGME) == HIGH) {\n    }\n  }\n}\n',
        ipucu: 'İlk basışta 2 görmek için başlangıçta 3 olmalı ve her basışta bir eksilmeli: sayac--',
        girdi: girdiSayac,
        kontrol(sim) {
          if (!sim.seriCikti.length) return hata('Seri monitöre hiçbir şey yazılmadı.');
          const d = sim.seriCikti.map(sonSayi);
          if (d.length !== 3) return hata(`3 basış için 3 satır beklenir, ${d.length} satır yazıldı.`);
          if (d.join() !== '2,1,0') return hata(`Çıktı ${d.join(', ')} oldu ama 2, 1, 0 olmalı. Başlangıç değeri ve artırma/eksiltme birlikte uymalı.`);
          return tamam('Süper! Geri sayım 2, 1, 0 çalıştı.');
        },
      },
      {
        tip: 'duzenle', baslik: 'Çılgın sayaç',
        metin: 'Bu sayaç düğmeye <b>bir kez</b> basınca birden çok sayı yazıyor. Hata, düğmenin <b>bırakılmasını bekleyen</b> döngünün koşulunda. İşaretli yeri düzelt ki üç basış için sadece <b>1, 2, 3</b> yazılsın.',
        kod: '#define DUGME D5\n\nint sayac = 0;\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(DUGME, INPUT);\n}\n\nvoid loop() {\n  if (digitalRead(DUGME) == HIGH) {\n    sayac++;\n    Serial.println(sayac);\n    while (digitalRead(DUGME) == LOW) {\n    }\n  }\n}\n',
        degistir: [{ ara: '== LOW' }],
        cozum: '#define DUGME D5\n\nint sayac = 0;\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(DUGME, INPUT);\n}\n\nvoid loop() {\n  if (digitalRead(DUGME) == HIGH) {\n    sayac++;\n    Serial.println(sayac);\n    while (digitalRead(DUGME) == HIGH) {\n    }\n  }\n}\n',
        ipucu: 'While, koşul doğru olduğu sürece bekler. Düğme basılı olduğu sürece beklemek için koşul HIGH mı, LOW mu olmalı?',
        girdi: girdiSayac,
        kontrol(sim) {
          if (!sim.seriCikti.length) return hata('Seri monitöre hiçbir şey yazılmadı.');
          const d = sim.seriCikti.map(sonSayi);
          if (d.length !== 3) return hata(`Düğmeye 3 kez basıldı ama ${d.length} satır yazıldı. Kart düğme basılı kalırken hâlâ sayıyor: bekleme koşulunu kontrol et.`);
          if (d.join() !== '1,2,3') return hata('Sayaç 1, 2, 3 diye artmalı.');
          return tamam('Tamir edildi! Her basış tam bir kez sayıldı.');
        },
      },
    ],
  },

  // ───────────────────────── 2.5 Refleks oyunu ─────────────────────────
  'refleks-oyunu': {
    sesli: [
      { ses: 'Şimdi bir oyun yapıyoruz: refleks oyunu! LED yanınca düğmeye ne kadar hızlı bastığını ölçeceğiz. Önce düğme ve LED pinlerine ad verelim.', yaz: '#define DUGME D5\n#define LED D2\n\n', parca: 0 },
      { ses: 'İki değişken lazım. Baslangic, LED\'in yandığı anı saklayacak. Sure ise tepki süreni. Unsigned long, büyük ve eksi olmayan sayılar için bir kutu türüdür; zaman sayıları hızla büyüdüğü için bunu kullanıyoruz.', yaz: 'unsigned long baslangic;\nunsigned long sure;\n\n' },
      { ses: 'Setup bölümünde seri haberleşmeyi başlatıyor, düğmeyi giriş, LED\'i çıkış yapıyoruz. Oyunun tamamını setup içine yazacağız, çünkü oyun yalnızca bir kez oynanacak.', yaz: 'void setup() {\n  Serial.begin(115200);\n  pinMode(DUGME, INPUT);\n  pinMode(LED, OUTPUT);\n\n', parca: 0 },
      { ses: 'İki saniye bekliyoruz. Böylece oyuncu LED\'in tam ne zaman yanacağını bilmez ve gerçekten refleksi ölçülür.', yaz: '  delay(2000);\n' },
      { ses: 'LED\'i yakıyoruz. Hemen ardından millis komutuyla o anki zamanı kutuya kaydediyoruz. Millis, kart açıldığından beri geçen milisaniyeyi verir. Bir nevi kartın kronometresi.', yaz: '  digitalWrite(LED, HIGH);\n  baslangic = millis();\n', parca: 1 },
      { ses: 'Şimdi düğmeye basılmasını bekliyoruz. Düğme basılmadığı sürece pin LOW okunur, while da o sürece bekler. Basıldığı an döngü biter.', yaz: '  while (digitalRead(DUGME) == LOW) {\n  }\n', parca: 0 },
      { ses: 'Tepki süresi, şimdiki zamandan LED\'in yandığı anı çıkararak bulunur. Mesela düğmeye beş bin üç yüz elli milisaniyede bastıysan ve LED beş binde yandıysa, tepkin üç yüz elli milisaniyedir.', yaz: '  sure = millis() - baslangic;\n' },
      { ses: 'Sonucu seri monitöre yazdırıyoruz. Üç komutla Tepki, sonra sayı, sonra ms yazısı yan yana gelir. Sonra LED\'i söndürüyor ve boş loop ile programı bitiriyoruz.', yaz: '  Serial.print("Tepki: ");\n  Serial.print(sure);\n  Serial.println(" ms");\n  digitalWrite(LED, LOW);\n}\n\nvoid loop() {\n}\n' },
      { ses: 'Haydi oynayalım! İki saniye bekliyoruz. LED yandı, bastık! Tepki süresi seri monitörde.', calistir: true, parca: 1 },
      { ses: 'Güzel oyun! Görevler sekmesine geç. Orada bekleme süresini, hız sınırını ve bozuk bir ölçümü düzelteceksin.' },
    ],
    duzenle: [
      {
        tip: 'duzenle', baslik: 'Daha çabuk yan',
        metin: 'Oyuncu LED\'i çok bekliyor: program <b>3 saniye</b> sonra yakıyor. Bekleme süresini değiştir ki LED <b>1 saniye</b> (yaklaşık 1000 ms) sonra yansın.',
        kod: '#define DUGME D5\n#define LED D2\n\nunsigned long baslangic;\nunsigned long sure;\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(DUGME, INPUT);\n  pinMode(LED, OUTPUT);\n\n  delay(3000);\n  digitalWrite(LED, HIGH);\n  baslangic = millis();\n\n  while (digitalRead(DUGME) == LOW) {\n  }\n  sure = millis() - baslangic;\n\n  Serial.print("Tepki: ");\n  Serial.print(sure);\n  Serial.println(" ms");\n  digitalWrite(LED, LOW);\n}\n\nvoid loop() {\n}\n',
        degistir: [{ ara: 'delay(3000)' }],
        cozum: '#define DUGME D5\n#define LED D2\n\nunsigned long baslangic;\nunsigned long sure;\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(DUGME, INPUT);\n  pinMode(LED, OUTPUT);\n\n  delay(1000);\n  digitalWrite(LED, HIGH);\n  baslangic = millis();\n\n  while (digitalRead(DUGME) == LOW) {\n  }\n  sure = millis() - baslangic;\n\n  Serial.print("Tepki: ");\n  Serial.print(sure);\n  Serial.println(" ms");\n  digitalWrite(LED, LOW);\n}\n\nvoid loop() {\n}\n',
        ipucu: 'Bir saniye, bin milisaniyedir.',
        girdi: girdiTepki,
        kontrol(sim) {
          const y = sim.olaylar.find(o => o.pin === 'D2' && o.deger > 0);
          if (!y) return hata('LED hiç yanmadı.');
          if (y.t < 900) return hata(`LED çok erken yandı (${Math.round(y.t)} ms). Yaklaşık 1000 ms beklemelisin.`);
          if (y.t > 1150) return hata(`LED ${Math.round(y.t)} ms sonra yandı; 1 saniye (1000 ms) olmalı.`);
          return tamam('Tam 1 saniye sonra yandı, oyun hızlandı!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Sert hakem',
        metin: 'Program tepki süresini değerlendiriyor: süre <b>500 ms\'den azsa</b> <code>HIZLI</code>, değilse <code>YAVAS</code> yazıyor. Hakemi sertleştir: <b>350 ms\'lik</b> bir tepki <b>YAVAS</b> sayılsın. İşaretli sınır sayısını değiştir (örneğin 300 yap).',
        kod: '#define DUGME D5\n#define LED D2\n\nunsigned long baslangic;\nunsigned long sure;\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(DUGME, INPUT);\n  pinMode(LED, OUTPUT);\n\n  delay(2000);\n  digitalWrite(LED, HIGH);\n  baslangic = millis();\n\n  while (digitalRead(DUGME) == LOW) {\n  }\n  sure = millis() - baslangic;\n\n  if (sure < 500) {\n    Serial.println("HIZLI");\n  } else {\n    Serial.println("YAVAS");\n  }\n  digitalWrite(LED, LOW);\n}\n\nvoid loop() {\n}\n',
        degistir: [{ ara: '500' }],
        cozum: '#define DUGME D5\n#define LED D2\n\nunsigned long baslangic;\nunsigned long sure;\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(DUGME, INPUT);\n  pinMode(LED, OUTPUT);\n\n  delay(2000);\n  digitalWrite(LED, HIGH);\n  baslangic = millis();\n\n  while (digitalRead(DUGME) == LOW) {\n  }\n  sure = millis() - baslangic;\n\n  if (sure < 300) {\n    Serial.println("HIZLI");\n  } else {\n    Serial.println("YAVAS");\n  }\n  digitalWrite(LED, LOW);\n}\n\nvoid loop() {\n}\n',
        ipucu: 'Tepki süren yaklaşık 350 ms. HIZLI olması için süre sınırdan küçük olmalı; 350 ms yavaş sayılsın diye sınırı 350\'den küçük yap.',
        girdi: girdiTepki,
        kontrol(sim) {
          const y = sim.olaylar.find(o => o.pin === 'D2' && o.deger > 0), b = gecmis(sim, 'D5').find(o => o.deger > 0);
          if (!y) return hata('LED hiç yanmadı.');
          if (!b) return YOK;
          const s = sim.seriCikti.map(norm);
          if (!s.length) return hata('Seri monitöre HIZLI ya da YAVAS yazılmadı.');
          if (s.some(x => x.includes('hizli'))) return hata(`Tepki süren yaklaşık ${Math.round(b.t - y.t)} ms ama hakem HIZLI dedi. Sınırı bu süreden küçük yap.`);
          if (!s.some(x => x.includes('yavas'))) return hata('YAVAS yazılmadı.');
          return tamam('Sert hakem 350 ms\'lik tepkiyi YAVAS buldu!');
        },
      },
      {
        tip: 'duzenle', baslik: 'Bozuk kronometre',
        metin: 'Bu oyun gerçek tepki süresi yerine saçma sayılar yazıyor. İki hata var: düğmeyi bekleyen döngünün koşulu ve süreyi hesaplayan işlem. İşaretli iki yeri bul ve düzelt.',
        kod: '#define DUGME D5\n#define LED D2\n\nunsigned long baslangic;\nunsigned long sure;\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(DUGME, INPUT);\n  pinMode(LED, OUTPUT);\n\n  delay(2000);\n  digitalWrite(LED, HIGH);\n  baslangic = millis();\n\n  while (digitalRead(DUGME) == HIGH) {\n  }\n  sure = millis() + baslangic;\n\n  Serial.print("Tepki: ");\n  Serial.print(sure);\n  Serial.println(" ms");\n  digitalWrite(LED, LOW);\n}\n\nvoid loop() {\n}\n',
        degistir: [{ ara: '== HIGH)' }, { ara: '+ baslangic' }],
        cozum: '#define DUGME D5\n#define LED D2\n\nunsigned long baslangic;\nunsigned long sure;\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(DUGME, INPUT);\n  pinMode(LED, OUTPUT);\n\n  delay(2000);\n  digitalWrite(LED, HIGH);\n  baslangic = millis();\n\n  while (digitalRead(DUGME) == LOW) {\n  }\n  sure = millis() - baslangic;\n\n  Serial.print("Tepki: ");\n  Serial.print(sure);\n  Serial.println(" ms");\n  digitalWrite(LED, LOW);\n}\n\nvoid loop() {\n}\n',
        ipucu: 'Düğmeye basılana kadar beklemek için, düğme basılı DEĞİLKEN (LOW) döngüde kalmalısın. Geçen süre ise şimdiki zaman eksi başlangıç zamanıdır.',
        girdi: girdiTepki,
        kontrol(sim) {
          const y = sim.olaylar.find(o => o.pin === 'D2' && o.deger > 0), b = gecmis(sim, 'D5').find(o => o.deger > 0);
          if (!y) return hata('LED hiç yanmadı.');
          if (!b) return YOK;
          const gercek = b.t - y.t;
          const satir = sim.seriCikti.find(x => /\d/.test(x));
          if (!satir) return hata('Seri monitöre tepki süresi yazılmadı.');
          const sayi = sonSayi(satir.replace(/\s*ms\s*$/i, ''));
          if (Number.isNaN(sayi) || Math.abs(sayi - gercek) > 60) return hata(`Yazılan süre (${satir}) gerçek tepkiye (~${Math.round(gercek)} ms) uymuyor. Bekleme koşulunu ve süre hesabını kontrol et.`);
          return tamam(`Kronometre düzeldi: tepki süren ${sayi} ms.`);
        },
      },
    ],
  },
};
