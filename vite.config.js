import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Capacitor note: when you add Capacitor later, it copies the contents of
// `dist/` (this build's output folder) into the native iOS/Android shells.
// Nothing here needs to change for that step — `npx cap init` and
// `npx cap add ios|android` will read this same build output automatically.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
  },
});
