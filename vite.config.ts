import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

// Base path matches the GitHub Pages project-site URL (https://<owner>.github.io/<repo>/)
// so built asset URLs resolve correctly when deployed; the dev server ignores `base`.
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES ? "/Flowchart-crossfunctional/" : "/"
});
