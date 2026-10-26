// Geliştirme aracı: dersi olmayan parçaları 3B sahnede görmek için.
//   http://localhost:5180/tools/onizleme/index.html#parcalar=nem:A0,pompa:D4,pir:D5&bakis=ust|yakin&durum=D4:1,A0:3000
//   parcalar: tur:pin (virgülle); durum: pin:değer (pin çıkışı 1/0 ya da analog girdi; D* → sim.pin yazılır, A* → sim.analog)
//   arena: (araba dünyası için) &arena=1  ->  tanim.arena = {} ile sahne kurulur
import { Sim } from '/src/sim.js';
import { Sahne } from '/src/scene.js';

const h = new URLSearchParams(location.hash.slice(1));
const parcalar = (h.get('parcalar') ?? 'led:D0').split(',').map(x => { const [tur, pin] = x.split(':'); return { tur, pin }; });
const sim = new Sim(), sahne = new Sahne(document.getElementById('sahne'));
sahne.kur({ parcalar, ...(h.get('arena') ? { arena: {} } : {}) }, sim);
for (const d of (h.get('durum') ?? '').split(',').filter(Boolean)) {
  const [pin, v] = d.split(':');
  if (pin.startsWith('A')) sim.analog[pin] = +v; else { sim.pin[pin].mod = 'cikti'; sim.pin[pin].pwm = +v; sim.pin[pin].deger = +v > 0 ? 1 : 0; }
}
sim.yay();
const b = h.get('bakis');
if (b === 'ust') sahne.ust(); else if (b === 'yakin') { sahne.k.position.set(80, 75, 95); sahne.o.target.set(66, 0, 6); }
document.getElementById('bilgi').textContent = parcalar.map(p => `${p.tur}:${p.pin}`).join('  ');
window.__onizleme = { sim, sahne };
