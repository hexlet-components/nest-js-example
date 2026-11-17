import "dotenv/config";
import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";
export default defineConfig({
  plugins: [swc.vite()],
  test: {
    fileParallelism: false,
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? "postgresql://nest:nest@localhost:55432/nest_test",
    },
  },
});
