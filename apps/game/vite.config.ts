import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  // 예전 빌드 보관 폴더 대신 실제 앱 진입점만 의존성 탐색에 사용한다.
  optimizeDeps: { entries: ["index.html"] },
  plugins: [TanStackRouterVite({ target: "react", autoCodeSplitting: true }), react(), tsconfigPaths()],
});
