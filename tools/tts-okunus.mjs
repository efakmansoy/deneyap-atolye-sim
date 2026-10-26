// Seslendirme için metni okunuşa çevirir (yalnızca TTS'e giden metin; ekrandaki altyazı değişmez).
// Kural: İngilizce kod/terim sözcükleri Türkçe harflerle okunuşa göre yazılır.
const SAYI = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş', 'altı', 'yedi', 'sekiz', 'dokuz', 'on', 'on bir', 'on iki', 'on üç', 'on dört'];
const SOZLUK = [   // [desen, okunuş] — uzun/özel olanlar önce
  [/\bHIGH\b/g, 'hay'], [/\bLOW\b/g, 'lou'],
  [/\bINPUT_PULLUP\b/g, 'input pul ap'], [/\bOUTPUT\b/g, 'avtput'], [/\bINPUT\b/g, 'input'],
  [/\bdigitalWrite\b/gi, 'dijital rayt'], [/\bdigitalRead\b/gi, 'dijital rid'], [/\banalogWrite\b/gi, 'analog rayt'], [/\banalogRead\b/gi, 'analog rid'],
  [/\bpinMode\b/gi, 'pin mod'], [/\btouchRead\b/gi, 'taç rid'], [/\bnoTone\b/gi, 'no ton'], [/\bpulseIn\b/gi, 'pals in'],
  [/\bhandleClient\b/gi, 'hendıl klayınt'], [/\bsoftAP\b/gi, 'soft ey pi'], [/\bWebServer\b/gi, 'veb sörvır'], [/\bWiFi\b/gi, 'vay fay'], [/\bWi-Fi\b/gi, 'vay fay'],
  [/\bSerial\.println\b/gi, 'seri print el en'], [/\bSerial\.print\b/gi, 'seri print'],
  [/\bsetup\b/gi, 'setap'], [/\bloop\b/gi, 'lup'], [/\bdelay\b/gi, 'diley'], [/\bvoid\b/gi, 'voyd'], [/\bint\b/g, 'int'], [/\bmap\b/gi, 'mep'],
  [/\bESP32-S3\b/g, 'i es pi otuz iki es üç'], [/\bESP32\b/g, 'i es pi otuz iki'], [/\bESP\b/g, 'i es pi'],
  [/\bLED(?:'?(?:ler|in|i|e|de|den))?\b/g, m => m.replace('LED', 'led')], [/\bLCD\b/g, 'el si di'], [/\bLDR\b/g, 'el di ar'], [/\bPIR\b/g, 'pir'],
  [/\bPWM\b/g, 'pi di em'], [/\bRGB\b/g, 'ar ci bi'], [/\bHTML\b/g, 'eyç ti em el'], [/\bIP\b/g, 'ay pi'], [/\bMQ-?2\b/g, 'em kyu iki'],
  [/\bUSB\b/g, 'yu es bi'], [/\bArduino\b/g, 'arduino'],
];
export function okunus(metin) {
  let s = metin.replace(/\b([DA])(\d{1,2})\b/g, (m, h, n) => `${h === 'D' ? 'de' : 'a'} ${SAYI[+n] ?? n}`);
  for (const [d, o] of SOZLUK) s = s.replace(d, o);
  return s;
}
