// test-m2.mjs için: node'da 'blockly/core' ad alanı yalnızca default verir; burada adlandırılmış dışa aktarımlar sağlanır.
import { createRequire } from 'node:module';
const R = createRequire(import.meta.url)('blockly/core'); const B = R.default ?? R;
export default B;
export const { setLocale, common, serialization, Workspace, Themes, svgResize, inject, Generator, Names } = B;
