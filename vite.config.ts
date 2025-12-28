import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	publicDir: "src/assets",
	plugins: [reactRouter(), tsconfigPaths({ projects: ["./tsconfig.web.json"] })],
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:3000",
				changeOrigin: true
			}
		}
	}
});
