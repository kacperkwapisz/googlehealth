import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/schemas.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  platform: "neutral",
  target: "node20",
  sourcemap: true,
});
