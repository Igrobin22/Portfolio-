import {defineConfig} from "vite"
import tailwindcss from "@tailwindcss/vite"
import {fileURLToPath, URL} from "node:url"

export default defineConfig({
  plugins: [tailwindcss()],
  publicDir: false,
  define: {"process.env.NODE_ENV": JSON.stringify("production")},
  resolve: {alias: {"@": fileURLToPath(new URL(".", import.meta.url))}},
  build: {
    outDir: "assets/glass-folders",
    emptyOutDir: false,
    target: "es2022",
    lib: {
      entry: "src/portfolio-folders.tsx",
      formats: ["es"],
      fileName: "portfolio-folders",
      cssFileName: "folder-cards",
    },
    minify: "esbuild",
  },
})
