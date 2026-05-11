import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/main.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  platform: "node",
  target: "node20",
  sourcemap: true,
  outputOptions: {
    banner: "#!/usr/bin/env node",
  },
});
