import { createRequire } from 'module';
// Read from package.json rather than hardcoding, so the daemon and CLI can
// never disagree about what version they are.
const require = createRequire(import.meta.url);
const pkg = require('../../package.json');
export const VERSION = pkg.version;
//# sourceMappingURL=version.js.map