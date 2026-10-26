// "Telefon" paneli: sağ panelde telefon çerçevesi. Adres çubuğundan ya da sayfadaki bağlantı/form/fetch'ten
// sim.ag.istek(...) ile ESP32'deki WebServer'a istek gönderir; gelen HTML'i iframe srcdoc olarak gösterir.
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Sayfaya enjekte edilen küçük kabuk: bağlantı tıklaması, form gönderimi ve fetch() ebeveyne (telefon paneline) iletilir.
const KABUK = `<style>html{font-family:system-ui,Segoe UI,sans-serif;word-wrap:break-word}</style><script>(function(){
var send=function(m){parent.postMessage(Object.assign({telefon:1},m),'*')};
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href');if(/^(#|javascript:|mailto:)/.test(h))return;e.preventDefault();send({git:h});},true);
document.addEventListener('submit',function(e){e.preventDefault();var f=e.target,q=new URLSearchParams(new FormData(f)).toString(),u=f.getAttribute('action')||'/';send({git:u+(q?(u.indexOf('?')<0?'?':'&')+q:''),yontem:(f.method||'get').toUpperCase()});},true);
var id=0,bek={};
window.fetch=function(u){return new Promise(function(c,r){var k=++id;bek[k]=[c,r];send({fetch:String(u),id:k});});};
addEventListener('message',function(e){var d=e.data;if(!d||!d.telefonYanit)return;var p=bek[d.id];delete bek[d.id];if(!p)return;
if(d.hata)p[1](new TypeError(d.hata));else p[0]({ok:d.kod>=200&&d.kod<300,status:d.kod,text:function(){return Promise.resolve(d.metin)},json:function(){return Promise.resolve(JSON.parse(d.metin))}});});
})();<\/script>`;

const hataSayfasi = (baslik, ayrinti) => `<body style="margin:0;padding:28px 20px;font-family:system-ui,sans-serif;color:#334155;background:#f8fafc;text-align:center">
<div style="font-size:42px">📵</div><h3 style="margin:10px 0 6px">${esc(baslik)}</h3><p style="font-size:13px;line-height:1.5;color:#64748b">${esc(ayrinti)}</p></body>`;

export class Telefon {
  /** kok: #sekmeTelefon; sim: () => Sim (sıfırlanınca değişmez ama ag değişir); calistir/durdur: kod çalıştırma; calisiyor: () => bool */
  constructor({ kok, sim, calistir, durdur, calisiyor }) {
    this.kok = kok; this.sim = sim; this.calisiyorMu = calisiyor;
    this.gecmis = []; this.i = -1; this.sira = 0;
    kok.innerHTML = `
      <div class="t-sahne">
        <div class="t-durum"><span class="t-ag"></span><span class="bosluk"></span><button class="t-cal birincil">▶ Çalıştır</button><button class="t-dur ikon" title="Durdur">■</button></div>
        <div class="t-telefon" aria-label="Sanal telefon">
          <div class="t-kulak"><i></i></div>
          <div class="t-adres"><button class="t-geri" title="Geri" disabled>‹</button><input class="t-url" spellcheck="false" autocapitalize="off" aria-label="Adres" placeholder="http://192.168.1.42/"><button class="t-git" title="Git">→</button><button class="t-yenile" title="Yenile">↻</button></div>
          <div class="t-ekran"><iframe class="t-sayfa" sandbox="allow-scripts" title="Telefon ekranı"></iframe><div class="t-bos"></div></div>
          <div class="t-bilgi"></div>
          <div class="t-yollar"></div>
          <div class="t-alt"><b></b></div>
        </div>
        <p class="t-ipucu">Önce programı <b>Çalıştır</b>. ESP32 Wi-Fi'ye bağlanıp <code>server.begin()</code> deyince telefondan adrese girebilirsin.</p>
      </div>`;
    const q = s => kok.querySelector(s);
    this.el = { ag: q('.t-ag'), url: q('.t-url'), sayfa: q('.t-sayfa'), bos: q('.t-bos'), bilgi: q('.t-bilgi'), yollar: q('.t-yollar'), geri: q('.t-geri'), cal: q('.t-cal'), dur: q('.t-dur') };
    q('.t-cal').onclick = () => calistir(); q('.t-dur').onclick = () => durdur();
    q('.t-git').onclick = () => this.git(this.el.url.value);
    q('.t-yenile').onclick = () => this.git(this.gecmis[this.i] ?? '/', { gecmiseEkleme: true });
    this.el.geri.onclick = () => { if (this.i > 0) { this.i--; this.git(this.gecmis[this.i], { gecmiseEkleme: true }); } };
    this.el.url.addEventListener('keydown', e => { if (e.key === 'Enter') this.git(this.el.url.value); });
    addEventListener('message', e => this.#mesaj(e));
    this.bosGoster();
    this.durumCiz();
  }

  /** Yeni ders/yeniden çalıştırma: geçmişi ve sayfayı temizle. */
  sifirla() { this.gecmis = []; this.i = -1; this.sira++; this.el.geri.disabled = true; this._yollar = null; this.bosGoster(); this.durumCiz(); }

  /** İstenen adresi yola çevirir: "http://ip/led?x=1" -> "/led?x=1" */
  yol(adres) { let y = String(adres ?? '').trim().replace(/^https?:\/\/[^/]+/i, ''); if (!y.startsWith('/')) y = '/' + y; return y; }
  adresMetni(yol) { const ip = this.sim().ag.adres() ?? '192.168.1.42'; return `http://${ip}${yol}`; }

  bosGoster(m = 'Henüz bir sayfa yok.<br>Programı çalıştır, sonra adrese git.') { this.el.bos.innerHTML = m; this.el.bos.hidden = false; this.el.sayfa.removeAttribute('srcdoc'); this.el.bilgi.textContent = ''; }

  async git(adres, { gecmiseEkleme = false, yontem = 'GET', cevapla = null } = {}) {
    const yol = this.yol(adres), ben = ++this.sira, ag = this.sim().ag;
    this.el.url.value = this.adresMetni(yol);
    if (!gecmiseEkleme) { this.gecmis = this.gecmis.slice(0, this.i + 1); this.gecmis.push(yol); this.i = this.gecmis.length - 1; }
    this.el.geri.disabled = this.i <= 0;
    this.el.bilgi.textContent = 'Yükleniyor…'; this.el.bilgi.className = 't-bilgi';
    let y;
    const zaman = new Promise(r => setTimeout(() => r({ kod: 0, hata: 'ESP32 cevap vermedi (4 sn). Programında loop() içinde server.handleClient() çağırıyor musun?' }), 4000));
    y = await Promise.race([ag.istek(yol, { yontem }), zaman]);
    if (cevapla) cevapla(y);                      // sayfadaki fetch() çağrısına cevap
    if (ben !== this.sira) return y;              // daha yeni bir istek başladı
    this.goster(y);
    return y;
  }

  goster(y) {
    if (y.hata) {
      this.el.sayfa.srcdoc = hataSayfasi('Bu siteye ulaşılamıyor', y.hata);
      this.el.bilgi.textContent = 'Hata · ' + y.hata; this.el.bilgi.className = 't-bilgi hata';
    } else {
      const tip = (y.tip || 'text/plain').toLowerCase();
      let html = tip.includes('html') ? y.metin : `<pre style="margin:0;padding:12px;white-space:pre-wrap;font:13px/1.45 ui-monospace,Consolas,monospace">${esc(y.metin)}</pre>`;
      const k = /<head[^>]*>/i.exec(html);
      html = k ? html.slice(0, k.index + k[0].length) + KABUK + html.slice(k.index + k[0].length) : /<!doctype[^>]*>/i.test(html) ? html.replace(/<!doctype[^>]*>/i, m => m + KABUK) : KABUK + html;
      this.el.sayfa.srcdoc = html;
      this.el.bilgi.textContent = `${y.kod} ${y.kod >= 400 ? 'Hata' : 'OK'} · ${y.tip || 'text/plain'} · ${y.metin.length} bayt`;
      this.el.bilgi.className = 't-bilgi' + (y.kod >= 400 ? ' hata' : '');
    }
    this.el.bos.hidden = true;
  }

  #mesaj(e) {
    if (e.source !== this.el.sayfa.contentWindow || !e.data?.telefon) return;
    const d = e.data;
    if (d.git != null) this.git(d.git, { yontem: d.yontem });
    else if (d.fetch != null) {
      const yanit = y => this.el.sayfa.contentWindow?.postMessage({ telefonYanit: 1, id: d.id, kod: y.kod, metin: y.metin, hata: y.hata }, '*');
      // fetch sayfayı yeniden çizmez: istek gider, cevap sayfadaki koda döner
      const ag = this.sim().ag, yol = this.yol(d.fetch);
      Promise.race([ag.istek(yol), new Promise(r => setTimeout(() => r({ kod: 0, hata: 'zaman aşımı' }), 4000))]).then(yanit);
    }
  }

  /** Üst durum çubuğu ve hızlı yol düğmeleri; sim her değiştiğinde (rAF ile seyreltilmiş) çağrılır. */
  durumCiz() {
    const ag = this.sim().ag, w = ag.wifi, calisiyor = this.calisiyorMu();
    const adres = ag.adres();
    const metin = w.ap && !ag.bagli() ? `📶 AP "${esc(w.ap.ssid)}" · ${ag.apIp}` : ag.bagli() ? `📶 ${esc(w.ssid)} · ${ag.ip}` : w.ssid != null ? '📡 Wi-Fi\'ye bağlanıyor…' : '📵 ağ yok';
    this.el.ag.innerHTML = `ESP32: <b>${calisiyor ? 'çalışıyor' : 'durdu'}</b> · ${metin}`;
    this.el.cal.hidden = calisiyor; this.el.dur.hidden = !calisiyor;
    const yollar = adres ? ag.yollar() : [];
    const anahtar = yollar.join('|');
    if (anahtar !== this._yollar) {
      this._yollar = anahtar;
      this.el.yollar.innerHTML = yollar.map(y => `<button data-y="${esc(y)}">${esc(y)}</button>`).join('');
      this.el.yollar.querySelectorAll('button').forEach(b => b.onclick = () => this.git(b.dataset.y));
    }
    if (!this.el.url.matches(':focus') && !this.gecmis.length) this.el.url.value = adres ? `http://${adres}/` : '';
  }
}
