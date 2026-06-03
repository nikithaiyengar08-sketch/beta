import { defineConfig } from "@tanstack/react-start/config";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  tsr: {
    autoCodeSplitting: true,
  },
  vite: {
    plugins: [
      tailwindcss(),
      tsconfigPaths(),
    ],
    server: {
      port: 3000,
      host: true,
      strictPort: false,
    },
  },
});
