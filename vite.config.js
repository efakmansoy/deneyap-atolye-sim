import { defineConfig } from 'vite';
import dil from './tools/i18n/eklenti.mjs';
// VITE_BASE: GitHub Pages gibi alt dizinde yayında '/depo-adi/'; varsayılan '/' (Electron, Capacitor, yerel)
export default defineConfig({ base: process.env.VITE_BASE || '/', plugins: [dil()] });
