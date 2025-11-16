import { defineConfig } from "vite";

// Minimal Vite config without React plugin.
// React still works because Vite uses esbuild to handle TSX/JSX.
export default defineConfig({
  plugins: [],
});
