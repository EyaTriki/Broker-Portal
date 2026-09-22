import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const muiIconsEsm = path.resolve(rootDir, 'node_modules/@mui/icons-material/esm');

export default defineConfig({
  server: {
    port: 5175,
  },
  plugins: [react(), tsconfigPaths()],
  resolve: {
    // Vite 8 / Rolldown CJS-prebundles MUI icons as `{ default: Icon }`,
    // which crashes React. Force the real ESM builds instead.
    alias: [
      {
        find: /^@mui\/icons-material\/(.+)$/,
        replacement: `${muiIconsEsm}/$1.js`,
      },
      {
        find: '@mui/icons-material',
        replacement: path.join(muiIconsEsm, 'index.js'),
      },
    ],
  },
  optimizeDeps: {
    exclude: ['@mui/icons-material'],
    // The aliased icon ESM files are served unbundled, so their transitive
    // MUI imports reach CJS-only packages that the browser can't load.
    // Pre-bundle those explicitly to get working ESM interop.
    // tesseract.js is CommonJS and only reached through a dynamic import, so
    // pre-bundle it up front instead of triggering a re-optimise mid-session.
    include: ['prop-types', 'react-is', '@mui/material/utils', '@mui/utils', 'tesseract.js'],
  },
});
