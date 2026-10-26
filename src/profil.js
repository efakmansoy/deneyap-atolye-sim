// Hesap sistemi (çevrimdışı-öncelikli): cihazda birden çok profil, her profilin kendi ilerlemesi/XP'si/rozetleri.
// Veri anahtarları  dyp:<profilId>:<anahtar>  biçiminde ayrılır. Bulut senkronu için `bulut` bağlama noktası var
// (bulut.yukle(profilId) / bulut.kaydet(profilId, veri)); şimdilik tanımsız = yalnızca yerel.
const L = {
  oku(k, v) { try { const s = localStorage.getItem(k); return s == null ? v : JSON.parse(s); } catch { return v; } },
  yaz(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  sil(k) { try { localStorage.removeItem(k); } catch {} },
  anahtarlar() { try { return Object.keys(localStorage); } catch { return []; } },
};

export const AVATARLAR = ['🦊', '🐼', '🐯', '🦉', '🐙', '🦄', '🐸', '🚀', '🤖', '🌟', '🎮', '🔧'];
const yeniId = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);

class Profiller {
  constructor() {
    this.bulut = null;
    this.göç();
    if (!this.liste().length) this.olustur({ ad: 'Misafir', avatar: AVATARLAR[0] });
    if (!this.aktif()) this.sec(this.liste()[0].id);
  }

  /** Eski (profilsiz) anahtarları ilk profile taşı. */
  göç() {
    if (L.oku('dyp:profiller', null)) return;
    const eski = ['tamam', 'gorevTamam', 'ders', 'tema'].filter(k => localStorage.getItem(k) != null);
    if (!eski.length) return;
    const p = this.olustur({ ad: 'Misafir', avatar: AVATARLAR[0] }, false);
    for (const k of eski) { if (k !== 'tema') L.yaz(`dyp:${p.id}:${k}`, L.oku(k)); }
    L.yaz('dyp:aktif', p.id);
  }

  liste() { return L.oku('dyp:profiller', []); }
  aktifId() { return this.aktif().id; }
  aktif() {
    const l = this.liste();
    const id = L.oku('dyp:aktif', null);
    let p = l.find(x => x.id === id);
    if (!p) {
      if (l.length) {
        p = l[0];
        L.yaz('dyp:aktif', p.id);
      } else {
        p = this.olustur({ ad: 'Misafir', avatar: AVATARLAR[0] });
      }
    }
    return p;
  }

  olustur({ ad, avatar }, sec = true) {
    ad = String(ad ?? '').trim().slice(0, 20) || 'Oyuncu';
    const p = { id: yeniId(), ad, avatar: avatar ?? AVATARLAR[0], olusturma: new Date().toISOString() };
    L.yaz('dyp:profiller', [...this.liste(), p]);
    if (sec) L.yaz('dyp:aktif', p.id);
    return p;
  }
  sec(id) { if (this.liste().some(p => p.id === id)) L.yaz('dyp:aktif', id); }
  adlandir(id, { ad, avatar }) { L.yaz('dyp:profiller', this.liste().map(p => p.id === id ? { ...p, ad: ad?.trim().slice(0, 20) || p.ad, avatar: avatar ?? p.avatar } : p)); }
  sil(id) {
    for (const k of L.anahtarlar()) if (k.startsWith(`dyp:${id}:`)) L.sil(k);
    const kalan = this.liste().filter(p => p.id !== id);
    L.yaz('dyp:profiller', kalan);
    if (L.oku('dyp:aktif', null) === id) { if (kalan.length) L.yaz('dyp:aktif', kalan[0].id); else this.olustur({ ad: 'Misafir', avatar: AVATARLAR[0] }); }
  }

  /** Aktif profile ait veri deposu. */
  get depo() {
    const anahtar = k => `dyp:${this.aktifId()}:${k}`;
    return {
      oku: (k, v) => L.oku(anahtar(k), v),
      yaz: (k, v) => { L.yaz(anahtar(k), v); this.bulut?.kaydet?.(this.aktifId(), k, v); },
    };
  }

  /** Dışa aktar: profil + tüm verisi (JSON metni). */
  disaAktar(id = this.aktifId()) {
    const p = this.liste().find(x => x.id === id); if (!p) return '';
    const veri = {};
    for (const k of L.anahtarlar()) if (k.startsWith(`dyp:${id}:`)) veri[k.slice(`dyp:${id}:`.length)] = L.oku(k);
    return JSON.stringify({ surum: 1, profil: { ad: p.ad, avatar: p.avatar }, veri }, null, 1);
  }
  /** İçe aktar: yeni profil olarak ekler. Hatalıysa istisna fırlatır. */
  iceAktar(metin) {
    const j = JSON.parse(metin);
    if (j?.surum !== 1 || !j.profil || typeof j.veri !== 'object') throw new Error('Geçersiz profil dosyası');
    const p = this.olustur({ ad: j.profil.ad, avatar: j.profil.avatar }, true);
    for (const [k, v] of Object.entries(j.veri)) L.yaz(`dyp:${p.id}:${k}`, v);
    return p;
  }
}

export const profil = new Profiller();
export const depo = {   // tema gibi profilden bağımsız tercihler
  oku: (k, v) => L.oku('dyp:genel:' + k, v),
  yaz: (k, v) => L.yaz('dyp:genel:' + k, v),
};
