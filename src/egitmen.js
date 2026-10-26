// Adım adım interaktif öğretmen. Ders şeması:
//   adimlar: [{ baslik, html, ipucu?, vurgu?: { kategori?, blok?, parca? }, bitti?: koşul | [koşul] }]
// Koşullar (hepsi çalışma alanını/çalıştırma sonucunu izler, adım otomatik ilerler):
//   { blok:'dy_yaz', alan?:{PIN:'D0'}, adet?:1, icinde?:'dy_surekli' }   çalışma alanında şu blok var
//   { calistir:true }  program hatasız çalıştırıldı     { basari:true }  ders kontrolü geçti
// `bitti` yoksa adım "Anladım →" düğmesiyle geçilir.
export class Egitmen {
  constructor({ ws, sahne, el }) {
    this.ws = ws; this.sahne = sahne; this.el = el;
    this.adimlar = []; this.i = 0; this.bitenler = new Set(); this.ctx = { calisti: false, basari: false };
    ws.addChangeListener(e => {
      if (e.type === 'toolbox_item_select') setTimeout(() => this.#cerceveVurgula(), 80);
      if (!e.isUiEvent) this.degisti();
    });
  }

  yukle(ders) {
    this.ders = ders;
    this.adimlar = ders.adimlar ?? [];
    this.i = 0; this.bitenler.clear(); this.ctx = { calisti: false, basari: false };
    this.cizim();
  }

  degisti(ctx) {
    if (ctx) Object.assign(this.ctx, ctx);
    const a = this.adimlar[this.i];
    if (a?.bitti && this.#sagla(a.bitti) && !this.bitenler.has(this.i)) {
      this.bitenler.add(this.i);
      this.cizim();
      clearTimeout(this.zaman);
      this.zaman = setTimeout(() => { if (this.i < this.adimlar.length - 1) this.git(this.i + 1); }, 1100);
    }
  }

  git(i) {
    this.i = Math.max(0, Math.min(this.adimlar.length - 1, i));
    this.gecis = true;
    this.cizim();
    this.gecis = false;
    this.degisti();
  }

  #sagla(c) {
    if (Array.isArray(c)) return c.every(x => this.#sagla(x));
    if (c.calistir) return this.ctx.calisti;
    if (c.basari) return this.ctx.basari;
    if (c.blok) {
      const tum = this.ws.getAllBlocks(false);
      const uyan = tum.filter(b => b.type === c.blok
        && (!c.alan || Object.entries(c.alan).every(([k, v]) => String(b.getFieldValue(k)) === String(v)))
        && (!c.icinde || this.#atasi(b, c.icinde)));
      return uyan.length >= (c.adet ?? 1);
    }
    return false;
  }

  #atasi(b, tur) { for (let p = b.getSurroundParent(); p; p = p.getSurroundParent()) if (p.type === tur) return true; return false; }

  cizim() {
    const el = this.el, a = this.adimlar[this.i];
    this.onDegis?.(a ?? null, this.i, this.adimlar.length, !!this.gecis);
    if (!this.adimlar.length) { el.innerHTML = `<div class="ders-html">${this.ders.html ?? ''}</div>`; this.#vurguTemizle(); return; }
    const noktalar = this.adimlar.map((x, k) =>
      `<button class="nokta ${k === this.i ? 'simdi' : ''} ${this.bitenler.has(k) ? 'bitti' : ''}" data-i="${k}" title="${(x.baslik ?? '').replace(/"/g, '')}">${this.bitenler.has(k) ? '✓' : k + 1}</button>`).join('');
    const bitti = this.bitenler.has(this.i);
    el.innerHTML = `
      <div class="adim-ust"><span class="ders-ad">${this.ders.ad}</span><div class="noktalar">${noktalar}</div></div>
      <div class="adim ${bitti ? 'tamam' : ''}">
        <h3>${a.baslik ?? ''}</h3>
        <div class="adim-govde">${a.html}</div>
        ${a.ipucu ? `<button class="ipucu-btn">💡 İpucu</button><div class="ipucu kutu ipucu-k" hidden>${a.ipucu}</div>` : ''}
        <div class="adim-alt">
          <button class="geri" ${this.i === 0 ? 'disabled' : ''}>← Geri</button>
          <span class="durum">${bitti ? '✓ Tamamlandı' : a.bitti ? 'Yapınca otomatik ilerler' : ''}</span>
          <button class="ileri" ${this.i === this.adimlar.length - 1 ? 'disabled' : ''}>${a.bitti && !bitti ? 'Atla' : 'Anladım'} →</button>
        </div>
      </div>`;
    el.querySelectorAll('.nokta').forEach(b => b.onclick = () => this.git(+b.dataset.i));
    el.querySelector('.geri').onclick = () => this.git(this.i - 1);
    el.querySelector('.ileri').onclick = () => this.git(this.i + 1);
    const ib = el.querySelector('.ipucu-btn');
    if (ib) ib.onclick = () => { el.querySelector('.ipucu').hidden = !el.querySelector('.ipucu').hidden; };
    this.#vurgula(a.vurgu);
  }

  #vurgula(v) {
    this.#vurguTemizle();
    this.vurgu = v ?? null;
    this.sahne.vurgu(v?.parca ?? null);
    this.#cerceveVurgula();
  }

  #vurguTemizle() {
    document.querySelectorAll('.vurgulu').forEach(e => e.classList.remove('vurgulu'));
    document.querySelectorAll('.blok-vurgu').forEach(e => e.classList.remove('blok-vurgu'));
    this.sahne.vurgu(null);
  }

  #cerceveVurgula() {
    document.querySelectorAll('.vurgulu').forEach(e => e.classList.remove('vurgulu'));
    document.querySelectorAll('.blok-vurgu').forEach(e => e.classList.remove('blok-vurgu'));
    const v = this.vurgu; if (!v) return;
    const tb = this.ws.getToolbox();
    if (v.kategori && tb) {
      for (const it of tb.getToolboxItems()) {
        if (it.getName?.() === v.kategori) it.getDiv()?.classList.add('vurgulu');
      }
    }
    if (v.blok) {
      const fl = this.ws.getFlyout?.();
      if (fl?.isVisible()) {
        for (const b of fl.getWorkspace().getAllBlocks(false)) {
          if (b.type === v.blok) b.getSvgRoot().classList.add('blok-vurgu');
        }
      }
    }
  }
}
