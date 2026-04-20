import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// On GitHub Pages the app is served from /<repo-name>/.
// In CI we set BASE_PATH to "/<repo-name>/"; locally it defaults to "/".
const base = process.env.BASE_PATH || '/';

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
});
