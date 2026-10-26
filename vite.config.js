import { defineConfig } from 'vite';
import dil from './tools/i18n/eklenti.mjs';
export default defineConfig({ plugins: [dil()] });
